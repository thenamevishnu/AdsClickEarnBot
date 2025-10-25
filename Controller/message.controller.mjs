import { isUri } from "valid-url";
import api from "../Config/Telegram.mjs";
import { answerCallback, getKeyArray, isUserBanned, keyList, localStore, shortID } from "../Utils/tele.mjs";
import { settings } from "../Config/appConfig.mjs";
import { userCollection } from "../Models/user.model.mjs";
import { adsCollection } from "../Models/ads.model.mjs";
import { createPaymentLink, createPayout } from "../Utils/oxapay.mjs";
import { createOrderId, isValidTRXAddress } from "../Utils/helper.mjs";
import { pendingMicroCollection } from "../Models/microTask.model.mjs";
import { deletedAdsModel } from "../Models/deleted_ads.model.mjs";

api.on("message", async message => {
    if (message.chat.type !== "private") return
    const u = await userCollection.findOne({ _id: message.from.id });
    if (u) {
        u.username = message.from.username;
        u.first_name = message.from.first_name;
        u.last_name = message.from.last_name;
        if (u.blocked_bot) {
            u.blocked_bot = false
        }
        await u.save()
    }

    if (message.text && getKeyArray().includes(message.text)) return

    const from = message.from

    const userStatusCheck = await isUserBanned(from.id, 1)
    if(userStatusCheck) return
    
    if (!localStore[from.id]) localStore[from.id] = {}
    
    const waitfor = answerCallback[from.id]
    
    if (!waitfor) return

    // bot ads
    
    if (waitfor === "NEW_BOT_ADS") {
        try {
            localStore[from.id] = {}
            const forward = message.forward_from
            const message_old = message.forward_date
            if (!forward || !forward.is_bot) {
                const text = `<b><i>❌ You should forward a message from bot.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const timeNow = Math.floor(new Date().getTime() / 1000)
            if (timeNow - message_old > 30) {
                const text = `<b><i>❌ The message you forwarded is too old.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const bot_username = forward.username
            localStore[from.id]["username"] = bot_username
            answerCallback[from.id] = "NEW_BOT_ADS_LINK"
            const text = `<b><i>🔗 Enter the refer link or url of the bot.</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_BOT_ADS_LINK") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid url.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const link = message.text
            if (!isUri(link)) {
                const text = `<b><i>❌ Looks like invalid url.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const urlParts = new URL(link)
            const bot_username = localStore[from.id]["username"]
            if ((urlParts.origin != "https://telegram.me" && urlParts.origin != "https://t.me") || urlParts.pathname.replace("/", "") != bot_username) {
                const text = `<b><i>❌ Invalid bot url or refer link.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["link"] = link
            answerCallback[from.id] = "NEW_BOT_ADS_TITLE"
            const text = `<b><i>🔠 Enter a title for the ad</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_BOT_ADS_TITLE") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid title.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const title = message.text
            if (title.length < 5 || title.length > 80) {
                const text = `<b><i>❌ Title length should be from 5 to 80</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["title"] = title
            answerCallback[from.id] = "NEW_BOT_ADS_DESCRIPTION"
            const text = `<b><i>🔠 Enter a description for the ad.</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_BOT_ADS_DESCRIPTION") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid description.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const description = message.text
            if (description.length < 10 || description.length > 255) {
                const text = `<b><i>❌ Description length should be from 10 to 255</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["description"] = description
            answerCallback[from.id] = "NEW_BOT_ADS_CPC"
            const text = `<b><i>💷 Enter the cost per click.\n\n💰 Minimum: $${settings.COST.PER_CLICK.BOT_ADS.toFixed(6)}</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_BOT_ADS_CPC") {
        try {
            if (!message.text || isNaN(message.text)) {
                const text = `<b><i>❌ Looks like invalid amount.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const amount = parseFloat(message.text).toFixed(6)
            if (isNaN(amount) || amount < settings.COST.PER_CLICK.BOT_ADS) {
                const text = `<b><i>❌ Minimum CPC: $${settings.COST.PER_CLICK.BOT_ADS.toFixed(6)}.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["cpc"] = amount
            answerCallback[from.id] = "NEW_BOT_ADS_BUDGET"
            const text = `<b><i>💷 Enter the budget for the ad.\n\n💰 Minimum: $${amount}</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_BOT_ADS_BUDGET") {
        try {
            if (!message.text || isNaN(message.text)) {
                const text = `<b><i>❌ Looks like invalid budget.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const amount = parseFloat(message.text).toFixed(6)
            const cpc = parseFloat(localStore[from.id]["cpc"]).toFixed(6)
            if (isNaN(amount) || amount < cpc) {
                const text = `<b><i>❌ Minimum budget: $${cpc}.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const user = await userCollection.findOne({ _id: from.id })
            if (amount > user.balance.balance) {
                const text = `<b><i>❌ You don't have enough balance.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["budget"] = amount
            answerCallback[from.id] = null
            localStore[from.id]["chat_id"] = from.id
            let short = null
            while (true) {
                short = shortID()
                const response = await adsCollection.findOne({ _id: short })
                if (!response) {
                    const res = await deletedAdsModel.findOne({ _id: short })
                    if (!res) {
                        break;
                    }
                }
            }
            localStore[from.id]["_id"] = short
            localStore[from.id]["remaining_budget"] = amount
            localStore[from.id]["type"] = "BOT"
            await adsCollection.create(localStore[from.id])
            await userCollection.updateOne({_id: from.id},{$inc:{"balance.balance": -(amount)}})
            localStore[from.id] = {}
            const text = `<b><i>✅ You bot ads created</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: keyList.newAdsKey,
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    // new site ads

    if(waitfor === "NEW_SITE_ADS") {
        try {
            localStore[from.id] = {}
            if (!message.text || !isUri(message.text)) {
                const text = `<b><i>❌ Looks like an invalid url.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["link"] = message.text
            answerCallback[from.id] = "NEW_SITE_ADS_TITLE"
            const text = `<b><i>🔠 Enter a title for the ad</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_SITE_ADS_TITLE") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid title.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const title = message.text
            if (title.length < 5 || title.length > 80) {
                const text = `<b><i>❌ Title length should be from 5 to 80</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["title"] = title
            answerCallback[from.id] = "NEW_SITE_ADS_DESCRIPTION"
            const text = `<b><i>🔠 Enter a description for the ad.</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_SITE_ADS_DESCRIPTION") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid description.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const description = message.text
            if (description.length < 10 || description.length > 255) {
                const text = `<b><i>❌ Description length should be from 10 to 255</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["description"] = description
            answerCallback[from.id] = "NEW_SITE_ADS_DURATION"
            settings.COST.PER_CLICK.BOT_ADS.toFixed(6)
            const text = `<b><i>⌚ Provide the duration in seconds that people stay on the site.\n\n⏳ Minimum duration is 10 seconds.</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_SITE_ADS_DURATION") {
        try {
            if (!message.text && isNaN(message.text)) {
                const text = `<b><i>❌ Invalid duration.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const duration = parseInt(message.text)
            if (duration < 10 || duration > 120) {
                const text = `<b><i>❌ Duration should be from 10 to 120 seconds</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["duration"] = duration
            answerCallback[from.id] = "NEW_SITE_ADS_CPC"
            const perVisit = parseFloat((settings.COST.PER_CLICK.SITE_ADS / 10) * duration).toFixed(6)
            const text = `<b><i>💷 Enter the cost per visit.\n\n💰 Minimum: $${perVisit} for ${duration} seconds.</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_SITE_ADS_CPC") {
        try {
            if (!message.text || isNaN(message.text)) {
                const text = `<b><i>❌ Looks like invalid amount.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const amount = parseFloat(message.text).toFixed(6)
            const duration = localStore[from.id]["duration"]
            const perVisit = parseFloat((settings.COST.PER_CLICK.SITE_ADS / 10) * duration).toFixed(6)
            if (isNaN(amount) || amount < perVisit) {
                const text = `<b><i>❌ Minimum CPC: $${perVisit} per ${duration} seconds.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["cpc"] = amount
            answerCallback[from.id] = "NEW_SITE_ADS_BUDGET"
            const text = `<b><i>💷 Enter the budget for the ad.\n\n💰 Minimum: $${amount}</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_SITE_ADS_BUDGET") {
        try {
            if (!message.text || isNaN(message.text)) {
                const text = `<b><i>❌ Looks like invalid budget.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const amount = parseFloat(message.text).toFixed(6)
            const cpc = parseFloat(localStore[from.id]["cpc"]).toFixed(6)
            if (isNaN(amount) || amount < cpc) {
                const text = `<b><i>❌ Minimum budget: $${cpc}.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const user = await userCollection.findOne({ _id: from.id })
            if (amount > user.balance.balance) {
                const text = `<b><i>❌ You don't have enough balance.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["budget"] = amount
            answerCallback[from.id] = null
            localStore[from.id]["chat_id"] = from.id
            let short = null
            while (true) {
                short = shortID()
                const response = await adsCollection.findOne({ _id: short })
                if (!response) {
                    const res = await deletedAdsModel.findOne({ _id: short })
                    if (!res) {
                        break;
                    }
                }
            }
            localStore[from.id]["_id"] = short
            localStore[from.id]["remaining_budget"] = amount
            localStore[from.id]["type"] = "SITE"
            await adsCollection.create(localStore[from.id])
            await userCollection.updateOne({_id: from.id},{$inc:{"balance.balance": -(amount)}})
            localStore[from.id] = {}
            const text = `<b><i>✅ You site ads created</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: keyList.newAdsKey,
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    // post ads

    if (waitfor === "NEW_POST_ADS") {
        try {
            localStore[from.id] = {}
            const post_id = message.message_id
            await api.sendMessage(from.id, "👇 Preview 👇")
            await api.copyMessage(from.id, from.id, post_id, {
                protect_content: settings.PROTECTED_CONTENT
            })
            localStore[from.id]["post_id"] = post_id
            answerCallback[from.id] = "NEW_POST_ADS_TITLE"
            const text = `<b><i>🔠 Enter a title for the ad</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_POST_ADS_TITLE") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid title.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const title = message.text
            if (title.length < 5 || title.length > 80) {
                const text = `<b><i>❌ Title length should be from 5 to 80</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["title"] = title
            answerCallback[from.id] = "NEW_POST_ADS_DESCRIPTION"
            const text = `<b><i>🔠 Enter a description for the ad.</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_POST_ADS_DESCRIPTION") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid description.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const description = message.text
            if (description.length < 10 || description.length > 255) {
                const text = `<b><i>❌ Description length should be from 10 to 255</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["description"] = description
            answerCallback[from.id] = "NEW_POST_ADS_DURATION"
            settings.COST.PER_CLICK.POST_ADS.toFixed(6)
            const text = `<b><i>⌚ Provide the duration in seconds that people should view.\n\n⏳ Minimum duration is 10 seconds.</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_POST_ADS_DURATION") {
        try {
            if (!message.text && isNaN(message.text)) {
                const text = `<b><i>❌ Invalid duration.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const duration = parseInt(message.text)
            if (duration < 10 || duration > 120) {
                const text = `<b><i>❌ Duration should be from 10 to 120 seconds</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["duration"] = duration
            answerCallback[from.id] = "NEW_POST_ADS_CPC"
            const perVisit = parseFloat((settings.COST.PER_CLICK.POST_ADS / 10) * duration).toFixed(6)
            const text = `<b><i>💷 Enter the cost per view.\n\n💰 Minimum: $${perVisit} for ${duration} seconds.</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_POST_ADS_CPC") {
        try {
            if (!message.text || isNaN(message.text)) {
                const text = `<b><i>❌ Looks like invalid amount.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const amount = parseFloat(message.text).toFixed(6)
            const duration = localStore[from.id]["duration"]
            const perVisit = parseFloat((settings.COST.PER_CLICK.POST_ADS / 10) * duration).toFixed(6)
            if (isNaN(amount) || amount < perVisit) {
                const text = `<b><i>❌ Minimum CPC: $${perVisit} per ${duration} seconds.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["cpc"] = amount
            answerCallback[from.id] = "NEW_POST_ADS_BUDGET"
            const text = `<b><i>💷 Enter the budget for the ad.\n\n💰 Minimum: $${amount}</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_POST_ADS_BUDGET") {
        try {
            if (!message.text || isNaN(message.text)) {
                const text = `<b><i>❌ Looks like invalid budget.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const amount = parseFloat(message.text).toFixed(6)
            const cpc = parseFloat(localStore[from.id]["cpc"]).toFixed(6)
            if (isNaN(amount) || amount < cpc) {
                const text = `<b><i>❌ Minimum budget: $${cpc}.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const user = await userCollection.findOne({ _id: from.id })
            if (amount > user.balance.balance) {
                const text = `<b><i>❌ You don't have enough balance.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["budget"] = amount
            answerCallback[from.id] = null
            localStore[from.id]["chat_id"] = from.id
            let short = null
            while (true) {
                short = shortID()
                const response = await adsCollection.findOne({ _id: short })
                if (!response) {
                    const res = await deletedAdsModel.findOne({ _id: short })
                    if (!res) {
                        break;
                    }
                }
            }
            localStore[from.id]["_id"] = short
            localStore[from.id]["remaining_budget"] = amount
            localStore[from.id]["type"] = "POST"
            await adsCollection.create(localStore[from.id])
            await userCollection.updateOne({_id: from.id},{$inc:{"balance.balance": -(amount)}})
            localStore[from.id] = {}
            const text = `<b><i>✅ You post ads created</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: keyList.newAdsKey,
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    // chats ads

    if (waitfor === "NEW_CHAT_ADS") {
        try {
            localStore[from.id] = {}
            let chats_id = null
            const forward = message.forward_from_chat
            if (!forward && !message.text) {
                const text = `<b><i>❌ Enter a valid username</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            let username = null
            if (forward) {
                if (forward.type == "channel") {
                    if (!forward.username) {
                        const text = `<b><i>❌ Looks like a private channel, we only accept public channels or chats!</i></b>`
                        return await api.sendMessage(from.id, text, {
                            parse_mode: "HTML",
                            protect_content: settings.PROTECTED_CONTENT
                        })
                    }
                    username = forward.username
                }
            } else {
                username = message.text.replace("@", "")
            }
            if (!username) {
                const text = `<b><i>❌ Looks like it is not a chat/channel!</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            let isValidUsername = false
            try {
                const info = await api.getChat(`@${username}`)
                if (info.username == username) {
                    isValidUsername = true
                    chats_id = info.id
                }
            } catch (err) {
                isValidUsername = false
            }
            if (!isValidUsername) {
                const text = `<b><i>❌ Looks like it is not a chat/channel!</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const { status: botStatus } = await api.getChatMember(chats_id, settings.BOT.ID)
            if (botStatus != "administrator") {
                const text = `<b><i>❌ Add this bot as an administrator in @${username}!</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["username"] = username
            localStore[from.id]["link"] = `https://t.me/${username}`
            localStore[from.id]["chats_id"] = chats_id
            answerCallback[from.id] = "NEW_CHAT_ADS_TITLE"
            const text = `<b><i>🔠 Enter a title for the ad</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, `<b>❌ Make sure the bot (@${settings.BOT.USERNAME}) is an administrator in your chat/channel!</b>`, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_CHAT_ADS_TITLE") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid title.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const title = message.text
            if (title.length < 5 || title.length > 80) {
                const text = `<b><i>❌ Title length should be from 5 to 80</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["title"] = title
            answerCallback[from.id] = "NEW_CHAT_ADS_DESCRIPTION"
            const text = `<b><i>🔠 Enter a description for the ad.</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_CHAT_ADS_DESCRIPTION") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid description.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const description = message.text
            if (description.length < 10 || description.length > 255) {
                const text = `<b><i>❌ Description length should be from 10 to 255</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["description"] = description
            answerCallback[from.id] = "NEW_CHAT_ADS_CPC"
            const text = `<b><i>💷 Enter the cost per join.\n\n💰 Minimum: $${settings.COST.PER_CLICK.CHAT_ADS.toFixed(6)}</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_CHAT_ADS_CPC") {
        try {
            if (!message.text || isNaN(message.text)) {
                const text = `<b><i>❌ Looks like invalid amount.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const amount = parseFloat(message.text).toFixed(6)
            if (isNaN(amount) || amount < settings.COST.PER_CLICK.CHAT_ADS) {
                const text = `<b><i>❌ Minimum CPC: $${settings.COST.PER_CLICK.CHAT_ADS.toFixed(6)}.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["cpc"] = amount
            answerCallback[from.id] = "NEW_CHAT_ADS_BUDGET"
            const text = `<b><i>💷 Enter the budget for the ad.\n\n💰 Minimum: $${amount}</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_CHAT_ADS_BUDGET") {
        try {
            if (!message.text || isNaN(message.text)) {
                const text = `<b><i>❌ Looks like invalid budget.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const amount = parseFloat(message.text).toFixed(6)
            const cpc = parseFloat(localStore[from.id]["cpc"]).toFixed(6)
            if (isNaN(amount) || amount < cpc) {
                const text = `<b><i>❌ Minimum budget: $${cpc}.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const user = await userCollection.findOne({ _id: from.id })
            if (amount > user.balance.balance) {
                const text = `<b><i>❌ You don't have enough balance.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["budget"] = amount
            answerCallback[from.id] = null
            localStore[from.id]["chat_id"] = from.id
            let short = null
            while (true) {
                short = shortID()
                const response = await adsCollection.findOne({ _id: short })
                if (!response) {
                    const res = await deletedAdsModel.findOne({ _id: short })
                    if (!res) {
                        break;
                    }
                }
            }
            localStore[from.id]["_id"] = short
            localStore[from.id]["remaining_budget"] = amount
            localStore[from.id]["type"] = "CHAT"
            await adsCollection.create(localStore[from.id])
            await userCollection.updateOne({_id: from.id},{$inc:{"balance.balance": -(amount)}})
            localStore[from.id] = {}
            const text = `<b><i>✅ You chat ads created</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: keyList.newAdsKey,
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    // micro task

    if (waitfor === "NEW_MICRO_ADS") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid title.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const title = message.text
            if (title.length < 5 || title.length > 80) {
                const text = `<b><i>❌ Title length should be from 5 to 80</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["title"] = title
            answerCallback[from.id] = "NEW_MICRO_ADS_DESCRIPTION"
            const text = `<b><i>🔠 Enter a description/what people should do in this ad.</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_MICRO_ADS_DESCRIPTION") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid description.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const description = message.text
            if (description.length < 10 || description.length > 500) {
                const text = `<b><i>❌ Description length should be from 10 to 500</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["description"] = description
            answerCallback[from.id] = "NEW_MICRO_ADS_CPC"
            const text = `<b><i>💷 Enter the cost per task.\n\n💰 Minimum: $${settings.COST.PER_CLICK.MICRO_ADS.toFixed(6)}</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_MICRO_ADS_CPC") {
        try {
            if (!message.text || isNaN(message.text)) {
                const text = `<b><i>❌ Looks like invalid amount.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const amount = parseFloat(message.text).toFixed(6)
            if (isNaN(amount) || amount < settings.COST.PER_CLICK.MICRO_ADS) {
                const text = `<b><i>❌ Minimum CPC: $${settings.COST.PER_CLICK.MICRO_ADS.toFixed(6)}.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["cpc"] = amount
            answerCallback[from.id] = "NEW_MICRO_ADS_BUDGET"
            const text = `<b><i>💷 Enter the budget for the ad.\n\n💰 Minimum: $${amount}</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "NEW_MICRO_ADS_BUDGET") {
        try {
            if (!message.text || isNaN(message.text)) {
                const text = `<b><i>❌ Looks like invalid budget.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const amount = parseFloat(message.text).toFixed(6)
            const cpc = parseFloat(localStore[from.id]["cpc"]).toFixed(6)
            if (isNaN(amount) || amount < cpc) {
                const text = `<b><i>❌ Minimum budget: $${cpc}.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const user = await userCollection.findOne({ _id: from.id })
            if (amount > user.balance.balance) {
                const text = `<b><i>❌ You don't have enough balance.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["budget"] = amount
            answerCallback[from.id] = null
            localStore[from.id]["chat_id"] = from.id
            let short = null
            while (true) {
                short = shortID()
                const response = await adsCollection.findOne({ _id: short })
                if (!response) {
                    const res = await deletedAdsModel.findOne({ _id: short })
                    if (!res) {
                        break;
                    }
                }
            }
            localStore[from.id]["_id"] = short
            localStore[from.id]["remaining_budget"] = amount
            localStore[from.id]["type"] = "MICRO"
            await adsCollection.create(localStore[from.id])
            await userCollection.updateOne({_id: from.id},{$inc:{"balance.balance": -(amount)}})
            localStore[from.id] = {}
            const text = `<b><i>✅ You micro task created</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: keyList.newAdsKey,
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    // edit ads

    if (waitfor === "EDIT_ADS_TITLE") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid title.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const title = message.text
            if (title.length < 5 || title.length > 80) {
                const text = `<b><i>❌ Title length should be from 5 to 80</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const ads_id = localStore[from.id]["ads_id"]
            answerCallback[from.id] = null
            await adsCollection.updateOne({ _id: ads_id }, { $set: { title: title } })
            const text = `<b><i>✅ Ad title updated!</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: keyList.myAdsKey,
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "EDIT_ADS_DESCRIPTION") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid description.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const description = message.text
            if (description.length < 10 || description.length > 255) {
                const text = `<b><i>❌ Description length should be from 10 to 255</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const ads_id = localStore[from.id]["ads_id"]
            answerCallback[from.id] = null
            await adsCollection.updateOne({ _id: ads_id }, { $set: { description: description } })
            const text = `<b><i>✅ Ad description updated!</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: keyList.myAdsKey,
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "EDIT_ADS_CPC") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid amount.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const amount = parseFloat(message.text).toFixed(6)
            const ads_id = localStore[from.id]["ads_id"]
            const ads = await adsCollection.findOne({ _id: ads_id })
            if (isNaN(amount) || amount <= ads.cpc) {
                const text = `<b><i>❌ CPC should be greater than $${ads.cpc.toFixed(6)}.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            answerCallback[from.id] = null
            await adsCollection.updateOne({ _id: ads_id }, { $set: { cpc: amount } })
            const text = `<b><i>✅ Ad cpc updated!</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: keyList.myAdsKey,
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "EDIT_ADS_BUDGET") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid budget.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const amount = parseFloat(message.text).toFixed(6)
            if (isNaN(amount) || amount <= 0) {
                const text = `<b><i>❌ Budget should be greater than 0.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const user = await userCollection.findOne({ _id: from.id })
            if (amount > user.balance.balance) {
                const text = `<b><i>❌ You don't have enough balance.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const ads_id = localStore[from.id]["ads_id"]
            answerCallback[from.id] = null
            await adsCollection.updateOne({ _id: ads_id }, { $inc: { budget: amount, remaining_budget: amount } })
            const text = `<b><i>✅ Ad budget updated!</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: keyList.myAdsKey,
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    // bot task completed

    if (waitfor === "STARTED_BOT") {
        try {
            const ads_id = localStore[from.id]["ads_id"]
            const forward = message.forward_from
            const forward_date = message.forward_date
            const ads = await adsCollection.findOne({ _id: ads_id, status: true })
            if (!ads) {
                const text = `<b><i>❌ Task disabled or deleted!</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            if (ads.completed.includes(from.id) || ads.skip.includes(from.id)) {
                const text = `<b><i>❌ You've already completed/skipped</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            if (!forward || forward.username != ads.username) {
                const text = `<b><i>🛰️ Forward a message from <a href='${ads.link}'>@${ads.username}</a></i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const currentTime = Math.floor(new Date().getTime() / 1000)
            if (currentTime - forward_date > 30) {
                const text = `<b><i>❌ The message you forwarded is too old.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            if (ads.remaining_budget < ads.cpc) {
                await adsCollection.updateOne({ _id: ads_id }, { $set: { status: false } })
                const text = `<b><i>❌ Task paused due to insufficient budget</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const earn = (ads.cpc * settings.GIVEAWAY).toFixed(6)
            const commission = ( earn * settings.REF.INCOME.TASK ).toFixed(6)
            await adsCollection.updateOne({ _id: ads_id },{$inc: {remaining_budget: -(ads.cpc)}, $addToSet:{completed: from.id}})
            const user = await userCollection.findOneAndReplace({ _id: from.id }, { $inc: { "balance.withdrawable": earn, "balance.earned": earn } })
            await userCollection.updateOne({ _id: user.invited_by }, { $inc: { "balance.withdrawable": commission, "balance.referral": commission, "balance.earned": commission } })
            const text = `<b><i>✅ Task completed, you've received +$${earn}</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: keyList.teleKey,
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    // micro task proof submission

    if (waitfor === "MICRO_TASK_SUBMIT_PROOF") {
        try {
            const ads_id = localStore[from.id]["ads_id"]
            const ads = await adsCollection.findOne({ _id: ads_id, status: true })
            if (!ads) {
                const text = `<b><i>❌ Task disabled or deleted!</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            if (ads.skip.includes(from.id)) {
                const text = `<b><i>❌ Task already skipped</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            if (ads.completed.includes(from.id)) {
                const text = `<b><i>❌ Task already completed</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                }) 
            }
            if (ads.remaining_budget < ads.cpc) {
                await adsCollection.updateOne({ _id: ads_id }, { $set: { status: false } })
                const text = `<b><i>❌ Task paused due to insufficient budget</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const sendTo = ads.chat_id
            const proof = message.message_id
            await adsCollection.updateOne({ _id: ads_id }, { $addToSet: { completed: from.id }, $inc: { remaining_budget: -(ads.cpc) } })
            await pendingMicroCollection.create({
                campaign_id: ads_id,
                cpc: ads.cpc.toFixed(6),
                done_by: from.id,
                proof: proof,
                creator: sendTo,
                time: Math.floor(new Date().getTime()/1000)
            })
            answerCallback[from.id] = null
            const text = `<b><i>✅ Submitted. Wait for advertiser approval.</i></b>`
            await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: keyList.mainKey,
                    resize_keyboard: true
                }
            })
            return await api.sendMessage(sendTo, `<b><i>🆔 CampaignID: #${ads._id}\n🎯 Type: MICRO STASK\n✅ Submitted: ${from.first_name}\n\n📊 Advertise => 📊 My Ads => 🎯 My Micro to see list</i></b>`, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    // micro task rejection reason

    if (waitfor === "MICRO_TASK_REJECTION_REASON") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Only text message is allowed.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            answerCallback[from.id] = null
            const list_id = localStore[from.id]["list_id"]
            const pendingTask = await pendingMicroCollection.findOne({ _id: list_id })
            if (pendingTask.status == "rejected" || pendingTask.status == "completed") {
                const text = `<b><i>❌ This task already rejected or completed.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT,
                    reply_markup: {
                        keyboard: keyList.myAdsKey,
                        resize_keyboard: true
                    }
                })
            }
            const resp = await pendingMicroCollection.updateOne({ _id: list_id }, { $set: { status: "rejected", reason: message.text } })
            if (resp.matchedCount == 1 && resp.modifiedCount == 1) {
                await adsCollection.updateOne({ _id: pendingTask.campaign_id }, { $inc: { remaining_budget: pendingTask.cpc.toFixed(6) } })
            }
            const text = `<b><i>✅ The response [#${pendingTask.campaign_id}] has been rejected.\n📃 Reason: ${message.text}</i></b>`
            await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: keyList.myAdsKey,
                    resize_keyboard: true
                }
            })
            return await api.sendMessage(pendingTask.done_by, `<b><i>🔴 Your micro task response [#${pendingTask.campaign_id}] has been rejected by the advertiser\n📃 Reason: ${message.text}</i></b>`, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    // balance related

    if (waitfor === "CONVERT_BALANCE") {
        try {
            if (!message?.text || isNaN(message?.text)) {
                const text = `<b><i>❌ Only number is allowed.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const user = await userCollection.findOne({ _id: from.id })
            const amount = parseFloat(message.text).toFixed(6)
            if (user.balance.withdrawable <= 0) {
                answerCallback[from.id] = null
                const text = `<b><i>❌ You don't have enough balance.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT,
                    reply_markup: {
                        keyboard: keyList.balanceKey,
                        resize_keyboard: true
                    }
                })
            }
            if (amount < 0 || amount > user.balance.withdrawable) {
                const text = `<b><i>❌ Amount should be greater than 0 and less than or equal to $${user.balance.withdrawable.toFixed(6)}</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT,
                    reply_markup: {
                        keyboard: keyList.balanceKey,
                        resize_keyboard: true
                    }
                })
            }
            answerCallback[from.id] = null
            const response = await userCollection.updateOne({ _id: from.id }, {
                $inc: {
                    "balance.withdrawable": -(amount),
                    "balance.balance": amount
                }
            })
            let text = ""
            if (response.matchedCount == 1 && response.modifiedCount == 1) {
                text = `✅ Balance converted`
            } else {
                text = `❌ Error while converting balance`
            }
            return await api.sendMessage(from.id, `<b><i>${text}</i></b>`, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: keyList.balanceKey,
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "PAYOUT_AMOUNT") {
        try {
            if (!message.text || isNaN(message.text)) {
                const text = `<b><i>❌ Invalid amount!</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            } 
            const amount = parseFloat(message.text).toFixed(6)
            const user = await userCollection.findOne({ _id: from.id })
            const minPay = settings.PAYMENT.MIN.WITHDRAW
            if (amount < minPay || amount > user.balance.withdrawable) {
                const text = `<b><i>❌ ${amount < minPay ? `Minimum payout is $${minPay}` : `You don't have enough balance.`}</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            localStore[from.id]["payout"] = amount
            answerCallback[from.id] = "PAYOUT_ADDRESS"
            const text = `<b><i>📤 Enter your USDT-TRC20 address for withdrawal.</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "PAYOUT_ADDRESS") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Invalid address!</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const isOk = isValidTRXAddress(message.text)
            if (!isOk) {
                const text = `<b><i>❌ Invalid address!</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const amount = parseFloat(localStore[from.id]["payout"]).toFixed(6)
            const address = message.text
            answerCallback[from.id] = null
            const CALLBACK_URL = `${process.env.SERVER}/payments/callback`
            const status = await createPayout(from.id, address, amount, CALLBACK_URL)
            if (status == 400) {
                return await api.sendMessage(from.id, `<b><i>❌ Payout failed!</i></b>`, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            if (status == 200) {
                await userCollection.updateOne({_id: from.id},{$set: {"balance.withdrawable": -(amount)}})
            }
            const text = `<b><i>✅ Requested payout of $${amount} to ${address} is ${status == 200 ? "Processing" : "Failed"}!</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "PAY_WITH_CRYPTO") {
        try {
            if (!message.text || isNaN(message.text)) {
                const text = `<b><i>❌ Invalid amount!</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const amount = parseFloat(message.text).toFixed(6)
            if (amount < settings.PAYMENT.MIN.DEPOSIT) {
                const text = `<b><i>❌ Minimum deposit $${settings.PAYMENT.MIN.DEPOSIT.toFixed(6)}</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            answerCallback[from.id] = null
            const CALLBACK_URL = `${process.env.SERVER}/payments/callback`
            const orderid = createOrderId()
            const payment_info = await createPaymentLink(from.id, amount, CALLBACK_URL, orderid)
            if (!payment_info?.payment_url) {
                const text = `<b><i>❌ We can't generate a payment link.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT,

                })
            }
            await api.sendMessage(from.id, `<b><i>⌛ Generating payment link...</i></b>`, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: keyList.balanceKey,
                    resize_keyboard: true
                }
            })
            const text = `<b><i><code>🆔 #${orderid}</code>\n\n💵 Amount: $${amount}\n⌛ Expire in 30 minutes</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "PAY NOW", url: payment_info?.payment_url }
                        ]
                    ]
                }
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    // admin section

    if (waitfor === "ADMIN_BAN_USER") {
        try {
            if(!message.text || isNaN(message.text)){
                const text = `<b><i>❌ Enter userId in numberic.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const user = await userCollection.findOne({ _id: Number(message.text) })
            if(!user){
                const text = `<b><i>❌ Invalid userId or user not found.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            answerCallback[from.id] = null
            if(user.banned){
                const text = `<b><i>❌ User already banned.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            await userCollection.updateOne({_id: Number(message.text)},{$set:{banned: true}})
            const text = `<b><i>✅ Targeted user banned</i></b>`
            const text2 = `<b><i>❌ You're banned</i></b>`
            await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup:{
                    keyboard: keyList.mainKey,
                    resize_keyboard: true
                }
            })
            return await api.sendMessage(Number(message.text), text2, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "ADMIN_UNBAN_USER") {
        try {
            if(!message.text || isNaN(message.text)){
                const text = `<b><i>❌ Enter userId in numberic.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            const user = await userCollection.findOne({ _id: Number(message.text) })
            if(!user){
                const text = `<b><i>❌ Invalid userId or user not found.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            answerCallback[from.id] = null
            if(!user.banned){
                const text = `<b><i>✅ User already unbanned</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: settings.PROTECTED_CONTENT
                })
            }
            await userCollection.updateOne({_id: Number(message.text)},{$set:{banned: false}})
            const text = `<b><i>✅ Targeted user unbanned</i></b>`
            const text2 = `<b><i>✅ You're unbanned</i></b>`
            await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup:{
                    keyboard: keyList.mainKey,
                    resize_keyboard: true
                }
            })
            return await api.sendMessage(Number(message.text), text2, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "ADMIN_MAILING") {
        try {
            const message_id = message.message_id
            const text = "<b><i>👇 Preview 👇</i></b>"
            answerCallback[from.id] = null
            await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
            await api.copyMessage(from.id, from.id, message_id, {
                protect_content: settings.PROTECTED_CONTENT,
                parse_mode: "HTML"
            })
            return await api.sendMessage(from.id, "<i><b>✅ Are you sure?</b></i>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "❌ Cancel", callback_data: "/admin_cancel_mail" },
                            { text: "✅ Send", callback_data: `/admin_send_mail ${message_id}` }
                        ]
                    ]
                }
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (waitfor === "ADMIN_USER_ID_FOR_ADD_BALANCE") {
        try {
            if (isNaN(message.text)) {
                return await api.sendMessage(from.id, `<i>✖️ Enter valid UserID</i>`, {
                    parse_mode: "HTML",
                    protect_content: true
                })
            }
            const userid = message.text
            const type = localStore[from.id]["balance_add_to"]
            const userinfo = await userCollection.findOne({ _id: userid })
            const balance = userinfo.balance[type]
            localStore[from.id]["userid_to_add_balance"] = userid
            answerCallback[from.id] = "ADMIN_ENTER_BALANCE_TO_ADD"
            return await api.sendMessage(from.id, `<i>💷 Enter the amount you want to add\n\n💰 ${type.replace(type[0], type[0].toUpperCase())}: $${balance.toFixed(6)}</i>`, {
                parse_mode: "HTML",
                protect_content: true
            })
        } catch (err) {
            return await api.sendMessage(from.id, `<i>❌ Error occured</i>`, {
                parse_mode: "HTML",
                protect_content: true
            })
        }
    }

    if (waitfor === "ADMIN_ENTER_BALANCE_TO_ADD") {
        try {
            if (isNaN(message.text)) {
                return await api.sendMessage(from.id, `<i>✖️ Enter valid amount</i>`, {
                    parse_mode: "HTML",
                    protect_content: true
                })
            }
            const amount = parseFloat(message.text).toFixed(6)
            const type = localStore[from.id]["balance_add_to"]
            const userid = localStore[from.id]["userid_to_add_balance"]
            answerCallback[from.id] = null
            const obj = {}
            if (type === "deposits") {
                obj.add = { "balance.balance": amount, [`balance.${type}`]: amount }
            } else {
                obj.add = { [`balance.${type}`]: amount }
            }
            await userCollection.updateOne({ _id: userid }, { $inc: obj.add })
            await api.sendMessage(from.id, `<i>☑️ Balance added:\n\n🆔 UserID: ${userid}\n💷 To: ${type.replace(type[0], type[0].toUpperCase())}\n💰 Amount: $${amount}</i>`, {
                parse_mode: "HTML",
                protect_content: true,
                reply_markup: {
                    keyboard: keyList.mainKey,
                    resize_keyboard: true
                }
            })
            return await api.sendMessage(userid, `<i>✅ Balance added by Admin\n\n💷 To: ${type.replace(type[0], type[0].toUpperCase())}\n💰 Amount: $${amount}</i>`, {
                parse_mode: "HTML",
                protect_content: true
            })
        } catch (err) {
            return await api.sendMessage(from.id, `<i>❌ Error occured</i>`, {
                parse_mode: "HTML",
                protect_content: true
            })
        }
    }

})