import api from "../Config/Telegram.mjs";
import { settings } from "../Config/appConfig.mjs";
import { userCollection } from "../Models/user.model.mjs";
import { userMention } from "../Utils/tele.mjs";

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