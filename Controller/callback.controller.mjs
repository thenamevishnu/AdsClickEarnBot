import moment from "moment";
import api from "../Config/Telegram.mjs";
import { settings } from "../Config/appConfig.mjs";
import { adsCollection } from "../Models/ads.model.mjs";
import { pendingMicroCollection } from "../Models/microTask.model.mjs";
import { userCollection } from "../Models/user.model.mjs";
import { adsText, answerCallback, inlineKeys, isUserBanned, keyList, localStore, protect_content, userMention } from "../Utils/tele.mjs";

api.on("callback_query", async callback => {
    const data = callback.data
    const params = data.split(" ")
    const command = params[0]
    params.shift()
    const from = callback.from
    const userStatusCheck = await isUserBanned(from.id)
    if(userStatusCheck) return
    if(!localStore[from.id]) localStore[from.id] = {}

    // payments

    if (command === "/pay") {
        try{
            const [method] = params
            let text;
            if (method == "CRYPTO") {
                text = `<b><i>💷 Enter the amount in USDT you want to deposit!</i></b>`
                answerCallback[from.id] = "PAY_WITH_CRYPTO"
            }
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content,
                reply_markup: {
                    keyboard: [
                        ["🚫 Cancel"]
                    ],
                    resize_keyboard: true
                }
            })
        }catch(err){
            return console.log(err.message)
        }
    }

    // notification

    if (command === "/notification") {
        try {
            const [notify] = params
            await userCollection.updateOne({ _id: from.id }, { $set: { notification: notify } })
            const user = await userCollection.findOne({ _id: from.id })
            const text = `<b><i>🛎️ Notification: ${ user.notification ? "✅" : "❌" }\n\n📅 Since: ${new Date(user.createdAt).toLocaleString("en-IN")}</i></b>`
            return await api.editMessageText(text, {
                parse_mode: "HTML",
                chat_id: from.id,
                message_id: callback.message.message_id,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `${user.notification ? `🔕 Turn OFF` : `🔔 Turn ON` } Notification`, callback_data: `/notification ${user.notification ? false : true}` }]
                    ]
                }
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    // task skip

    if (command === "/skip") {
        try {
            const [ads_id] = params
            const ads = await adsCollection.findOne({ _id: ads_id, completed: { $in: [from.id] } })
            if (ads) {
                const text = `<b><i>❌ Task already completed</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML"
                }) 
            }
            await adsCollection.updateOne({ _id: ads_id },{ $addToSet:{ skip: from.id } })
            const text = `<b><i>⏭️ Task has been skipped</i></b>`
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML"
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    // bot ads completed

    if (command === "/started_bot") {
        try {
            const [ads_id] = params
            const ads = await adsCollection.findOne({ _id: ads_id, status: true })
            if (!ads) {
                const text = `<b><i>❌ Task disabled or deleted!</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML"
                })
            }
            if (ads.skip.includes(from.id)) {
                const text = `<b><i>❌ Task already skipped</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML"
                }) 
            }
            if (ads.completed.includes(from.id)) {
                const text = `<b><i>❌ Task already completed</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML"
                }) 
            }
            if (ads.remaining_budget < ads.cpc) {
                await adsCollection.updateOne({ _id: ads_id }, { $set: { status: false } })
                const text = `<b><i>❌ Task paused due to insufficient budget</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML"
                }) 
            }
            localStore[from.id]["ads_id"] = ads_id
            answerCallback[from.id] = "STARTED_BOT"
            const text = `<b><i>🛰️ Forward a message from <a href='${ads.link}'>@${ads.username}</a></i></b>`
            await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content,
                reply_markup: {
                    keyboard: [
                        ["⛔ Cancel"]
                    ],
                    resize_keyboard: true
                }
            })
            return await api.deleteMessage(from.id, callback.message.message_id)
        } catch (err) {
            return console.log(err.message)
        }
    }

    // watch ads completed

    if (command === "/watched") {
        try {
            const [endTime, ads_id] = params
            const currentTime = Math.floor(new Date().getTime() / 1000)
            if (currentTime < endTime) {
                const text = `⌚ Wait: ${endTime - currentTime} seconds.`
                return await api.answerCallbackQuery(callback.id, {
                    text: text,
                    show_alert: true
                })
            }
            const ads = await adsCollection.findOne({ _id: ads_id, status: true })
            if (!ads) {
                const text = `<b><i>❌ Task disabled or deleted!</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML"
                })
            }
            if (ads.skip.includes(from.id)) {
                const text = `<b><i>❌ Task already skipped</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML"
                }) 
            }
            if (ads.completed.includes(from.id)) {
                const text = `<b><i>❌ Task already completed</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML"
                }) 
            }
            if (ads.remaining_budget < ads.cpc) {
                await adsCollection.updateOne({ _id: ads_id }, { $set: { status: false } })
                const text = `<b><i>❌ Task paused due to insufficient budget</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML"
                }) 
            }
            const earn = (ads.cpc * settings.GIVEAWAY).toFixed(4)
            const commission = (earn * settings.REF.INCOME.TASK).toFixed(4)
            const text = `<b><i>✅ Task completed: +${earn}</i></b>`
            await adsCollection.updateOne({ _id: ads_id }, { $inc: { remaining_budget: -(ads.cpc) }, $addToSet: { completed: from.id } })
            const userUpdate = await userCollection.findOneAndUpdate({ _id: from.id }, { $set: { "balance.withdrawable": earn } })
            await userCollection.updateOne({ _id: userUpdate.invited_by }, { $set: { "balance.withdrawable": commission, "balance.referral": commission } })
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML"
            }) 
        } catch (err) {
            return console.log(err.message)
        }
    }

    // chat join completed

    if (command === "/chat_joined") {
        try {
            const [ads_id] = params
            const ads = await adsCollection.findOne({ _id: ads_id, status: true })
            if (!ads) {
                const text = `<b><i>❌ Task disabled or deleted!</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML"
                })
            }
            if (ads.skip.includes(from.id)) {
                const text = `<b><i>❌ Task already skipped</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML"
                }) 
            }
            if (ads.completed.includes(from.id)) {
                const text = `<b><i>❌ Task already completed</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML"
                }) 
            }
            if (ads.remaining_budget < ads.cpc) {
                await adsCollection.updateOne({ _id: ads_id }, { $set: { status: false } })
                const text = `<b><i>❌ Task paused due to insufficient budget</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML"
                }) 
            }
            const { status: userStatus } = await api.getChatMember(ads.chats_id, from.id)
            if (userStatus != "creator" && userStatus != "administrator" && userStatus != "member") {
                const text = `❌ We can't find you there`
                return await api.answerCallbackQuery(callback.id, {
                    text: text,
                    show_alert: true
                })
            }
            const earn = (ads.cpc * settings.GIVEAWAY).toFixed(4)
            const commission = (earn * settings.REF.INCOME.TASK).toFixed(4)
            const text = `<b><i>✅ Task completed: +${earn}</i></b>`
            await adsCollection.updateOne({ _id: ads_id }, { $inc: { remaining_budget: -(ads.cpc) }, $addToSet: { completed: from.id } })
            const userUpdate = await userCollection.findOneAndUpdate({ _id: from.id }, { $set: { "balance.withdrawable": earn } })
            await userCollection.updateOne({ _id: userUpdate.invited_by }, { $set: { "balance.withdrawable": commission, "balance.referral": commission } })
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML"
            }) 
        } catch (err) {
            return console.log(err.message)
        }
    }

    // manage ads

    if (command === "/ads_status") {
        try {
            const [status, ads_id] = params
            const adType = await adsCollection.findOneAndUpdate({ _id: ads_id }, { $set: { status: status } })
            const ads = await adsCollection.findOne({ _id: ads_id })
            const text = adType.type == "BOT" ? adsText.botAds(ads) : adType.type == "SITE" ? adsText.siteAds(ads) : ads.type == "POST" ? adsText.postAds(ads) : ads.type == "CHAT" ? adsText.chatAds(ads) : ads.type == "MICRO" ? adsText.microTask(ads) : "Error"
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: inlineKeys.adsManageKey(ads)
                },
                disable_web_page_preview: true
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (command === "/delete_ad") {
        try {
            const [ads_id] = params
            const text = `<b><i>🗑️ Are you confirm to delete campaignID: #${ads_id}</i></b>`
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: inlineKeys.confirmDelete(ads_id)
                }
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (command === "/cancel_delete_ad") {
        try {
            const text = `<b><i>✖️ Process cancelled!</i></b>`
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML"
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (command === "/confirm_delete") {
        try {
            const [ads_id] = params
            const ads = await adsCollection.findOne({ _id: ads_id })
            if (!ads) {
                const text = `<b><i>❌ Ad already deleted/can't find!</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML"
                })
            }
            await adsCollection.deleteOne({ _id: ads_id })
            const refund = ads.remaining_budget.toFixed(4)
            let text = `<b><i>❌ CampaignID: #${ads_id} has been deleted!</i></b>`
            if (refund > 0) {
                await userCollection.updateOne({ _id: from.id }, { $inc: { "balance.balance": refund } })
                text += `<b><i>\n\n✅ Re-fund: +$${refund}</i></b>`
            }
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML"
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    // micro task done

    if (command === "/micro_task_done") {
        try {
            const [ads_id] = params
            localStore[from.id]["ads_id"] = ads_id
            answerCallback[from.id] = "MICRO_TASK_SUBMIT_PROOF"
            const text = `<b><i>🎯 Submit your proof to validate this task.</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content,
                reply_markup: {
                    keyboard: [
                        ["🔴 Cancel"]
                    ],
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (command === "/micro_list") {
        try {
            const [index, ads_id] = params
            const list = await pendingMicroCollection.find({ campaign_id: ads_id, status: "pending" }).sort({ createdAt: 1 })
            if (list.length == 0) {
                const text = `<b><i>📃 There are no list available</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML"
                })
            }
            const completed = list[Number(index)]
            const key = [
                [
                    { text: "👁️ See Proof", callback_data: `/see_micro_proof ${completed.proof} ${completed.done_by}` }
                ],[
                    { text: "✅ Approve", callback_data: `/micro_approve ${completed._id}` },
                    { text: "❌ Reject", callback_data: `/micro_reject ${completed._id}` }
                ], [
                    
                ]
            ]
            if (list?.[Number(index) - 1]) {
                key[2].push(
                    {
                        text: "⏮️ Prev", callback_data: `/micro_list ${Number(index) - 1} ${ads_id}`
                    }
                )
            }
            if (list?.[Number(index) + 1]) {
                key[2].push(
                    {
                        text: "⏭️ Next", callback_data: `/micro_list ${Number(index) + 1} ${ads_id}`
                    }
                )
            }
            const text = `<b><i>✅ Completd by: ${userMention(completed.done_by, completed.done_by_username, completed.done_by_first_name)}\n⌚ Updated: ${moment(completed.createdAt).fromNow()}</i></b>`
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: key
                }
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    // show micro proof

    if (command === "/see_micro_proof") {
        try {
            const [proof_id, done_by] = params
            return await api.copyMessage(from.id, done_by, proof_id, {
                parse_mode: "HTML",
                protect_content: protect_content
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (command === "/micro_reject") {
        try {
            const [list_id] = params
            localStore[from.id]["list_id"] = list_id
            const text = `<b><i>⁉️ Provide the reason for rejection.</i></b>`
            answerCallback[from.id] = "MICRO_TASK_REJECTION_REASON"
            await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content,
                reply_markup: {
                    keyboard: [
                        ["✖️ Cancel"]
                    ],
                    resize_keyboard: true
                }
            })
            return await api.deleteMessage(from.id, callback.message.message_id)
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (command === "/micro_approve") {
        try {
            const [list_id] = params
            const pendingTask = await pendingMicroCollection.findOne({ _id: list_id })
            if (pendingTask.status == "rejected" || pendingTask.status == "completed") {
                const text = `<b><i>❌ This task already rejected or completed.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content,
                    reply_markup: {
                        keyboard: keyList.mainKey,
                        resize_keyboard: true
                    }
                })
            }
            const text = `<b><i>⁉️ Are you sure to approve this response?</i></b>`
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ Yes", callback_data: `/confirm_micro_approve ${pendingTask._id}` },
                            { text: "❌ No", callback_data: `/micro_list 0 ${pendingTask.campaign_id}` }
                        ]
                    ]
                }
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (command === "/confirm_micro_approve") {
        try {
            const [list_id] = params
            const pendingTask = await pendingMicroCollection.findOne({ _id: list_id })
            if (pendingTask.status == "rejected" || pendingTask.status == "completed") {
                const text = `<b><i>❌ This task already rejected or completed.</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML"
                })
            }
            const response = await pendingMicroCollection.updateOne({ _id: list_id }, { $set: { status: "completed" } })
            const earn = (pendingTask.cpc * settings.GIVEAWAY).toFixed(4)
            if (response.matchedCount == 1 && response.modifiedCount == 1) {
                const commission = (earn * settings.REF.INCOME.TASK).toFixed(4)
                const updateUser = await userCollection.findOneAndUpdate({ _id: pendingTask.done_by }, { $inc: { "balance.withdrawable": earn } })
                await userCollection.updateOne({ _id: updateUser.invited_by }, { $inc: { "balance.withdrawable": commission, "balance.referral": commission } })
            }
            const text = `<b><i>✅ You micro task response [#${pendingTask.campaign_id}] has been approved by advertiser.\n🎁 Earned: +$${earn}</i></b>`
            await api.editMessageText(`<b><i>✅ The response [#${pendingTask.campaign_id}] has been approved.</i></b>`, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML"
            })
            return await api.sendMessage(pendingTask.done_by, text, {
                parse_mode: "HTML",
                protect_content: protect_content
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (command === "/edit_ad") {
        try {
            const [type, ads_id] = params
            localStore[from.id]["ads_id"] = ads_id
            if (type == "TITLE") {
                answerCallback[from.id] = "EDIT_ADS_TITLE"
                const text = `<b><i>🔠 Enter a title for the ad</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content,
                    reply_markup: {
                        keyboard: [
                            ["✖️ Cancel"]
                        ],
                        resize_keyboard: true
                    }
                })
            }
            if (type == "DESCRIPTION") {
                answerCallback[from.id] = "EDIT_ADS_DESCRIPTION"
                const text = `<b><i>🔠 Enter a description for the ad.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content,
                    reply_markup: {
                        keyboard: [
                            ["✖️ Cancel"]
                        ],
                        resize_keyboard: true
                    }
                })
            }
            if (type == "CPC") {
                answerCallback[from.id] = "EDIT_ADS_CPC"
                const response = await adsCollection.findOne({_id: ads_id})
                const text = `<b><i>💷 Enter the cost per click.\n\n💰 Minimum: $${response.cpc.toFixed(4)}</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content,
                    reply_markup: {
                        keyboard: [
                            ["✖️ Cancel"]
                        ],
                        resize_keyboard: true
                    }
                })
            }
            if (type == "BUDGET") {
                answerCallback[from.id] = "EDIT_ADS_BUDGET"
                const response = await adsCollection.findOne({_id: ads_id})
                const text = `<b><i>💷 Enter the budget for the ad.\n\n💰 Remaining Budget: $${response.remaining_budget.toFixed(4)}</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content,
                    reply_markup: {
                        keyboard: [
                            ["✖️ Cancel"]
                        ],
                        resize_keyboard: true
                    }
                })
            }
        } catch (err) {
            return console.log(err.message)
        }
    }

    // view post

    if (command === "/view_post") {
        try {
            const [post] = params
            return await api.copyMessage(from.id, from.id, post, {
                protect_content: protect_content
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b><i>❌ Post not found!</i></b>", {
                parse_mode: "HTML",
                protect_content: protect_content
            })
        }
    }


    // admin section

    if (command === "/admin_ban_user") {
        try {
            const text = `<b><i>🎯 Enter the targeted userId to ban.</i></b>`
            answerCallback[from.id] = "ADMIN_BAN_USER"
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content,
                reply_markup: {
                    keyboard: [
                        ["🔴 Cancel"]
                    ],
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (command === "/admin_unban_user") {
        try {
            const text = `<b><i>🎯 Enter the targeted userId to ban.</i></b>`
            answerCallback[from.id] = "ADMIN_UNBAN_USER"
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content,
                reply_markup: {
                    keyboard: [
                        ["🔴 Cancel"]
                    ],
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (command === "/admin_user_stat") {
        try {
            let text = `<b><i>🎯 User Stat</i></b>`
            const users = await userCollection.aggregate([
                {
                    $group: {
                        _id: null,
                        count: { $count: {} },
                        banned: { $sum: { $toInt: "$banned" } },
                        verified: { $sum: { $toInt: "$is_verified" } },
                        withdrawable: { $sum: "$balance.withdrawable" },
                        balance: { $sum: "$balance.balance" },
                        referral: { $sum: "$balance.referral" },
                        payouts: { $sum: "$balance.payouts" },
                    }
                }
            ])
            text += `<b><i>\n\nUsers: ${users?.[0]?.count}\nBanned: ${users?.[0]?.banned}\nVerified: ${users?.[0]?.verified}\n\nBalance: $${users?.[0]?.balance?.toFixed(4)}\nWithdrawable: $${users?.[0]?.withdrawable?.toFixed(4)}\nReferral: $${users?.[0]?.referral?.toFixed(4)}\nPayouts: $${users?.[0]?.payouts?.toFixed(4)}</i></b>`
            return await api.editMessageText(text, {
                parse_mode: "HTML",
                chat_id: from.id,
                message_id: callback.message.message_id
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

})