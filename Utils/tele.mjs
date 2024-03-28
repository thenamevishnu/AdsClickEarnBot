import ShortUniqueId from "short-unique-id";

export const protect_content = false
export const invited_user = {}
export const answerCallback = {}
export const localStore = {}

export const userMention = (user_id, username, first_name) => {
    const mention = username ? `@${username}` : `<a href='tg://user?id=${user_id}'>${first_name}</a>`
    return mention
}

export const shortID = () => {
    const short = new ShortUniqueId({ length: 10 })
    return short.rnd()
} 

export const keyList = {
    mainKey: [
        ["🛰️ Tele Task", "👨‍💻 Micro Task", "🔗 Web Task"],
        ["💷 Balance", "👭 Referrals", "⚙️ Settings"],
        ["📊 Advertise"]
    ],
    teleKey: [
        ["🤖 Start Bots"],
        ["🔙 Home"]
    ],
    advertiseKey: [
        ["➕ New Ad", "📊 My Ads"],
        ["🔙 Home"]
    ],
    newAdsKey: [
        ["🤖 New Bots"],
        ["🔙 Advertise", "🔙 Home"]
    ],
    myAdsKey: [
        ["🤖 My Bots"],
        ["🔙 Advertise", "🔙 Home"]
    ],
    balanceKey: [
        ["➕ Deposit", "🔄 Convert", "➖ Payout"],
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
    confirmDelete: (ads_id) => {
        return [
            [
                { text: "❌ Cancel", callback_data: `/cancel_delete_ad` },
                { text: "✅ Confirm delete", callback_data: `/confirm_delete ${ads_id}` }
            ]
        ]
    },
    adsManageKey: (ads) => {
        return [
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
    }
}

export const getKeyArray = () => {
    let keyArray = Object.entries(keyList).map(item => item[1]).flat().flat()
    keyArray = keyArray.filter((item, index) => index === keyArray.indexOf(item))
    keyArray = [...keyArray,"❌ Cancel","⛔ Cancel","🚫 Cancel", "✖️ Cancel", "💷 Balance","👭 Referrals","⚙️ Settings"]
    return keyArray
}

export const adsText = {
    botAds: (info) => {
        const text = `<b><i>⚙️ Campaign ID: #${info._id}\n\n🛰️ Title: ${info.title}\n🚀 Description: ${info.description}\n\n🤖 Username: @${info.username}\n🔗 Link: ${info.link}\n\n💷 CPC: $${parseFloat(info.cpc).toFixed(4)}\n💶 Budget: $${parseFloat(info.budget).toFixed(4)}\n\n🚁 Status: ${info.status ? `✅ Active` : `⏹️ Paused`}\n🎯 Clicks: ${info.completed.length}\n🪂 Skips: ${info.skip.length}</i></b>`
        return text
    }
}

const warningText = `⚠️ WARNING: The following is a third party advertisement. We are not responsible for this.`

export const showAdsText = {
    botAds: (ads) => {
        return `<b><i>${warningText}\n\n🚀 ${ads.title}\n\n🛰️ ${ads.description}</i></b>`
    }
}