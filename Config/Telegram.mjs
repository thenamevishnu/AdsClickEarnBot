import Telegram from "node-telegram-bot-api"

const api = new Telegram(process.env.BOT_TOKEN, { polling: true })

export default api
