import api from "../Config/Telegram.mjs"
import { settings } from "../Config/appConfig.mjs"
import { adsCollection } from "../Models/ads.model.mjs"
import { userCollection } from "../Models/user.model.mjs"
import { keyList, onSuccessVisitSite } from "../Utils/tele.mjs"

const visitSite = async (req, res) => {
    try {
        const { campaign } = req.params
        const { id } = req.query
        const campaignInfo = await adsCollection.findOne({ _id: campaign, status: true })
        if (!campaignInfo) {
            return res.redirect(`https://t.me/${settings.BOT.USERNAME}`)
        }
        const duration = campaignInfo.duration
        const link = campaignInfo.link
        setTimeout(async () => {
            const response = await onSuccessVisitSite(campaign, id)
            await api.sendMessage(id, `<b><i>${response}</i></b>`, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT
            })
        }, duration * 1000)
        const obj = {
            duration: duration,
            link: link
        }
        return res.render("visitLink", obj)
    } catch (err) {
        console.log(err.message);
        return res.status(500).send({message: "Internal server error"})
    }
}

const verification = async (req, res) => {
    try {
        const { user_id } = req.params
        const { status } = await api.getChatMember(settings.CHAT.ID, user_id)
        if (status != "administrator" && status != "member" && status != "creator") {
            const joinText = `<b><i>✅ Join @${settings.CHAT.USERNAME} to continue</i></b>`
            const verification_url = `${process.env.SERVER}/verification/${user_id}`
            await api.sendMessage(user_id, joinText, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                protect_content: settings.PROTECTED_CONTENT,
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: "✅ Continue",
                            web_app: {
                                url: verification_url
                            }
                        }]
                    ]
                }
            })
            return res.redirect(`https://t.me/${settings.BOT.USERNAME}`)
        }
        return res.render("verification", { user_id: user_id, server: process.env.SERVER })
    } catch (err) {
        console.log(err)
        return res.status(200).send({message: "❌ Internal server error!"})
    }
}

const verificationCheck = async (req, res) => {
    try {
        const { user_id } = req.params
        const { ip } = req.query
        const findUser = await userCollection.findOne({ _id: user_id })
        if (!findUser) {
            return res.status(200).send({message: "❌ User not found! Restart your bot"})
        }
        if (findUser.is_verified) {
            return res.status(200).send({message: "✅ You have already verified"})
        }
        const ipCheck = await userCollection.find({ ip: ip })
        if (ipCheck && ipCheck.length > 0) {
            await userCollection.updateOne({ _id: user_id }, { $set: { ip: ip, is_verified: true, banned: true, ban_reason: "multiple" } })
            return res.status(200).send({message: "❌ Banned due to mutiple account!"})
        }
        if (ipCheck && ipCheck.length == 0) {
            const resData = await userCollection.findOneAndUpdate({ _id: user_id, is_verified: false }, { $set: { ip: ip, is_verified: true } })
            if (resData) {
                await userCollection.updateOne({ _id: resData.invited_by }, { $inc: { "balance.balance": settings.REF.PER_REF, "balance.referral": settings.REF.PER_REF, "balance.earned": settings.REF.PER_REF } })
                await api.sendMessage(resData.invited_by, `<b><i>🎉 One of your referral has been verified: +${settings.REF.PER_REF} ${settings.CURRENCY}</i></b>`, {
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                    protect_content: settings.PROTECTED_CONTENT
                })
                await api.sendMessage(user_id, "<b><i>🎉 You're verified</i></b>", {
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                    protect_content: settings.PROTECTED_CONTENT,
                    reply_markup: {
                        keyboard: keyList.mainKey,
                        resize_keyboard: true
                    }
                })
                return res.status(200).send({ message: "🎉 You're verified" })
            }
            return res.status(200).send({message: "❌ Internal server error!"})
        }
        return res.status(200).send({message: "OK"})
    } catch (err) {
        return res.status(200).send({message: "❌ Internal server error!"})
    }
}

export default { visitSite, verification, verificationCheck }