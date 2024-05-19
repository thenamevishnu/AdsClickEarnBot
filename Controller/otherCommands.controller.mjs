import api from "../Config/Telegram.mjs";
import { settings } from "../Config/appConfig.mjs";
import { userCollection } from "../Models/user.model.mjs";
import { protect_content, userMention } from "../Utils/tele.mjs";

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
        if(chat.type != "group" && chat.type != "supergroup") return
        return await api.sendMessage(chat.id, chat.id, {
            parse_mode: "HTML",
            protect_content: protect_content,
            reply_to_message_id: message.message_id
        })
    } catch (err) {
        return console.log(err.message)
    }
})

api.onText(/\/event/, async message => {
    try {
        const chat = message.chat
        const usersList = await userCollection.find({_id: {$nin: [settings.ADMIN.ID, settings.ADMIN.ID2]}, is_verified: true, invites: { $gt: 0 } }).limit(10).sort({invites: -1})
        let text = "🎉 Royal Click Top 10\n"
        usersList.forEach((item, index) => {
            text += `\n${index+1 < 10 ? `0${index+1}` : index+1}: ${userMention(item._id, item.username, item.first_name)} - ${item.invites} Refs`
        })
        return await api.sendMessage(chat.id, `<b><i>${text}</i></b>`, {
            parse_mode: "HTML",
            protect_content: protect_content,
            reply_to_message_id: message.message_id
        })
    } catch (err) {
        return console.log(err.message)
    }
})