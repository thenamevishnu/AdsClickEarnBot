import { adsCollection } from "../Models/ads.model.mjs";
import { settings } from "../Config/appConfig.mjs";
import { userCollection } from "../Models/user.model.mjs";
import api from "../Config/Telegram.mjs";

export const protect_content = settings.PROTECTED_CONTENT
export const answerCallback = {}
export const localStore = {}
export const messageStat = {}

const listedLinks = {
    "Telegramic": "https://telegramic.org/bot/adsclickearnbot",
    "Telegram Channels": "https://telegramchannels.me/bots/adsclickearnbot"
}

const ads = [{
    text: "Fast & Secure Crypto Pay!",
    url: "https://oxapay.com/?ref=50087312"
}]

const getRandomAds = () => {
    const randomIndex = Math.floor(Math.random() * ads.length)
    return ads[randomIndex]
}

export const welcomeMessage = `<b>Welcome to ${settings.BOT.USERNAME}!\n\n✅ Earn ${settings.REF.PER_REF} ${settings.CURRENCY} for every active referral you bring!\n\n📢 Stay Updated: @${settings.CHANNEL.USERNAME}\n⭐ Share Feedback: <a href="${listedLinks["Telegramic"]}">Telegramic</a>\n\n【AD】 <a href="${getRandomAds().url}">${getRandomAds().text}</a></b>`

export const userMention = (user_id, username, first_name) => {
    const mention = username ? `@${username}` : `<a href='tg://user?id=${user_id}'>${first_name}</a>`
    return mention
}

export const sendMessageToTaskChannel = async (ad_id, user_id, username, first_name, ad_type, reward) => {
    const text = `<b>✅ Task Completed\n\n🆔 Ad ID: <code>${ad_id}</code>\n👤 User: ${userMention(user_id, username, first_name)}\n📌 Task Type: ${ad_type}\n💰 Reward: <code>${parseFloat(reward).toFixed(6)} ${settings.CURRENCY}</code>\n\n🤖 Bot: @${settings.BOT.USERNAME}</b>`
    return await api.sendMessage(settings.CHANNEL.TASK.ID, text, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        protect_content: settings.PROTECTED_CONTENT
    })
}

export const isUserBanned = async (user_id, bool=0) => {
    try {
        const user = await userCollection.findOne({ _id: user_id })
        if (!user?.is_verified && !bool) {
            const text = `<b><i>✅ Verification Needed!</i></b>`
            const verification_url = `${process.env.SERVER}/verification/${user_id}`
            await api.sendMessage(user_id, text, {
                parse_mode: "HTML",
                protect_content: true,
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: "✅ Get Verified",
                            web_app: {
                                url: verification_url
                            }
                        }]
                    ]
                }
            })
            return true
        }
        return user?.banned
    } catch (err) {
        console.log(err.message);
        return true
    }
}

export const shortID = () => {
    const string = "1234567890abcdef"
    let j = 0
    let rnd = ""
    while (j < 20) {
        const randomIndex = Math.floor(Math.random() * string.length)
        rnd += string[randomIndex]
        j++
    }
    return rnd
} 

export const keyList = {
    mainKey: [
        ["🛰️ Tele Task", "🎯 Micro Task", "💻 Web Task"],
        ["💷 Balance", "👭 Referrals", "⚙️ Settings"],
        ["📊 Advertise", "❓ FAQ"]
    ],
    teleKey: [
        ["🤖 Start Bots", "📄 View Posts", "💬 Join Chats"],
        ["🔙 Home"]
    ],
    webKey: [
        ["🔗 Visit Sites"],
        ["🔙 Home"]
    ],
    advertiseKey: [
        ["➕ New Ad", "📊 My Ads"],
        ["🔙 Home"]
    ],
    newAdsKey: [
        ["🤖 New Bots", "🎯 New Micro", "🔗 New Sites"],
        ["📄 New Posts", "💬 New Chats"],
        ["🔙 Advertise"]
    ],
    myAdsKey: [
        ["🤖 My Bots", "🎯 My Micro", "🔗 My Sites"],
        ["📄 My Posts", "💬 My Chats"],
        ["🔙 Advertise"]
    ]
}

export const balance_key = [
    [{ text: "📥 Deposit", callback_data: "/deposit" }, { text: "📤 Withdraw", callback_data: "/withdraw" }],
    [{ text: "🔄 Convert", callback_data: "/convert_balance" }, { text: "🕛 History", callback_data: "/history" }]
]

