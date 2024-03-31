import api from "../Config/Telegram.mjs";
import { protect_content } from "../Utils/tele.mjs";

api.onText(/^\/id$/, async message => {
    try {
        const from = message.from
        return await api.sendMessage(message.chat.id, from.id, {
            parse_mode: "HTML",
            protect_content: protect_content,
            reply_to_message_id: message.message_id
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/^\/gid$/, async message => {
    try {
        const chat = message.chat
        return await api.sendMessage(chat.id, chat.id, {
            parse_mode: "HTML",
            protect_content: protect_content,
            reply_to_message_id: message.message_id
        })
    } catch (err) {
        return console.log(err.message)
    }
})