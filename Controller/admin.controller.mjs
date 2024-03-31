import api from "../Config/Telegram.mjs";
import { settings } from "../Config/appConfig.mjs";
import { getAdminPanel, protect_content } from "../Utils/tele.mjs";

api.onText(/^\/admin$/, async message => {
    try {
        const from = message.from
        if(message.chat.type != "private") return
        if (settings.ADMIN.ID != from.id) return
        const response = getAdminPanel()
        return await api.sendMessage(from.id, response.text, {
            parse_mode: "HTML",
            protect_content: protect_content,
            reply_markup: {
                inline_keyboard: response.key
            }
        })
    } catch (err) {
        return console.log(err.message)
    }
})