export const getRefMessage = (id) => {
    const shareText = `https://t.me/share/url?url=${encodeURIComponent(`**💸 Start Earning Effortlessly with ${settings.BOT.USERNAME}!\n\n🚀 Earn passive income by completing simple tasks.\n💵 Instant cashouts available anytime, no delays.\n\n🤖 Start Now: https://t.me/${settings.BOT.USERNAME}?start=${id}**`)}`
    const text = `<b>🌍 Invite & Earn Instantly!\n\n💸 How It Works:\n\n✅ Earn ${settings.REF.PER_REF} ${settings.CURRENCY} for every active user you invite to our bot.\n✅ Get ${settings.REF.INCOME.TASK * 100}% of your referrals’ task earnings.\n✅ Receive ${settings.REF.INCOME.DEPOSIT * 100}% from every deposit your referrals make.\n\n🔗 Your referral link: https://t.me/${settings.BOT.USERNAME}?start=${id}\n\n⚠️ Note: Invite only real users — fake or duplicate accounts can lead to suspension or loss of rewards.\n\n🚀 Start inviting, grow your team, and boost your income today!</b>`
    const key = [
        [
            { text: "🔗 Share Link", url: shareText }
        ], [
            { text: "📈 Referral Statistics", callback_data: "/ref_stat_display" },
            { text: "🏆 Leaderboard", callback_data: "/leaderboard" }
        ]
    ]
    return { text, key }
}

export const getFaq = () => {
    const text = `<b>📚 FAQ — Your Quick Guide</b>\n\nHave questions? We've got you covered! Check out these answers to get started and make the most of the bot.`
    const key = [
        [{ text: `🤖 What is ${settings.BOT.USERNAME}?`, callback_data: "/faq 0" }],
        [{ text: "💰 How can I earn money?", callback_data: "/faq 1" }],
        [{ text: "👥 How does the referral system work?", callback_data: "/faq 2" }],
        [{ text: "📢 Can I promote my own business?", callback_data: "/faq 3" }],
        [{ text: "💳 How do I withdraw my earnings?", callback_data: "/faq 4" }],
        [{ text: "⏰ When are rewards credited?", callback_data: "/faq 5" }],
        [{ text: "🛠 Need Help?", callback_data: "/faq 6" }]
    ]
    return { text, key }
}

export const inlineKeys = {
    start_bot: (ads) => {
        return [
            [
                { text: `🔗 Open`, url: `${ads.link}` }
            ],[
                { text: `⏭️ Skip`, callback_data: `/skip ${ads._id}` },
                { text: `✅ Started`, callback_data: `/started_bot ${ads._id}`}
            ]
        ]
    },
    chat_join: (ads) => {
        return [
            [
                { text: `🔗 Open Chat`, url: `${ads.link}` }
            ],[
                { text: `⏭️ Skip`, callback_data: `/skip ${ads._id}` },
                { text: `✅ Joined`, callback_data: `/chat_joined ${ads._id}`}
            ]
        ]
    },
    visit_site: (ads, user_id) => {
        return [
            [
                { text: `⏭️ Skip`, callback_data: `/skip ${ads._id}` },
                { text: `🔗 Open link`, url: `${process.env.SERVER}/links/visit/${ads._id}?id=${user_id}` }
            ]
        ]
    },
    micro_task: (ads) => {
        return [
            [
                { text: `⏭️ Skip`, callback_data: `/skip ${ads._id}` },
                { text: `✅ Submit Proof`, callback_data: `/micro_task_done ${ads._id}` }
            ]
        ]
    },
    post_view: (ads, endTime) => {
        return [
            [
                { text: `⏭️ Skip`, callback_data: `/skip ${ads._id}` },
                { text: `✅ Watched`, callback_data: `/watched ${endTime} ${ads._id}` }
            ]
        ]
    },
    confirmDelete: (ads_id) => {
        return [
            [
                { text: "❌ Cancel", callback_data: `/cancel_delete_ad` },
                { text: "✅ Confirm delete", callback_data: `/confirm_delete ${ads_id}` }
            ]
        ]
    },
    adsManageKey: (ads) => {
        const key = [
            [
                { text: `${ads.status ? `⏹️ Stop` : `▶️ Start`}`, callback_data: `/ads_status ${ads.status ? false : true} ${ads._id}` }
            ], [
                { text: `🛰️ Edit Title`, callback_data: `/edit_ad TITLE ${ads._id}` },
                { text: `🚀 Edit Description`, callback_data: `/edit_ad DESCRIPTION ${ads._id}` }
            ], [
                { text: "💵 Edit CPC", callback_data: `/edit_ad CPC ${ads._id}` },
                { text: "💷 Edit Budget", callback_data: `/edit_ad BUDGET ${ads._id}` }
            ], [
                { text: "❌ Delete Ad", callback_data: `/delete_ad ${ads._id}`}
            ]
        ]
        if (ads.type == "POST") key[0].push({ text: "📄 View Posts", callback_data: `/view_post ${ads.post_id}` })
        if (ads.type == "MICRO") key[0].push({ text: "📄 See List", callback_data: `/micro_list 0 ${ads._id}` })
        return key
    }
}

