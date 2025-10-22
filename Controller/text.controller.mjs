import api from "../Config/Telegram.mjs";
import { settings } from "../Config/appConfig.mjs";
import { adsCollection } from "../Models/ads.model.mjs";
import { paymentCollection } from "../Models/payment.model.mjs";
import { userCollection } from "../Models/user.model.mjs";
import { adsText, answerCallback, inlineKeys, invited_user, isUserBanned, keyList, listedKey, protect_content, showAdsText, userMention } from "../Utils/tele.mjs";

// start message

api.on("polling_error", () => {})

api.onText(/^\/start(?: (.+))?$|^🔙 Home$|^🔴 Cancel$/, async (message, match) => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        answerCallback[from.id] = null
        const user = await userCollection.findOne({ _id: from.id })
        if (!user) {
            invited_user[from.id] = match[1] || settings.ADMIN.ID
            if (invited_user[from.id] != settings.ADMIN.ID) {
                if (isNaN(invited_user[from.id]) || invited_user[from.id] == from.id) {
                    invited_user[from.id] = settings.ADMIN.ID
                }
                const validateInviter = await userCollection.findOne({ _id: invited_user[from.id] })
                if (!validateInviter) {
                    invited_user[from.id] = settings.ADMIN.ID
                }
            }
            const createdUser = await userCollection.create({
                _id: from.id,
                first_name: from.first_name,
                last_name: from.last_name,
                username: from.username,
                invited_by: invited_user[from.id]
            })
            if (createdUser?._id) {
                await userCollection.updateOne({ _id: createdUser.invited_by },{$inc:{invites: 1}})
                const userCount = await userCollection.countDocuments()
                const txt = `<b>🦉 Users: <code>${userCount}</code>\n🚀 UserName: ${userMention(from.id, from.username, from.first_name)}\n🆔 UserID: <code>${from.id}</code>\n☄️ InvitedBy: <code>${invited_user[from.id] == settings.ADMIN.ID ? `You` : `${invited_user[from.id]}`}</code></b>` 
                await api.sendMessage(settings.ADMIN.ID, txt, {
                    parse_mode: "HTML"
                })
            }
        }
        if(userStatusCheck) return
        const text = `<b><i>🚀 Welcome to ${settings.BOT.NAME}\n\nThis bot allows you to earn by completing simple tasks.\n\nYou can also create your own ads with /advertise</i></b>`
        return await api.sendMessage(from.id, text, { 
            parse_mode: "HTML",
            protect_content: protect_content,
            reply_markup: {
                keyboard: keyList.mainKey,
                resize_keyboard: true
            }
        })
    } catch (err) {
        return console.log(err.message)
    }
})

// other buttons

