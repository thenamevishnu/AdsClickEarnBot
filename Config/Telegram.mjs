import Telegram from "node-telegram-bot-api"

const api = new Telegram(process.env.BOT_TOKEN, { polling: true, request: {
    agentOptions: {
        keepAlive: true,
        family: 4
    }
}})

export default api