export const getKeyArray = () => {
    let keyArray = Object.entries(keyList).map(item => item[1]).flat().flat()
    keyArray = keyArray.filter((item, index) => index === keyArray.indexOf(item))
    keyArray = [...keyArray, "❌ Cancel", "⛔ Cancel", "🚫 Cancel", "🛑 Cancel", "✖️ Cancel", "🔴 Cancel", "💷 Balance", "👭 Referrals", "⚙️ Settings", "/id", "/gid", "/event"]
    return keyArray
}

export const adsText = {
    botAds: (info) => {
        const text = `<b><i>⚙️ Campaign ID: #${info._id}\n\n🛰️ Title: ${info.title}\n🚀 Description: ${info.description}\n\n🤖 Username: @${info.username}\n🔗 Link: ${info.link}\n\n💷 CPC: ${parseFloat(info.cpc).toFixed(6)} ${settings.CURRENCY}\n💶 Budget: ${parseFloat(info.budget).toFixed(6)} ${settings.CURRENCY}\n💵 Remaining Budget: ${parseFloat(info.remaining_budget).toFixed(6)} ${settings.CURRENCY}\n\n🚁 Status: ${info.status ? `✅ Active` : `⏹️ Paused`}\n🎯 Clicks: ${info.completed.length}\n🪂 Skips: ${info.skip.length}</i></b>`
        return text
    },
    siteAds: (info) => {
        const text = `<b><i>⚙️ Campaign ID: #${info._id}\n\n🛰️ Title: ${info.title}\n🚀 Description: ${info.description}\n\n⌚ Duration: ${info.duration} seconds\n🔗 Link: ${info.link}\n\n💷 CPC: ${parseFloat(info.cpc).toFixed(6)} ${settings.CURRENCY}\n💶 Budget: ${parseFloat(info.budget).toFixed(6)} ${settings.CURRENCY}\n💵 Remaining Budget: ${parseFloat(info.remaining_budget).toFixed(6)} ${settings.CURRENCY}\n\n🚁 Status: ${info.status ? `✅ Active` : `⏹️ Paused`}\n🎯 Clicks: ${info.completed.length}\n🪂 Skips: ${info.skip.length}</i></b>`
        return text
    },
    postAds: (info) => {
        const text = `<b><i>⚙️ Campaign ID: #${info._id}\n\n🛰️ Title: ${info.title}\n🚀 Description: ${info.description}\n\n⌚ Duration: ${info.duration} seconds\n🆔 PostID: ${info.post_id}\n\n💷 CPC: ${parseFloat(info.cpc).toFixed(6)} ${settings.CURRENCY}\n💶 Budget: ${parseFloat(info.budget).toFixed(6)} ${settings.CURRENCY}\n💵 Remaining Budget: ${parseFloat(info.remaining_budget).toFixed(6)} ${settings.CURRENCY}\n\n🚁 Status: ${info.status ? `✅ Active` : `⏹️ Paused`}\n🎯 Clicks: ${info.completed.length}\n🪂 Skips: ${info.skip.length}</i></b>`
        return text
    },
    chatAds: (info) => {
        const text = `<b><i>⚙️ Campaign ID: #${info._id}\n\n🛰️ Title: ${info.title}\n🚀 Description: ${info.description}\n\n💬 Username: @${info.username}\n🔗 Link: ${info.link}\n\n💷 CPC: ${parseFloat(info.cpc).toFixed(6)} ${settings.CURRENCY}\n💶 Budget: ${parseFloat(info.budget).toFixed(6)} ${settings.CURRENCY}\n💵 Remaining Budget: ${parseFloat(info.remaining_budget).toFixed(6)} ${settings.CURRENCY}\n\n🚁 Status: ${info.status ? `✅ Active` : `⏹️ Paused`}\n🎯 Clicks: ${info.completed.length}\n🪂 Skips: ${info.skip.length}</i></b>`
        return text
    },
    microTask: (info) => {
        const text = `<b><i>⚙️ Campaign ID: #${info._id}\n\n🛰️ Title: ${info.title}\n🚀 Description: \n ${info.description}\n\n💷 CPC: ${parseFloat(info.cpc).toFixed(6)} ${settings.CURRENCY}\n💶 Budget: ${parseFloat(info.budget).toFixed(6)} ${settings.CURRENCY}\n💵 Remaining Budget: ${parseFloat(info.remaining_budget).toFixed(6)} ${settings.CURRENCY}\n\n🚁 Status: ${info.status ? `✅ Active` : `⏹️ Paused`}\n🎯 Clicks: ${info.completed.length}\n🪂 Skips: ${info.skip.length}</i></b>`
        return text
    }
}

