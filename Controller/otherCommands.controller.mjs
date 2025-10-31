import translate from "translate-google";
import api from "../Config/Telegram.mjs";
import { settings } from "../Config/appConfig.mjs";
import { getRateLink } from "../Utils/tele.mjs";

api.onText(/^\/id$/, async message => {
    try {
        const from = message.from
        const text = `<b>🆔 Telegram ID: <code>${from.id}</code>${message.chat.type != "private" && `\n🆔 Group ID: <code>${message.chat.id}</code>`}</b>`
        return await api.sendMessage(message.chat.id, text, {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            protect_content: settings.PROTECTED_CONTENT,
            reply_to_message_id: message.message_id
        })
    } catch (err) {
        return await api.sendMessage(message.chat.id, "<b>❌ Error happened</b>", {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            protect_content: settings.PROTECTED_CONTENT
        })
    }
})

api.onText(/^\/review$/, async message => {
    let reply_to_message_id = message.message_id
    if (message.reply_to_message) {
        reply_to_message_id = message.reply_to_message.message_id
    }
    return await api.sendMessage(message.chat.id, `<b>⭐ Rate us on ${getRateLink()}</b>`, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        protect_content: settings.PROTECTED_CONTENT,
        reply_to_message_id
    })
})

api.onText("/ads_run_command", async message => {
    if (message.chat.type != "private") return
    return await api.sendMessage(message.chat.id, "<i>🏡 Home</i>", {
        parse_mode: "HTML",
        disable_web_page_preview: true
     })
})

api.onText(/^\/trans$/, async message => {
    try {
        const reply_to_message = message.reply_to_message
        if (!reply_to_message) return await api.sendMessage(message.chat.id, "<b>❌ Please reply to the message you want to translate</b>", {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            protect_content: settings.PROTECTED_CONTENT
        })
        const text = reply_to_message?.text
        if(!text) return await api.sendMessage(message.chat.id, "<b>❌ No text found</b>", {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            protect_content: settings.PROTECTED_CONTENT
        })
        const translatedText = await translate(text, { to: "en" })
        return await api.sendMessage(message.chat.id, translatedText, {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            protect_content: settings.PROTECTED_CONTENT,
            reply_to_message_id: message.message_id
        })
    } catch (err) {
        console.log(err)
        return await api.sendMessage(message.chat.id, "<b>❌ Error happened</b>", {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            protect_content: settings.PROTECTED_CONTENT
        })
    }
})