import api from "../Config/Telegram.mjs";
import { settings } from "../Config/appConfig.mjs";
import { getAdminPanel, protect_content } from "../Utils/tele.mjs";

// admin

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

// listed on

api.onText(/\/listed/, async message => {
    try {
        const from = message.from
        if(from.id != settings.ADMIN.ID) return
        const text = `<b><i>🎉 We are listed on these websites!</i></b>`
        return api.sendMessage(message.chat.id, text, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: listedKey
            },
            protect_content: protect_content
        })
    } catch (err) {
        return console.log(err.message)
    }
})