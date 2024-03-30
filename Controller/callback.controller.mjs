import api from "../Config/Telegram.mjs";
import { settings } from "../Config/appConfig.mjs";
import { adsCollection } from "../Models/ads.model.mjs";
import { userCollection } from "../Models/user.model.mjs";
import { adsText, answerCallback, inlineKeys, keyList, localStore, protect_content } from "../Utils/tele.mjs";

api.on("callback_query", async callback => {
    const data = callback.data
    const params = data.split(" ")
    const command = params[0]
    params.shift()
    const from = callback.from

    if(!localStore[from.id]) localStore[from.id] = {}

    // payments

    if (command === "/pay") {
        try{
            const [method] = params
            let text;
            if (method == "CRYPTO") {
                text = `<b><i>💷 Enter the amount you want to deposit!</i></b>`
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
            const text = adType.type == "BOT" ? adsText.botAds(ads) : adType.type == "SITE" ? adsText.siteAds(ads) : ads.type == "POST" ? adsText.postAds(ads) : ads.type == "CHAT" ? adsText.chatAds(ads) : "Error"
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

})