api.onText(/^💷 Balance$|^🚫 Cancel$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        const user = await userCollection.findOne({ _id: from.id })
        answerCallback[from.id] = null
        const text = `<b>👤 ${userMention(from.id, from.username, from.first_name)}\n\n🏆 Withdrawable: $${user.balance.withdrawable.toFixed(2)}\n\n💵 Available Balance:   $${user.balance.balance.toFixed(2)}\n💳 Total Deposits:     $${user.balance.deposits.toFixed(2)}\n\n🎁 Referral Amount:    $${user.balance.referral.toFixed(2)}\n💸 Total Payouts:    $${user.balance.payouts.toFixed(2)}\n\n💶 Total Earned: $${user.balance.earned.toFixed(2)}</b>`
        return await api.sendMessage(from.id, text, {
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
})

api.onText(/^➕ Deposit$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        const text = `<b><i>📥 Choose your payment method!</i></b>`
        const key = [
            [
                { text: "PAY WITH CRYPTO", callback_data: "/pay CRYPTO" }
            ]
        ]
        return await api.sendMessage(from.id, text, {
            parse_mode: "HTML",
            protect_content: protect_content,
            reply_markup: {
                inline_keyboard: key
            }
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/^➖ Payout$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        const user = await userCollection.findOne({ _id: from.id })
        if (user.balance.withdrawable < settings.PAYMENT.MIN.WITHDRAW) {
            const text = `<b><i>❌ Minimum withdrawal is $${settings.PAYMENT.MIN.WITHDRAW.toFixed(4)}</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content
            })
        }
        const text = `<b><i>💵 Enter the amount you want to withdraw</i></b>`
        answerCallback[from.id] = "PAYOUT_AMOUNT"
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
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/^🔄 Convert$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        const text = `<b><i>🔄 Convert withdrawable to balance</i></b>`
        answerCallback[from.id] = "CONVERT_BALANCE"
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
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/^📃 History$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        let text = `<b><i>📃 Here you can see the latest 10 waiting, pending, completed transaction history</i></b>`
        const history = await paymentCollection.find({ user_id: from.id }).sort({ createdAt: -1 }).limit(10)
        if (history.length == 0) {
            text += `\n\n<b><i>💫 No Transaction Found!</i></b>`
        }
        history.forEach(item => {
            if (item.status == "Waiting" && item.type == "payment") {
                text += `\n\n<b><i>⌚ Status: ${item.status}  [<a href='https://oxapay.com/mpay/${item.trackId}'>Pay Now</a>]\n🛰️ Type: Deposit\n💷 Amount: $${item.amount.toFixed(4)}\n🆔 OrderID: ${item.orderId}</i></b>`   
            }
            if ((item.status == "Confirming" || item.status == "Paid") && item.type == "payment") {
                text += `\n\n<b><i>${item.status == "Confirming"?"🤔":"✅"} Status: ${item.status}\n🛰️ Type: Deposit\n💷 Amount: ${item.payAmount.toFixed(4)} ${item.currency}\n🆔 txID: ${item.txID}</i></b>`   
            }
            if (item.type == "payout") {
                text += `\n\n<b><i>${item.status=="Confirming"?"🤔":"✅"} Status: ${item.status}\n🛰️ Type: Payout\n💷 Amount: $${item.amount.toFixed(4)}\n🆔 txID: ${item.txID}</i></b>`   
            }
        })
        return await api.sendMessage(from.id, text, {
            parse_mode: "HTML",
            protect_content: protect_content
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/^👭 Referrals$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        const user = await userCollection.findOne({_id: from.id})
        const text = `<b><i>👭 You have total : ${user.invites} Referrals\n\n💸 Total Earned : $${user.balance.referral.toFixed(4)}\n\n🔗 Your Referral Link : https://t.me/${settings.BOT.USERNAME}?start=${from.id}\n\n🎉 You will earn 10% of each user"s earnings from tasks, and 10% of USD they deposit in bot. Share your refer link and earn money ✅</i></b>`
        return await api.sendMessage(from.id, text, {
            parse_mode: "HTML",
            protect_content: protect_content,
            disable_web_page_preview: true
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/^⚙️ Settings$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        const user = await userCollection.findOne({_id: from.id})
        const text = `<b><i>🛎️ Notification: ${ user.notification ? "✅" : "❌" }\n\n📅 Since: ${new Date(user.createdAt).toLocaleString("en-IN")}</i></b>`
        return await api.sendMessage(from.id, text, {
            parse_mode: "HTML",
            protect_content: protect_content,
            reply_markup: {
                inline_keyboard: [
                    [{ text: `${user.notification ? `🔕 Turn OFF` : `🔔 Turn ON` } Notification`, callback_data: `/notification ${user.notification ? false : true}` }]
                ]
            }
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/^⁉️ info$/, async message => {
    try {
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        const totalUsers = await userCollection.countDocuments()
        const text = `<b><i>🤖 ${settings.BOT.NAME} - ${settings.BOT.VERSION}\n\n🎯 Introducing ${settings.BOT.NAME} – your all-in-one marketplace for promoting Telegram bots, chats/channels, websites, and engaging in micro tasks, including viewing posts!\n\n🛰️ With ${settings.BOT.NAME}, users can effortlessly promote their Telegram creations and websites to a vast audience, attracting potential followers and customers. Whether you're a bot developer, a chat/channel administrator, or a website owner, this platform offers a seamless solution for enhancing visibility and driving engagement.\n\n🪐 But that's not all! In addition to promoting content, users can explore a wide range of micro tasks, from liking posts to subscribing to channels. Plus, with the ability to view posts, users can interact with content while earning rewards for their engagement.\n\n🚁 Join our dynamic community of promoters and task participants today, and discover the endless possibilities with ${settings.BOT.NAME}!\n\n👥 Users: ${totalUsers}\n\n💬 Community Chat: @${settings.CHAT.USERNAME}</i></b>`
        return await api.sendMessage(from.id, text, {
            parse_mode: "HTML",
            protect_content: protect_content
        })
    } catch (err) {
        return console.log(err.message)
    }
})

// micro task

api.onText(/^🎯 Micro Task$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        await adsCollection.updateMany({ $expr: { $lt: [ "$remaining_budget", "$cpc" ] } }, { $set: { status: false } })
        let ads = await adsCollection.findOne({
            type: "MICRO",
            chat_id: {
                $ne: from.id
            },
            completed: {
                $nin: [from.id]
            },
            skip: {
                $nin: [from.id]
            },
            status: true
        })
        if (!ads) {
            const text = `<b><i>⛔ There are NO TASKS available at the moment.\n⏰ Please check back later!</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content
            })
        }
        const text = showAdsText.microTask(ads)
        return await api.sendMessage(from.id, text, {
            parse_mode: "HTML",
            protect_content: protect_content,
            reply_markup: {
                inline_keyboard: inlineKeys.micro_task(ads)
            }
        })
    } catch (err) {
        return console.log(err.message)
    }
})

// Tele Task Section

api.onText(/^🛰️ Tele Task$|^⛔ Cancel$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        answerCallback[from.id] = null
        const text = `<b><i>🛰️ Telegram Tasks</i></b>`
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
})

// start bots

api.onText(/^🤖 Start Bots$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        await adsCollection.updateMany({ $expr: { $lt: [ "$remaining_budget", "$cpc" ] } }, { $set: { status: false } })
        let ads = await adsCollection.findOne({
            type: "BOT",
            chat_id: {
                $ne: from.id
            },
            completed: {
                $nin: [from.id]
            },
            skip: {
                $nin: [from.id]
            },
            status: true
        })
        if (!ads) {
            const text = `<b><i>⛔ There are NO TASKS available at the moment.\n⏰ Please check back later!</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content
            })
        }
        const text = showAdsText.botAds(ads)
        return await api.sendMessage(from.id, text, {
            parse_mode: "HTML",
            protect_content: protect_content,
            reply_markup: {
                inline_keyboard: inlineKeys.start_bot(ads)
            }
        })
    } catch (err) {
        return console.log(err.message)
    }
})

// web task

api.onText(/^💻 Web Task$|^🛑 Cancel$/, async message => {
    try {
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        if (message.chat.type != "private") return
        answerCallback[from.id] = null
        const text = `<b><i>🔗 Web related tasks</i></b>`
        return await api.sendMessage(from.id, text, {
            parse_mode: "HTML",
            protect_content: protect_content,
            reply_markup: {
                keyboard: keyList.webKey,
                resize_keyboard: true
            }
        })
    } catch (err) {
        return console.log(err.message)
    }
})

// visit sites

api.onText(/^🔗 Visit Sites$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        await adsCollection.updateMany({ $expr: { $lt: [ "$remaining_budget", "$cpc" ] } }, { $set: { status: false } })
        let ads = await adsCollection.findOne({
            type: "SITE",
            chat_id: {
                $ne: from.id
            },
            completed: {
                $nin: [from.id]
            },
            skip: {
                $nin: [from.id]
            },
            status: true
        })
        if (!ads) {
            const text = `<b><i>⛔ There are NO TASKS available at the moment.\n⏰ Please check back later!</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content
            })
        }
        const text = showAdsText.siteAds(ads)
        return await api.sendMessage(from.id, text, {
            parse_mode: "HTML",
            protect_content: protect_content,
            reply_markup: {
                inline_keyboard: inlineKeys.visit_site(ads, from.id)
            }
        })
    } catch (err) {
        return console.log(err.message)
    }
})

// view post

api.onText(/^📄 View Posts$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        await adsCollection.updateMany({ $expr: { $lt: [ "$remaining_budget", "$cpc" ] } }, { $set: { status: false } })
        let ads = await adsCollection.findOne({
            type: "POST",
            chat_id: {
                $ne: from.id
            },
            completed: {
                $nin: [from.id]
            },
            skip: {
                $nin: [from.id]
            },
            status: true
        })
        if (!ads) {
            const text = `<b><i>⛔ There are NO TASKS available at the moment.\n⏰ Please check back later!</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content
            })
        }
        const text = showAdsText.postAds(ads)
        const endTime = Math.floor(new Date().getTime()/1000) + ads.duration
        await api.sendMessage(from.id, text, {
            parse_mode: "HTML",
            protect_content: protect_content,
            reply_markup: {
                inline_keyboard: inlineKeys.post_view(ads, endTime)
            }
        })
        return await api.copyMessage(from.id, ads.chat_id, ads.post_id, {
            protect_content: protect_content
        })
    } catch (err) {
        return console.log(err.message)
    }
})

