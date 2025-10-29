export const settings = {
    ADMIN: {
        ID: 7270677117,
        ID2: 6813105483,
        USERNAME: "vkripz"
    },
    CHAT: {
        ID: -1001995172897,
        USERNAME: "TrueClickBotGroup"
    },
    CHANNEL: {
        ID: -1002098189284,
        USERNAME: "TrueClickBotUpdates",
        TASK: {
            ID: -1003254476266,
            USERNAME: "TrueClickBotTask"
        }
    },
    BOT: {
        VERSION: "v1.0.3",
        USERNAME: "TrueClickBot",
        NAME: "TrueClickBot",
        ID: 7924773157
    },
    COST: {
        PER_CLICK: {
            BOT_ADS: 0.005,
            SITE_ADS: 0.005,
            POST_ADS: 0.005,
            CHAT_ADS: 0.005,
            MICRO_ADS: 0.01
        }
    },
    REF: {
        PER_REF: 0.001,
        INCOME: {
            TASK: 0.1,
            DEPOSIT: 0.05
        }  
    },
    REWARD_POINTS: () => Math.floor(Math.random() * 5) + 1,
    REWARD_POINT_RATE_IN_USD: 0.00001,
    POINTS_CONVERT_AT: 100000,
    GIVEAWAY: 0.5,
    PAYMENT: {
        MIN: {
            DEPOSIT: 1,
            WITHDRAW: 2
        }
    },
    CURRENCY: "USD",
    PROTECTED_CONTENT: true,
    AD_NOTIFY_RUNNING: false
}