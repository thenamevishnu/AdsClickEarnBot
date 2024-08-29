import Telegram from "node-telegram-bot-api"

const api = new Telegram(process.env.BOT_TOKEN, {
    polling: true,
    interval: 88,
    request: {
        agentOptions: {
            keepAlive: true,
            family: 4
        }
    },
    params: {
        timeout: 10
    }
})

export default api