// chat join

api.onText(/^💬 Join Chats$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        await adsCollection.updateMany({ $expr: { $lt: [ "$remaining_budget", "$cpc" ] } }, { $set: { status: false } })
        let ads = await adsCollection.findOne({
            type: "CHAT",
            chat_id: {
                $ne: from.id
            },
            completed: {
                $nin: [from.id]
            },
            skip: {
                $nin: [from.id]
            },
            status: true
        })
        if (!ads) {
            const text = `<b><i>⛔ There are NO TASKS available at the moment.\n⏰ Please check back later!</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content
            })
        }
        const text = showAdsText.chatAds(ads)
        return await api.sendMessage(from.id, text, {
            parse_mode: "HTML",
            protect_content: protect_content,
            reply_markup: {
                inline_keyboard: inlineKeys.chat_join(ads)
            }
        })
    } catch (err) {
        return console.log(err.message)
    }
})

// Advertise Section

api.onText(/^📊 Advertise$|^\/advertise$|^🔙 Advertise$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        const text = `<b><i>🚀 Here you can create new ad and check current ads status</i></b>`
        return await api.sendMessage(from.id, text, {
            parse_mode: "HTML",
            protect_content: protect_content,
            reply_markup: {
                keyboard: keyList.advertiseKey,
                resize_keyboard: true
            }
        })
    } catch (err) {
        return console.log(err.message)
    }
})

// create new ads

api.onText(/^➕ New Ad$|^❌ Cancel$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        answerCallback[from.id] = null
        const text = `<b><i>🛰️ Here you can create new ad choose an option from below</i></b>`
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
})

// new bot ads

api.onText(/^🤖 New Bots$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        const text = `<b><i>🔎 Forward a message from the bot you want to promote</i></b>`
        answerCallback[from.id] = "NEW_BOT_ADS"
        return await api.sendMessage(from.id, text, {
            parse_mode: "HTML",
            protect_content: protect_content,
            reply_markup: {
                keyboard: [
                    ["❌ Cancel"]
                ],
                resize_keyboard: true
            } 
        })
    } catch (err) {
        return console.log(err.message)
    }
})

// new site ads

api.onText(/^🔗 New Sites$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        const text = `<b><i>🔗 Enter the link to get traffic.</i></b>`
        answerCallback[from.id] = "NEW_SITE_ADS"
        return await api.sendMessage(from.id, text, {
            parse_mode: "HTML",
            protect_content: protect_content,
            reply_markup: {
                keyboard: [
                    ["❌ Cancel"]
                ],
                resize_keyboard: true
            } 
        })
    } catch (err) {
        return console.log(err.message)
    }
})

// new post view

api.onText(/^📄 New Posts$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        const text = `<b><i>🔎 Forward or create a post to promote</i></b>`
        answerCallback[from.id] = "NEW_POST_ADS"
        return await api.sendMessage(from.id, text, {
            parse_mode: "HTML",
            protect_content: protect_content,
            reply_markup: {
                keyboard: [
                    ["❌ Cancel"]
                ],
                resize_keyboard: true
            } 
        })
    } catch (err) {
        return console.log(err.message)
    }
})

// new join chat

api.onText(/^💬 New Chats$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        const text = `<b><i>🔎 Forward a message or enter the username of the chat/channel</i></b>`
        answerCallback[from.id] = "NEW_CHAT_ADS"
        return await api.sendMessage(from.id, text, {
            parse_mode: "HTML",
            protect_content: protect_content,
            reply_markup: {
                keyboard: [
                    ["❌ Cancel"]
                ],
                resize_keyboard: true
            } 
        })
    } catch (err) {
        return console.log(err.message)
    }
})

// new join chat

api.onText(/^🎯 New Micro$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        answerCallback[from.id] = "NEW_MICRO_ADS"
        const text = `<b><i>🔠 Enter a title for the ad</i></b>`
        return await api.sendMessage(from.id, text, {
            parse_mode: "HTML",
            protect_content: protect_content,
            reply_markup: {
                keyboard: [
                    ["❌ Cancel"]
                ],
                resize_keyboard: true
            } 
        })
    } catch (err) {
        return console.log(err.message)
    }
})

// ads list

api.onText(/^📊 My Ads$|^✖️ Cancel$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        answerCallback[from.id] = null
        const text = `<b><i>🚀 Here you can manage all your running/expired ads.</i></b>`
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
})

// my bot ads

api.onText(/^🤖 My Bots$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        const ads = await adsCollection.find({ chat_id: from.id, type: "BOT" })
        if (ads.length === 0) {
            const text = `<b><i>🤖 No bot ads available</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content
            })
        }
        ads.forEach(item => {
            const text = adsText.botAds(item)
            api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content,
                reply_markup: {
                    inline_keyboard: inlineKeys.adsManageKey(item)
                }
            })
        })
    } catch (err) {
        return console.log(err.message)
    }
})

