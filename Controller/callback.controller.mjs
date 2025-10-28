import moment from "moment";
import api from "../Config/Telegram.mjs";
import nodeCron from "node-cron"
import { settings } from "../Config/appConfig.mjs";
import { adsCollection } from "../Models/ads.model.mjs";
import { pendingMicroCollection } from "../Models/microTask.model.mjs";
import { userCollection } from "../Models/user.model.mjs";
import { adsText, answerCallback, balance_key, getFaq, getRefMessage, inlineKeys, isUserBanned, keyList, localStore, messageStat, sendMessageToTaskChannel, userMention } from "../Utils/tele.mjs";
import { deletedAdsModel } from "../Models/deleted_ads.model.mjs";
import { paymentCollection } from "../Models/payment.model.mjs";

api.on("callback_query", async callback => {
    if (callback.message.chat.type != "private") return;
    const data = callback.data
    const params = data.split(" ")
    const command = params[0]
    params.shift()
    const from = callback.from
    const userStatusCheck = await isUserBanned(from.id)
    if(userStatusCheck) return
    if(!localStore[from.id]) localStore[from.id] = {}

    // payments

    if (command === "/balance") {
        try {
            const user = await userCollection.findOne({ _id: from.id })
            answerCallback[from.id] = null
            // const text = `<b>👤 ${userMention(from.id, from.username, from.first_name)}\n\n💵 Available Balance:   $${user.balance.balance.toFixed(6)}\n\n🏆 Withdrawable: $${user.balance.withdrawable.toFixed(6)}\n💳 Total Deposits:     $${user.balance.deposits.toFixed(6)}\n\n🎁 Referral Amount:    $${user.balance.referral.toFixed(6)}\n💸 Total Payouts:    $${user.balance.payouts.toFixed(6)}\n\n💶 Total Earned: $${user.balance.earned.toFixed(6)}</b>`
            const text = `<b><u>🏦 Balance Snapshot</u>\n\n💶 Main Balance: <code>${user.balance.withdrawable.toFixed(6)}</code> ${settings.CURRENCY}\n📉 Ads Balance: <code>${user.balance.balance.toFixed(6)}</code> ${settings.CURRENCY}</b>\n\n💰 You can convert main balance into ads balance.`
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    inline_keyboard: balance_key
                }
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (command === "/convert_balance") {
        try {
            const [response] = params
            const user = await userCollection.findOne({ _id: from.id })
            if (response == "no") {
                const text = `<b>❌ Conversion cancelled.\n\nNo funds were transferred. You can try again later.</b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                    protect_content: settings.PROTECTED_CONTENT,
                    reply_markup: {
                        inline_keyboard: [[{ text: "🔙 Back", callback_data: "/balance" }]]
                    }
                })
            }
            if (response == "yes") {
                const amt = user.balance.withdrawable
                user.balance.balance += user.balance.withdrawable
                user.balance.withdrawable = 0
                await user.save()
                const text = `<b>✅ Conversion successful.\n\nYou’ve successfully converted <code>${amt.toFixed(6)}</code> ${settings.CURRENCY} from your main balance to your ads balance.\n\nYour ads balance is now <code>${user.balance.balance.toFixed(6)}</code> ${settings.CURRENCY}.</b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                    protect_content: settings.PROTECTED_CONTENT,
                    reply_markup: {
                        inline_keyboard: [[{ text: "🔙 Back", callback_data: "/balance" }]]
                    }
                })
            }
            if (user.balance.withdrawable <= 0) {
                return await api.answerCallbackQuery(callback.id, {
                    text: "<b>❌ You don't have any balance to convert.</b>",
                    show_alert: true
                })
            }
            const amount = user.balance.withdrawable;
            const text = `<b>🔄 Convert to Ads Balance\n\nYou’re about to convert <code>${amount.toFixed(6)}</code> ${settings.CURRENCY} from your main balance to your ads balance.\n\nWould you like to proceed with this conversion?</b>`;
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ Yes", callback_data: "/convert_balance yes" },
                            { text: "❌ No", callback_data: "/convert_balance no" }
                        ], [
                            {text: "🔙 Back", callback_data: "/balance"}
                        ]
                    ]
                }
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (command === "/deposit") {
        try {
            const text = `<b><i>📥 Choose your payment method!</i></b>`
            const key = [
                [
                    { text: "OxaPay", callback_data: "/pay OxaPay" }
                ], [
                    { text: "🔙 Back", callback_data: "/balance" }
                ]
            ]
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    inline_keyboard: key
                }
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (command === "/withdraw") {
        try {
            const user = await userCollection.findOne({ _id: from.id })
            if (user.balance.withdrawable < settings.PAYMENT.MIN.WITHDRAW) {
                const text = `❌ Minimum withdrawal is ${settings.PAYMENT.MIN.WITHDRAW.toFixed(6)} ${settings.CURRENCY}`
                return await api.answerCallbackQuery(callback.id, {
                    text,
                    show_alert: true
                })
            }
            const text = `<b><i>💵 Enter the amount you want to withdraw</i></b>`
            answerCallback[from.id] = "PAYOUT_AMOUNT"
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: [
                        ["🔴 Cancel"]
                    ],
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (command === "/pay") {
        try{
            const [method] = params
            let text;
            if (method == "OxaPay") {
                text = `<b><i>💷 Enter the amount in ${settings.CURRENCY} you want to deposit!</i></b>`
                answerCallback[from.id] = "PAY_WITH_OXAPAY"
            }
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: [
                        ["🔴 Cancel"]
                    ],
                    resize_keyboard: true
                }
            })
        }catch(err){
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (command === "/history") {
        try {
            let text = `<b><i>📃 Here you can see the latest 10 Pending & Completed transaction history</i></b>`
            const history = await paymentCollection.find({ user_id: from.id }).sort({ createdAt: -1 }).limit(10)
            if (history.length == 0) {
                text += `\n\n<b><i>💫 No Transaction Found!</i></b>`
            }
            history.forEach(item => {
                if ((item.status == "Paying" || item.status == "Paid") && (item.type == "payment" || item.type == "invoice")) {
                    text += `\n\n<b><i>${item.status == "Paying" ? "⌛" : "✅"} Status: ${item.status}\n🛰️ Type: Deposit\n💷 Amount: ${item.amount.toFixed(6)} ${settings.CURRENCY}\n🆔 TrackID: ${item.trackId}</i></b>`
                }
                if (item.type == "payout") {
                    text += `\n\n<b><i>${item.status == "Confirming" ? "⌛" : "✅"} Status: ${item.status}\n🛰️ Type: Payout\n💷 Amount: ${item.amount.toFixed(6)} ${settings.CURRENCY}\n🆔 Track ID: ${item.trackId}</i></b>`
                }
            })
            const key = [
                [
                    { text: "🔙 Back", callback_data: "/balance" }
                ]
            ]
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    inline_keyboard: key
                }
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b>❌ Error happened</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    // notification

    if (command === "/notification") {
        try {
            const [notify] = params
            await userCollection.updateOne({ _id: from.id }, { $set: { notification: notify } })
            const user = await userCollection.findOne({ _id: from.id })
            const text = `<b>⚙️ Account settings\n\n🆔 Telegram ID: <code>${from.id}</code>\n🛎️ Notification: ${user.notification ? "🔔 On" : "🔕 Off" }\n🔒 Verification Status : ${user.is_verified ? "✅ Verified" : "⛔️ Not Verified"}\n\n📅 Since: ${new Date(user.createdAt).toLocaleString("en-IN").toUpperCase()}</b>`
            return await api.editMessageText(text, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                chat_id: from.id,
                message_id: callback.message.message_id,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: `${user.notification ? `🔕 Turn OFF` : `🔔 Turn ON` } Notification`, callback_data: `/notification ${user.notification ? false : true}` }]
                    ]
                }
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (command === "/faq") {
        try {
            const [index] = params
            const answers = [
                `${settings.BOT.NAME} is a Telegram earning platform where users can complete simple tasks, engage with posts, visit websites, and earn real rewards. You can also run your own ad campaigns to promote your business or projects!`,
                `You can earn through multiple methods: Start Bots — Interact with partner bots; View Posts — Watch sponsored posts or content; Join Chats — Join groups or channels to earn rewards; Micro Tasks — Complete small, easy missions; Visit Sites — Open websites and get paid.`,
                `Invite your friends and earn extra bonuses! ${settings.REF.INCOME.TASK * 100}% of your invitee’s task earnings, ${settings.REF.INCOME.DEPOSIT * 100}% of your invitee’s deposits, and an extra ${settings.REF.PER_REF} ${settings.CURRENCY} for every verified referral. There’s no limit — the more you invite, the more you earn!`,
                `Yes! You can create ad campaigns to promote bots, groups, websites, or tasks. Reach real users who engage with your content.`,
                `You can withdraw through Oxapay or any other crypto wallet — a fast and secure crypto payment gateway.`,
                `Rewards are added instantly after task completion. Referral and deposit bonuses update automatically.`,
                `If you face any issue, reach out to Support or check our Official Channel for updates.`
            ]
            const text = `<b><i>${callback.message.reply_markup.inline_keyboard[index][0].text}\n\n${answers[index]}</i></b>`
            return await api.editMessageText(text, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                chat_id: from.id,
                message_id: callback.message.message_id,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔙 Back", callback_data: "/faq_home" }]
                    ]
                }
            })
        } catch (err) {
            console.log(err)
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if(command === "/faq_home"){
        const { text, key } = getFaq()
        return await api.editMessageText(text, {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            chat_id: from.id,
            message_id: callback.message.message_id,
            reply_markup: {
                inline_keyboard: key
            }
        })
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
                    parse_mode: "HTML",
                    disable_web_page_preview: true
                }) 
            }
            await adsCollection.updateOne({ _id: ads_id },{ $addToSet:{ skip: from.id } })
            const text = `<b><i>⏭️ Task has been skipped</i></b>`
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML",
                disable_web_page_preview: true
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
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
                    parse_mode: "HTML",
                    disable_web_page_preview: true
                })
            }
            if (ads.skip.includes(from.id)) {
                const text = `<b><i>❌ Task already skipped</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML",
                    disable_web_page_preview: true
                }) 
            }
            if (ads.completed.includes(from.id)) {
                const text = `<b><i>❌ Task already completed</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML",
                    disable_web_page_preview: true
                }) 
            }
            if (ads.remaining_budget < ads.cpc) {
                await adsCollection.updateOne({ _id: ads_id }, { $set: { status: false } })
                const text = `<b><i>❌ Task paused due to insufficient budget</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML",
                    disable_web_page_preview: true
                }) 
            }
            localStore[from.id]["ads_id"] = ads_id
            answerCallback[from.id] = "STARTED_BOT"
            const text = `<b><i>🛰️ Forward a message from <a href='${ads.link}'>@${ads.username}</a></i></b>`
            await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: [
                        ["⛔ Cancel"]
                    ],
                    resize_keyboard: true
                }
            })
            return await api.deleteMessage(from.id, callback.message.message_id)
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
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
                    parse_mode: "HTML",
                    disable_web_page_preview: true
                })
            }
            if (ads.skip.includes(from.id)) {
                const text = `<b><i>❌ Task already skipped</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML",
                    disable_web_page_preview: true
                }) 
            }
            if (ads.completed.includes(from.id)) {
                const text = `<b><i>❌ Task already completed</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML",
                    disable_web_page_preview: true
                }) 
            }
            if (ads.remaining_budget < ads.cpc) {
                await adsCollection.updateOne({ _id: ads_id }, { $set: { status: false } })
                const text = `<b><i>❌ Task paused due to insufficient budget</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML",
                    disable_web_page_preview: true
                }) 
            }
            const earn = (ads.cpc * settings.GIVEAWAY).toFixed(6)
            const commission = (earn * settings.REF.INCOME.TASK).toFixed(6)
            const text = `<b><i>✅ Task completed: +${earn}</i></b>`
            await adsCollection.updateOne({ _id: ads_id }, { $inc: { remaining_budget: -(ads.cpc) }, $addToSet: { completed: from.id } })
            const userUpdate = await userCollection.findOneAndUpdate({ _id: from.id }, { $set: { "balance.withdrawable": earn, "balance.earned": earn } })
            await userCollection.updateOne({ _id: userUpdate.invited_by }, { $set: { "balance.withdrawable": commission, "balance.referral": commission, "balance.earned": commission } })
            sendMessageToTaskChannel(ads_id, from.id, from.username, from.first_name, "VIEW POST", earn)
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML",
                disable_web_page_preview: true
            }) 
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
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
                    parse_mode: "HTML",
                    disable_web_page_preview: true
                })
            }
            if (ads.skip.includes(from.id)) {
                const text = `<b><i>❌ Task already skipped</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML",
                    disable_web_page_preview: true
                }) 
            }
            if (ads.completed.includes(from.id)) {
                const text = `<b><i>❌ Task already completed</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML",
                    disable_web_page_preview: true
                }) 
            }
            if (ads.remaining_budget < ads.cpc) {
                await adsCollection.updateOne({ _id: ads_id }, { $set: { status: false } })
                const text = `<b><i>❌ Task paused due to insufficient budget</i></b>`
                return await api.editMessageText(text, {
                    chat_id: from.id,
                    message_id: callback.message.message_id,
                    parse_mode: "HTML",
                    disable_web_page_preview: true
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
            const earn = (ads.cpc * settings.GIVEAWAY).toFixed(6)
            const commission = (earn * settings.REF.INCOME.TASK).toFixed(6)
            const text = `<b><i>✅ Task completed: +${earn}</i></b>`
            await adsCollection.updateOne({ _id: ads_id }, { $inc: { remaining_budget: -(ads.cpc) }, $addToSet: { completed: from.id } })
            const userUpdate = await userCollection.findOneAndUpdate({ _id: from.id }, { $set: { "balance.withdrawable": earn, "balance.earned": earn } })
            await userCollection.updateOne({ _id: userUpdate.invited_by }, { $set: { "balance.withdrawable": commission, "balance.referral": commission, "balance.earned": commission } })
            sendMessageToTaskChannel(ads_id, from.id, from.username, from.first_name, "CHAT JOIN", earn)
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML",
                disable_web_page_preview: true
            }) 
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
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
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: inlineKeys.adsManageKey(ads)
                },
                disable_web_page_preview: true
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
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
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: inlineKeys.confirmDelete(ads_id)
                }
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (command === "/cancel_delete_ad") {
        try {
            const text = `<b><i>✖️ Process cancelled!</i></b>`
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML",
                disable_web_page_preview: true
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
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
                    parse_mode: "HTML",
                    disable_web_page_preview: true
                })
            }
            await deletedAdsModel.create(ads.toObject())
            await adsCollection.deleteOne({ _id: ads_id })
            const refund = ads.remaining_budget.toFixed(6)
            let text = `<b><i>❌ CampaignID: #${ads_id} has been deleted!</i></b>`
            if (refund > 0) {
                await userCollection.updateOne({ _id: from.id }, { $inc: { "balance.balance": refund } })
                text += `<b><i>\n\n✅ Re-fund: +${refund} ${settings.CURRENCY}</i></b>`
            }
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML",
                disable_web_page_preview: true
            })
        } catch (err) {
            console.log(err)
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
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
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: [
                        ["🔴 Cancel"]
                    ],
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
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
                    parse_mode: "HTML",
                    disable_web_page_preview: true
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
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: key
                }
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    // show micro proof

    if (command === "/see_micro_proof") {
        try {
            const [proof_id, done_by] = params
            return await api.copyMessage(from.id, done_by, proof_id, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
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
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: [
                        ["✖️ Cancel"]
                    ],
                    resize_keyboard: true
                }
            })
            return await api.deleteMessage(from.id, callback.message.message_id)
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
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
                    disable_web_page_preview: true,
                    protect_content: settings.PROTECTED_CONTENT,
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
                disable_web_page_preview: true,
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
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
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
                    parse_mode: "HTML",
                    disable_web_page_preview: true
                })
            }
            const response = await pendingMicroCollection.updateOne({ _id: list_id }, { $set: { status: "completed" } })
            const earn = (pendingTask.cpc * settings.GIVEAWAY).toFixed(6)
            if (response.matchedCount == 1 && response.modifiedCount == 1) {
                const commission = (earn * settings.REF.INCOME.TASK).toFixed(6)
                const updateUser = await userCollection.findOneAndUpdate({ _id: pendingTask.done_by }, { $inc: { "balance.withdrawable": earn, "balance.earned": earn } })
                await userCollection.updateOne({ _id: updateUser.invited_by }, { $inc: { "balance.withdrawable": commission, "balance.referral": commission, "balance.earned": commission } })
            }
            const text = `<b><i>✅ You micro task response [#${pendingTask.campaign_id}] has been approved by advertiser.\n🎁 Earned: +${earn} ${settings.CURRENCY}</i></b>`
            await api.editMessageText(`<b><i>✅ The response [#${pendingTask.campaign_id}] has been approved.</i></b>`, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML",
                disable_web_page_preview: true
            })
            sendMessageToTaskChannel(pendingTask.campaign_id, pendingTask.done_by, pendingTask.done_by_username, pendingTask.done_by_first_name, "MICRO TASK", earn)
            return await api.sendMessage(pendingTask.done_by, text, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
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
                    disable_web_page_preview: true,
                    protect_content: settings.PROTECTED_CONTENT,
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
                    disable_web_page_preview: true,
                    protect_content: settings.PROTECTED_CONTENT,
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
                const text = `<b><i>💷 Enter the cost per click.\n\n💰 Minimum: ${response.cpc.toFixed(6)} ${settings.CURRENCY}</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                    protect_content: settings.PROTECTED_CONTENT,
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
                const text = `<b><i>💷 Enter the budget for the ad.\n\n💰 Remaining Budget: ${response.remaining_budget.toFixed(6)} ${settings.CURRENCY}</i></b>`
                return await api.sendMessage(from.id, text, {
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                    protect_content: settings.PROTECTED_CONTENT,
                    reply_markup: {
                        keyboard: [
                            ["✖️ Cancel"]
                        ],
                        resize_keyboard: true
                    }
                })
            }
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    // view post

    if (command === "/view_post") {
        try {
            const [post] = params
            return await api.copyMessage(from.id, from.id, post, {
                protect_content: settings.PROTECTED_CONTENT
            })
        } catch (err) {
            return await api.sendMessage(from.id, "<b><i>❌ Post not found!</i></b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (command === "/ref_stat_display") {
        try {
            const user = await userCollection.findOne({ _id: from.id })
            const stats = await userCollection.aggregate([
                {
                    $match: {
                        invited_by: from.id
                    }
                }, {
                    $group: {
                        _id: null,
                        total_invited: { $sum: 1 },
                        verified: { $sum: { $cond: [{ $eq: ["$is_verified", true] }, 1, 0] } },
                        banned: { $sum: { $cond: [{ $eq: ["$banned", true] }, 1, 0] } },
                        blocked_bot: { $sum: { $cond: [{ $eq: ["$blocked_bot", true] }, 1, 0] } },
                    }
                }
            ])
            if (!isNaN(stats?.[0]?.total_invited) && stats?.[0]?.total_invited > user.invites) {
                user.invites = stats[0]?.total_invited
            }
            const text = `<b>📈 Your Referral Stats\n\n━━━━━━━━━━━━━━━━━━━━\n👤 Total Invites: ${stats[0]?.total_invited || 0}\n✅ Verified Users: ${stats[0]?.verified || 0}\n🚫 Blocked Accounts: ${stats[0]?.blocked_bot || 0}\n🔴 Banned Accounts: ${stats[0]?.banned || 0}\n━━━━━━━━━━━━━━━━━━━━\n\n💵 Total Earned: ${user.balance.earned.toFixed(6)} ${settings.CURRENCY}\n\n✨ Keep spreading the word and watch your earnings grow! 🚀</b>`
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔙 Back", callback_data: "/referral_msg" }]
                    ]
                }
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (command === "/referral_msg") {
        try {
            const ref = getRefMessage(from.id)
            return await api.editMessageText(ref.text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    inline_keyboard: ref.key
                }
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (command === "/leaderboard") {
        try {
            const data = await userCollection.aggregate([
                {
                    $match: {
                        invited_by: { $ne: settings.ADMIN.ID }
                    }
                },{
                    $group: {
                        _id: "$invited_by",
                        verified_ref: {
                            $sum: { $cond: ["$is_verified", 1, 0] }
                        }
                    }
                }, {
                    $lookup: {
                        from: "users",
                        localField: "_id",
                        foreignField: "_id",
                        as: "user"
                    }
                }, {
                    $limit: 15
                }, {
                    $sort: {
                        verified_ref: -1
                    }
                }
            ])
            const info = data.map(user => ({
                id: user._id,
                name: user.user[0]?.first_name,
                username: user.user[0]?.username,
                verified_ref: user.verified_ref
            }))
            const nos = ["🥇","🥈","🥉"]
            const text = `<b>🏆 Referral Leaderboard (Top 15)\n📅 Duration: <code>October 25 – November 25, 2025</code>\n\n${info.map((user, index) => `${nos[index] ? `${nos[index]}` : (index + 1) < 10 ? `#0${index + 1}` : `#${index + 1}`}. ${userMention(user.id, user.username, user.name)} - ${user.verified_ref} Referrals`).join("\n")}\n\n🏆 20.00 ${settings.CURRENCY} reward split for top 3!\n🥇 10.00  ${settings.CURRENCY} | 🥈 6.00  ${settings.CURRENCY} | 🥉 4.00  ${settings.CURRENCY}\n\n🏆 Winners get rewards within 24 hrs!\n🔥 Keep referring to win more!</b>`
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "🔙 Back", callback_data: "/referral_msg" }]
                    ]
                }
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }


    // admin section

    if (command === "/admin_ad_notify") {
        try {
            const is_running = settings.AD_NOTIFY_RUNNING
            if (is_running) return await api.answerCallbackQuery(callback.id, {
                text: "🚫 Ads notify is already running!",
                show_alert: true
            })
            await api.answerCallbackQuery(callback.id, {
                text: "✅ Ads notify is running!",
                show_alert: true
            })
            settings.AD_NOTIFY_RUNNING = true
            const users = await userCollection.find({ blocked_bot: false, notification: true, banned: false });
            const cronTask = nodeCron.schedule("*/2 * * * * *", async () => {
                const [userInfo] = users.splice(0, 1)
                if (userInfo) {
                    try {
                        const getText = count => {
                            return `<b>✅ New task available\n\n❓ We found ${count} new tasks available for you today!\n\nYou can disable this notification in settings.</b>`
                        }
                        const total_ads_available = await adsCollection.countDocuments({ chat_id: { $ne: userInfo._id }, completed: { $nin: [userInfo._id] }, skip: { $nin: [userInfo._id] }, status: true })
                        if (total_ads_available <= 0) return;
                        await api.sendMessage(userInfo._id, getText(total_ads_available), {
                            parse_mode: "HTML",
                            disable_web_page_preview: true,
                            protect_content: settings.PROTECTED_CONTENT
                        })
                    } catch (err) {
                        await userCollection.updateOne({ _id: userInfo._id }, { $set: { blocked_bot: true } })
                    }
                } else {
                    await api.sendMessage(from.id, `<b><i>✅ Ads Notify Completed</i></b>`, {
                        parse_mode: "HTML",
                        disable_web_page_preview: true,
                        protect_content: settings.PROTECTED_CONTENT,
                    })
                    cronTask.stop()
                    settings.AD_NOTIFY_RUNNING = false
                }
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
        
    }

    if (command === "/admin_protected_content") {
        try {
            settings.PROTECTED_CONTENT = !settings.PROTECTED_CONTENT
            const key = callback.message.reply_markup.inline_keyboard
            key.shift()
            key.unshift([{ text: `Protected Content: ${settings.PROTECTED_CONTENT ? "✅ Enabled" : "❌ Disabled"}`, callback_data: `/admin_protected_content` }])
            return await api.editMessageReplyMarkup({
                inline_keyboard: key
            }, {
                chat_id: from.id,
                message_id: callback.message.message_id
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (command === "/admin_ban_user") {
        try {
            const text = `<b><i>🎯 Enter the targeted userId to ban.</i></b>`
            answerCallback[from.id] = "ADMIN_BAN_USER"
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: [
                        ["🔴 Cancel"]
                    ],
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (command === "/admin_unban_user") {
        try {
            const text = `<b><i>🎯 Enter the targeted userId to ban.</i></b>`
            answerCallback[from.id] = "ADMIN_UNBAN_USER"
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: [
                        ["🔴 Cancel"]
                    ],
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
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
                        earned: { $sum: "$balance.earned" },
                        balance: { $sum: "$balance.balance" },
                        referral: { $sum: "$balance.referral" },
                        payouts: { $sum: "$balance.payouts" },
                    }
                }
            ])
            text += `<b><i>\n\nUsers: ${users?.[0]?.count}\nBanned: ${users?.[0]?.banned}\nVerified: ${users?.[0]?.verified}\n\nBalance: ${users?.[0]?.balance?.toFixed(6)} ${settings.CURRENCY}\nWithdrawable: ${users?.[0]?.withdrawable?.toFixed(6)} ${settings.CURRENCY}\nReferral: ${users?.[0]?.referral?.toFixed(6)} ${settings.CURRENCY}\nPayouts: ${users?.[0]?.payouts?.toFixed(6)} ${settings.CURRENCY}\nEarned: ${users?.[0]?.earned?.toFixed(6)} ${settings.CURRENCY}</i></b>`
            return await api.editMessageText(text, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                chat_id: from.id,
                message_id: callback.message.message_id
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (command === "/admin_mailing") {
        try {
            const text = "<b><i>📨 Create or forward a message to mail to users</i></b>"
            answerCallback[from.id] = "ADMIN_MAILING"
            return api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: [
                        ["🔴 Cancel"]
                    ],
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (command === "/admin_cancel_mail") {
        try {
            const text = "<b><i>✖️ Mailing has been cancelled!</i></b>"
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML",
                disable_web_page_preview: true
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (command === "/admin_send_mail") {
        try {
            const [message_id] = params
            const text = "<b><i>✅ Mailing started...</i></b>"
            const users = await userCollection.find({ blocked_bot: false });
            const totalUsers = users.length
            messageStat.sent = 0
            messageStat.failed = 0
            messageStat.success = 0
            await api.deleteMessage(from.id, callback.message.message_id)
            await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    keyboard: keyList.mainKey,
                    resize_keyboard: true
                }
            })
            const cronTask = nodeCron.schedule("*/2 * * * * *", async () => {
                const [userInfo] = users.splice(0, 1)
                if (userInfo) {
                    try {
                        await api.copyMessage(userInfo._id, from.id, message_id, {
                            parse_mode: "HTML",
                            disable_web_page_preview: true,
                            protect_content: settings.PROTECTED_CONTENT
                        })
                        messageStat.success++
                        messageStat.sent++
                    } catch (err) {
                        await userCollection.updateOne({ _id: userInfo._id }, { $set: { blocked_bot: true } })
                        messageStat.failed++
                        messageStat.sent++
                    }
                
                    if (messageStat.sent != 0 && messageStat.sent % 100 == 0) {
                        await api.sendMessage(from.id, `<b><i>✅ Mail Status: ${JSON.stringify(messageStat)}</i></b>`, {
                            parse_mode: "HTML",
                            disable_web_page_preview: true,
                            protect_content: settings.PROTECTED_CONTENT,
                        })
                    }
                    if (messageStat.sent === totalUsers) {
                        cronTask.stop()
                        await api.sendMessage(from.id, `<b><i>✅ Mail Completed: ${JSON.stringify(messageStat)}</i></b>`, {
                            parse_mode: "HTML",
                            disable_web_page_preview: true,
                            protect_content: settings.PROTECTED_CONTENT,
                        })
                    }
                } else {
                    cronTask.stop()
                }
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (command === "/admin_add_balance") {
        try {
            const key = [
                [
                    { text: "💶 Balance", callback_data: "/admin_add_balance_to balance" },
                    { text: "💷 Deposits", callback_data: "/admin_add_balance_to deposits" }
                ], [
                    { text: "💰 Withdrawable", callback_data: "/admin_add_balance_to withdrawable" },
                    { text: "🏧 Payouts", callback_data: "/admin_add_balance_to payouts" }
                ]
            ]
            const text = `🛰️ <i>Select the type you want to add balance</i>`
            return await api.editMessageText(text, {
                chat_id: from.id,
                message_id: callback.message.message_id,
                parse_mode: "HTML",
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: key
                }
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

    if (command === "/admin_add_balance_to") {
        try {
            const type = params[0]
            const text = `<i>🆔 Enter the user Telegram ID:</i>`
            localStore[from.id]["balance_add_to"] = type
            answerCallback[from.id] = "ADMIN_USER_ID_FOR_ADD_BALANCE"
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: true,
                reply_markup: {
                    keyboard: [["🔴 Cancel"]],
                    resize_keyboard: true
                }
            })
        } catch (err) {
            return api.sendMessage(from.id, "<b>❌ Error happend</b>", {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }
    }

})