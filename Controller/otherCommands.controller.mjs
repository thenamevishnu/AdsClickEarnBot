import api from "../Config/Telegram.mjs";
import { settings } from "../Config/appConfig.mjs";

api.onText(/^\/id$/, async message => {
    try {
        const from = message.from
        const text = `<b>🆔 Telegram ID: <code>${from.id}</code>${message.chat.type != "private" && `\n🆔 Group ID: <code>${message.chat.id}</code>`}</b>`
        return await api.sendMessage(message.chat.id, text, {
            parse_mode: "HTML",
            protect_content: settings.PROTECTED_CONTENT,
            reply_to_message_id: message.message_id
        })
    } catch (err) {
        return await api.sendMessage(message.chat.id, "<b>❌ Error happened</b>", {
            parse_mode: "HTML",
            protect_content: settings.PROTECTED_CONTENT
        })
    }
})

api.onText("/ads_run_command", async message => {
    if (message.chat.type != "private") return
    return await api.sendMessage(message.chat.id, "<i>🏡 Home</i>", { parse_mode: "HTML" })
})