const warningText = `⚠️ WARNING: The following is a third party advertisement. We are not responsible for this.`

export const showAdsText = {
    botAds: (ads) => {
        return `<b><i>${warningText}\n\n🚀 ${ads.title}\n\n🛰️ ${ads.description}</i></b>`
    },
    siteAds: (ads) => {
        return `<b><i>${warningText}\n\n🚀 ${ads.title}\n\n🛰️ ${ads.description}</i></b>`
    },
    postAds: (ads) => {
        return `<b><i>${warningText}\n\n🚀 ${ads.title}\n\n🛰️ ${ads.description}</i></b>`
    },
    chatAds: (ads) => {
        return `<b><i>${warningText}\n\n🚀 ${ads.title}\n\n🛰️ ${ads.description}</i></b>`
    },
    microTask: (ads) => {
        const reward = ( ads.cpc * settings.GIVEAWAY).toFixed(6)
        return `<b><i>${warningText}\n\n🆔 CampaignID: #${ads._id} [Keep this ID]\n🎁 Reward: ${reward} ${settings.CURRENCY}\n\n🚀 ${ads.title}\n\n🛰️ ${ads.description}</i></b>`
    }
}

export const onSuccessVisitSite = async (campaignId, user_id) => {
    try {
        const getCampaign = await adsCollection.findOne({ _id: campaignId, status: true })
        if (!getCampaign) {
            return "❌ Campaign deleted/disabled!"
        }
        if (getCampaign.completed.includes(user_id)) {
            return "❌ You have already completed!"
        }
        if (getCampaign.skip.includes(user_id)) {
            return "❌ You have already skipped!"
        }
        if (getCampaign.cpc > getCampaign.remaining_budget) {
            await adsCollection.updateOne({ _id: campaignId }, { $set: { status: false } })
            return "❌ Campaign disabled!"
        }
        const cpc = getCampaign.cpc
        const earn = (cpc * settings.GIVEAWAY).toFixed(6)
        const commission = (earn * settings.REF.INCOME.TASK).toFixed(6)
        await adsCollection.updateOne({ _id: campaignId }, { $addToSet: { completed: Number(user_id) }, $inc: { remaining_budget: -(cpc) } })
        const userUpdate = await userCollection.findOneAndUpdate({ _id: user_id }, { $inc: { "balance.withdrawable": earn, "balance.earned": earn } })
        await userCollection.updateOne({ _id: userUpdate.invited_by }, { $inc: { "balance.withdrawable": commission, "balance.referral": commission, "balance.earned": commission } })
        sendMessageToTaskChannel(campaignId, user_id, userUpdate.username, userUpdate.first_name, "VIEW SITE", earn)
        return `✅ Task completed: +${earn} ${settings.CURRENCY}`
    } catch (err) {
        return "❌ Error happend!"
    }
}

export const getAdminPanel = () => {
    const text = `<b><i>🎯 Dashboard of admins</i></b>`
    const key = [
        [
            {text: `Protected Content: ${settings.PROTECTED_CONTENT ? "✅ Enabled" : "❌ Disabled"}`, callback_data: `/admin_protected_content`},
        ],
        [
            {text: "🔔 Ad Notify", callback_data: "/admin_ad_notify"},
            { text: "📉 User Stat", callback_data: `/admin_user_stat` },
            { text: "📤 Mailing", callback_data: "/admin_mailing" }
        ],[
            { text: `🔴 Ban User`, callback_data: `/admin_ban_user` },
            { text: `🟢 Unban User`, callback_data: `/admin_unban_user` }
        ], [
            { text: "💵 Add Balance", callback_data: "/admin_add_balance" }
        ]
    ]
    return {
        text: text,
        key: key
    }
}

export const listedKey = [
    [
        {
            text: "Telegramic", url: listedLinks["Telegramic"]
        }, {
            text: "Telegram Channels", url: listedLinks["Telegram Channels"]
        }
    ]
]