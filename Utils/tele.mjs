import ShortUniqueId from "short-unique-id";
import { adsCollection } from "../Models/ads.model.mjs";
import { settings } from "../Config/appConfig.mjs";
import { userCollection } from "../Models/user.model.mjs";

export const protect_content = false
export const invited_user = {}
export const answerCallback = {}
export const localStore = {}

export const userMention = (user_id, username, first_name) => {
    const mention = username ? `@${username}` : `<a href='tg://user?id=${user_id}'>${first_name}</a>`
    return mention
}

export const isUserBanned = async user_id => {
    try {
        const user = await userCollection.findOne({ _id: user_id })
        return user?.banned
    } catch (err) {
        console.log(err.message);
        return true
    }
}

export const shortID = () => {
    const short = new ShortUniqueId({ length: 10 })
    return short.rnd()
} 

export const keyList = {
    mainKey: [
        ["🛰️ Tele Task", "🎯 Micro Task", "💻 Web Task"],
        ["💷 Balance", "👭 Referrals", "⚙️ Settings"],
        ["📊 Advertise"]
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
    ],
    balanceKey: [
        ["➕ Deposit", "➖ Payout"],
        ["🔄 Convert", "📃 History"],
        ["🔙 Home"]
    ]
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
    keyArray = [...keyArray,"❌ Cancel","⛔ Cancel","🚫 Cancel", "🛑 Cancel", "✖️ Cancel", "🔴 Cancel", "💷 Balance","👭 Referrals","⚙️ Settings"]
    return keyArray
}

export const adsText = {
    botAds: (info) => {
        const text = `<b><i>⚙️ Campaign ID: #${info._id}\n\n🛰️ Title: ${info.title}\n🚀 Description: ${info.description}\n\n🤖 Username: @${info.username}\n🔗 Link: ${info.link}\n\n💷 CPC: $${parseFloat(info.cpc).toFixed(4)}\n💶 Budget: $${parseFloat(info.budget).toFixed(4)}\n💵 Remaining Budget: $${parseFloat(info.remaining_budget).toFixed(4)}\n\n🚁 Status: ${info.status ? `✅ Active` : `⏹️ Paused`}\n🎯 Clicks: ${info.completed.length}\n🪂 Skips: ${info.skip.length}</i></b>`
        return text
    },
    siteAds: (info) => {
        const text = `<b><i>⚙️ Campaign ID: #${info._id}\n\n🛰️ Title: ${info.title}\n🚀 Description: ${info.description}\n\n⌚ Duration: ${info.duration} seconds\n🔗 Link: ${info.link}\n\n💷 CPC: $${parseFloat(info.cpc).toFixed(4)}\n💶 Budget: $${parseFloat(info.budget).toFixed(4)}\n💵 Remaining Budget: $${parseFloat(info.remaining_budget).toFixed(4)}\n\n🚁 Status: ${info.status ? `✅ Active` : `⏹️ Paused`}\n🎯 Clicks: ${info.completed.length}\n🪂 Skips: ${info.skip.length}</i></b>`
        return text
    },
    postAds: (info) => {
        const text = `<b><i>⚙️ Campaign ID: #${info._id}\n\n🛰️ Title: ${info.title}\n🚀 Description: ${info.description}\n\n⌚ Duration: ${info.duration} seconds\n🆔 PostID: ${info.post_id}\n\n💷 CPC: $${parseFloat(info.cpc).toFixed(4)}\n💶 Budget: $${parseFloat(info.budget).toFixed(4)}\n💵 Remaining Budget: $${parseFloat(info.remaining_budget).toFixed(4)}\n\n🚁 Status: ${info.status ? `✅ Active` : `⏹️ Paused`}\n🎯 Clicks: ${info.completed.length}\n🪂 Skips: ${info.skip.length}</i></b>`
        return text
    },
    chatAds: (info) => {
        const text = `<b><i>⚙️ Campaign ID: #${info._id}\n\n🛰️ Title: ${info.title}\n🚀 Description: ${info.description}\n\n💬 Username: @${info.username}\n🔗 Link: ${info.link}\n\n💷 CPC: $${parseFloat(info.cpc).toFixed(4)}\n💶 Budget: $${parseFloat(info.budget).toFixed(4)}\n💵 Remaining Budget: $${parseFloat(info.remaining_budget).toFixed(4)}\n\n🚁 Status: ${info.status ? `✅ Active` : `⏹️ Paused`}\n🎯 Clicks: ${info.completed.length}\n🪂 Skips: ${info.skip.length}</i></b>`
        return text
    },
    microTask: (info) => {
        const text = `<b><i>⚙️ Campaign ID: #${info._id}\n\n🛰️ Title: ${info.title}\n🚀 Description: \n ${info.description}\n\n💷 CPC: $${parseFloat(info.cpc).toFixed(4)}\n💶 Budget: $${parseFloat(info.budget).toFixed(4)}\n💵 Remaining Budget: $${parseFloat(info.remaining_budget).toFixed(4)}\n\n🚁 Status: ${info.status ? `✅ Active` : `⏹️ Paused`}\n🎯 Clicks: ${info.completed.length}\n🪂 Skips: ${info.skip.length}</i></b>`
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
        const reward = ( ads.cpc * settings.GIVEAWAY).toFixed(4)
        return `<b><i>${warningText}\n\n🆔 CampaignID: #${ads._id} [Keep this ID]\n🎁 Reward: $${reward}\n\n🚀 ${ads.title}\n\n🛰️ ${ads.description}</i></b>`
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
        const earn = (cpc * settings.GIVEAWAY).toFixed(4)
        const commission = (earn * settings.REF.INCOME.TASK).toFixed(4)
        await adsCollection.updateOne({ _id: campaignId }, { $addToSet: { completed: Number(user_id) }, $inc: { remaining_budget: -(cpc) } })
        const userUpdate = await userCollection.findOneAndUpdate({ _id: user_id }, { $inc: { "balance.withdrawable": earn } })
        await userCollection.updateOne({ _id: userUpdate.invited_by }, { $inc: { "balance.withdrawable": commission, "balance.referral": commission } })
        return `✅ Task completed: +$${earn}`
    } catch (err) {
        return "❌ Error happend!"
    }
}

export const getAdminPanel = () => {
    const text = `<b><i>🎯 Dashboard of admins</i></b>`
    const key = [
        [
            { text: `🔴 Ban User`, callback_data: `/admin_ban_user` },
            { text: `🟢 Unban User`, callback_data: `/admin_unban_user` }
        ]
    ]
    return {
        text: text,
        key: key
    }
}