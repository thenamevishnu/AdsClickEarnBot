import api from "../Config/Telegram.mjs";
import { adsCollection } from "../Models/ads.model.mjs";
import { userCollection } from "../Models/user.model.mjs";
import { createPaymentLink } from "../Utils/oxapay.mjs";
import { adsText, answerCallback, inlineKeys, localStore, protect_content } from "../Utils/tele.mjs";

api.on("callback_query", async callback => {
    const data = callback.data
    const params = data.split(" ")
    const command = params[0]
    params.shift()
    const from = callback.from

    if(!localStore[from.id]) localStore[from.id] = {}

    // payments

    if (command === "/pay") {
        
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

    // manage ads

    if (command === "/ads_status") {
        try {
            const [status, ads_id] = params
            await adsCollection.updateOne({ _id: ads_id }, { $set: { status: status } })
            const ads = await adsCollection.findOne({ _id: ads_id })
            const text = adsText.botAds(ads)
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: inlineKeys.adsManageKey(ads)
                }
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
})