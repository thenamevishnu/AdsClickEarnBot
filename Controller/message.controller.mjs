import { isUri } from "valid-url";
import api from "../Config/Telegram.mjs";
import { answerCallback, getKeyArray, keyList, localStore, protect_content, shortID } from "../Utils/tele.mjs";
import { settings } from "../Config/appConfig.mjs";
import { userCollection } from "../Models/user.model.mjs";
import { adsCollection } from "../Models/ads.model.mjs";
import { createPaymentLink } from "../Utils/oxapay.mjs";
import { createOrderId } from "../Utils/helper.mjs";

api.on("message", async message => {
    if(message.chat.type !== "private") return
    if (message.text && getKeyArray().includes(message.text)) return

    const from = message.from
    
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
                    protect_content: protect_content
                })
            }
            const timeNow = Math.floor(new Date().getTime() / 1000)
            if (timeNow - message_old > 30) {
                const text = `<b><i>❌ The message you forwarded is too old.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            const bot_username = forward.username
            localStore[from.id]["username"] = bot_username
            answerCallback[from.id] = "NEW_BOT_ADS_LINK"
            const text = `<b><i>🔗 Enter the refer link or url of the bot.</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (waitfor === "NEW_BOT_ADS_LINK") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid url.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            const link = message.text
            if (!isUri(link)) {
                const text = `<b><i>❌ Looks like invalid url.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            const urlParts = new URL(link)
            const bot_username = localStore[from.id]["username"]
            if ((urlParts.origin != "https://telegram.me" && urlParts.origin != "https://t.me") || urlParts.pathname.replace("/", "") != bot_username) {
                const text = `<b><i>❌ Invalid bot url or refer link.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            localStore[from.id]["link"] = link
            answerCallback[from.id] = "NEW_BOT_ADS_TITLE"
            const text = `<b><i>🔠 Enter a title for the ad</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (waitfor === "NEW_BOT_ADS_TITLE") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid title.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            const title = message.text
            if (title.length < 5 || title.length > 80) {
                const text = `<b><i>❌ Title length should be from 5 to 80</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            localStore[from.id]["title"] = title
            answerCallback[from.id] = "NEW_BOT_ADS_DESCRIPTION"
            const text = `<b><i>🔠 Enter a description for the ad.</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (waitfor === "NEW_BOT_ADS_DESCRIPTION") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid description.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            const description = message.text
            if (description.length < 10 || description.length > 255) {
                const text = `<b><i>❌ Description length should be from 10 to 255</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            localStore[from.id]["description"] = description
            answerCallback[from.id] = "NEW_BOT_ADS_CPC"
            const text = `<b><i>💷 Enter the cost per click.\n\n💰 Minimum: $${settings.COST.PER_CLICK.BOT_ADS.toFixed(4)}</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (waitfor === "NEW_BOT_ADS_CPC") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid amount.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            const amount = parseFloat(message.text).toFixed(4)
            if (isNaN(amount) || amount < settings.COST.PER_CLICK.BOT_ADS) {
                const text = `<b><i>❌ Minimum CPC: $${settings.COST.PER_CLICK.BOT_ADS.toFixed(4)}.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            localStore[from.id]["cpc"] = amount
            answerCallback[from.id] = "NEW_BOT_ADS_BUDGET"
            const text = `<b><i>💷 Enter the budget for the ad.\n\n💰 Minimum: $${amount}</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (waitfor === "NEW_BOT_ADS_BUDGET") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid budget.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            const amount = parseFloat(message.text).toFixed(4)
            const cpc = parseFloat(localStore[from.id]["cpc"]).toFixed(4)
            if (isNaN(amount) || amount < cpc) {
                const text = `<b><i>❌ Minimum budget: $${cpc}.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            const user = await userCollection.findOne({ _id: from.id })
            if (amount > user.balance.balance) {
                const text = `<b><i>❌ You don't have enough balance.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
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
                    break
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
                protect_content: protect_content,
                reply_markup: {
                    keyboard: keyList.newAdsKey,
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    // edit ads

    if (waitfor === "EDIT_ADS_TITLE") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid title.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            const title = message.text
            if (title.length < 5 || title.length > 80) {
                const text = `<b><i>❌ Title length should be from 5 to 80</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            const ads_id = localStore[from.id]["ads_id"]
            answerCallback[from.id] = null
            await adsCollection.updateOne({ _id: ads_id }, { $set: { title: title } })
            const text = `<b><i>✅ Ad title updated!</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content,
                reply_markup: {
                    keyboard: keyList.myAdsKey,
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (waitfor === "EDIT_ADS_DESCRIPTION") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid description.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            const description = message.text
            if (description.length < 10 || description.length > 255) {
                const text = `<b><i>❌ Description length should be from 10 to 255</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            const ads_id = localStore[from.id]["ads_id"]
            answerCallback[from.id] = null
            await adsCollection.updateOne({ _id: ads_id }, { $set: { description: description } })
            const text = `<b><i>✅ Ad description updated!</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content,
                reply_markup: {
                    keyboard: keyList.myAdsKey,
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (waitfor === "EDIT_ADS_CPC") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid amount.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            const amount = parseFloat(message.text).toFixed(4)
            const ads_id = localStore[from.id]["ads_id"]
            const ads = await adsCollection.findOne({ _id: ads_id })
            if (isNaN(amount) || amount <= ads.cpc) {
                const text = `<b><i>❌ CPC should be greater than $${ads.cpc.toFixed(4)}.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            answerCallback[from.id] = null
            await adsCollection.updateOne({ _id: ads_id }, { $set: { cpc: amount } })
            const text = `<b><i>✅ Ad cpc updated!</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content,
                reply_markup: {
                    keyboard: keyList.myAdsKey,
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (waitfor === "EDIT_ADS_BUDGET") {
        try {
            if (!message.text) {
                const text = `<b><i>❌ Looks like invalid budget.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            const amount = parseFloat(message.text).toFixed(4)
            if (isNaN(amount) || amount <= 0) {
                const text = `<b><i>❌ Budget should be greater than 0.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            const user = await userCollection.findOne({ _id: from.id })
            if (amount > user.balance.balance) {
                const text = `<b><i>❌ You don't have enough balance.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            const ads_id = localStore[from.id]["ads_id"]
            answerCallback[from.id] = null
            await adsCollection.updateOne({ _id: ads_id }, { $inc: { budget: amount, remaining_budget: amount } })
            const text = `<b><i>✅ Ad budget updated!</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content,
                reply_markup: {
                    keyboard: keyList.myAdsKey,
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return console.log(err.message)
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
                    protect_content: protect_content
                })
            }
            if (ads.completed.includes(from.id) || ads.skip.includes(from.id)) {
                const text = `<b><i>❌ You've already completed/skipped</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            if (!forward || forward.username != ads.username) {
                const text = `<b><i>🛰️ Forward a message from <a href='${ads.link}'>@${ads.username}</a></i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            const currentTime = Math.floor(new Date().getTime() / 1000)
            if (currentTime - forward_date > 30) {
                const text = `<b><i>❌ The message you forwarded is too old.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            if (ads.remaining_budget < ads.cpc) {
                await adsCollection.updateOne({ _id: ads_id }, { $set: { status: false } })
                const text = `<b><i>❌ Task paused due to insufficient budget</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            const earn = (ads.cpc * settings.GIVEAWAY).toFixed(4)
            const commission = ( earn * settings.REF.INCOME.TASK ).toFixed(4)
            await adsCollection.updateOne({ _id: ads_id },{$inc: {remaining_budget: -(ads.cpc)}, $addToSet:{completed: from.id}})
            const user = await userCollection.findOneAndReplace({ _id: from.id }, { $inc: { "balance.withdrawable": earn } })
            await userCollection.updateOne({ _id: user.invited_by }, { $inc: { "balance.withdrawable": commission } })
            const text = `<b><i>✅ Task completed, you've received +$${earn}</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content,
                reply_markup: {
                    keyboard: keyList.teleKey,
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    // balance related

    if (waitfor === "CONVERT_BALANCE") {
        try {
            const user = await userCollection.findOne({ _id: from.id })
            const amount = parseFloat(message.text).toFixed(4)
            if (amount < 0 || amount > user.balance.withdrawable) {
                const text = `<b><i>❌ Amount should be greater than 0 and less than or equal to $${user.balance.withdrawable.toFixed(4)}</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content,
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
                protect_content: protect_content,
                reply_markup: {
                    keyboard: keyList.balanceKey,
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return console.log(err.message)
        }
    }

    if (waitfor === "PAY_WITH_CRYPTO") {
        try {
            if (!message.text || isNaN(message.text)) {
                const text = `<b><i>❌ Invalid amount!</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            const amount = parseFloat(message.text).toFixed(4)
            if (amount < settings.PAYMENT.MIN.DEPOSIT) {
                const text = `<b><i>❌ Minimum deposit $${settings.PAYMENT.MIN.DEPOSIT.toFixed(4)}</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content
                })
            }
            answerCallback[from.id] = null
            const CALLBACK_URL = `${process.env.SERVER}/payments/callback`
            const orderid = createOrderId()
            const { payLink } = await createPaymentLink(from.id, amount, CALLBACK_URL, orderid)
            if (!payLink) {
                const text = `<b><i>❌ We can't generate a payment link.</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    protect_content: protect_content,

                })
            }
            await api.sendMessage(from.id, `<b><i>⌛ Generating payment link...</i></b>`, {
                parse_mode: "HTML",
                protect_content: protect_content,
                reply_markup: {
                    keyboard: keyList.balanceKey,
                    resize_keyboard: true
                }
            })
            const text = `<b><i><code>🆔 #${orderid}</code>\n\n💵 Amount: $${amount}\n⌛ Expire in 30 minutes</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "PAY NOW", url: payLink}
                        ]
                    ]
                }
            })
        } catch (err) {
            return console.log(err.message)
        }
    }
})