// my site ads

api.onText(/^🔗 My Sites$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        const ads = await adsCollection.find({ chat_id: from.id, type: "SITE" })
        if (ads.length === 0) {
            const text = `<b><i>🔗 No site ads available</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content
            })
        }
        ads.forEach(item => {
            const text = adsText.siteAds(item)
            api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content,
                reply_markup: {
                    inline_keyboard: inlineKeys.adsManageKey(item)
                },
                disable_web_page_preview: true
            })
        })
    } catch (err) {
        return console.log(err.message)
    }
})

// my post ads

api.onText(/^📄 My Posts$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        const ads = await adsCollection.find({ chat_id: from.id, type: "POST" })
        if (ads.length === 0) {
            const text = `<b><i>📄 No post ads available</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content
            })
        }
        ads.forEach(item => {
            const text = adsText.postAds(item)
            api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content,
                reply_markup: {
                    inline_keyboard: inlineKeys.adsManageKey(item)
                }
            })
        })
    } catch (err) {
        return console.log(err.message)
    }
})

// my chat ads

api.onText(/^💬 My Chats$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        const ads = await adsCollection.find({ chat_id: from.id, type: "CHAT" })
        if (ads.length === 0) {
            const text = `<b><i>💬 No chat ads available</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content
            })
        }
        ads.forEach(item => {
            const text = adsText.chatAds(item)
            api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content,
                reply_markup: {
                    inline_keyboard: inlineKeys.adsManageKey(item)
                },
                disable_web_page_preview: true
            })
        })
    } catch (err) {
        return console.log(err.message)
    }
})

// my micro task

api.onText(/^🎯 My Micro$/, async message => {
    try {
        if(message.chat.type != "private") return
        const from = message.from
        const userStatusCheck = await isUserBanned(from.id)
        if(userStatusCheck) return
        const ads = await adsCollection.find({ chat_id: from.id, type: "MICRO" })
        if (ads.length === 0) {
            const text = `<b><i>🎯 No micro tasks available</i></b>`
            return await api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content
            })
        }
        ads.forEach(item => {
            const text = adsText.microTask(item)
            api.sendMessage(from.id, text, {
                parse_mode: "HTML",
                protect_content: protect_content,
                reply_markup: {
                    inline_keyboard: inlineKeys.adsManageKey(item)
                },
                disable_web_page_preview: true
            })
        })
    } catch (err) {
        return console.log(err.message)
    }
})