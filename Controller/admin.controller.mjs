import api from "../Config/Telegram.mjs";
import { settings } from "../Config/appConfig.mjs";
import { getAdminPanel, listedKey } from "../Utils/tele.mjs";

// admin

api.onText(/^\/admin$/, async message => {
    try {
        const from = message.from
        if(message.chat.type != "private") return
        if (settings.ADMIN.ID != from.id) return
        const response = getAdminPanel()
        return await api.sendMessage(from.id, response.text, {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            protect_content: settings.PROTECTED_CONTENT,
            reply_markup: {
                inline_keyboard: response.key
            }
        })
    } catch (err) {
        return await api.sendMessage(message.from.id, "<b>❌ Error happened</b>", {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            protect_content: settings.PROTECTED_CONTENT
        })
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
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: listedKey
            },
            protect_content: settings.PROTECTED_CONTENT
        })
    } catch (err) {
        return await api.sendMessage(message.from.id, "<b>❌ Error happened</b>", {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            protect_content: settings.PROTECTED_CONTENT
        })
    }
})