import api from "../Config/Telegram.mjs"
import { settings } from "../Config/appConfig.mjs"
import { adsCollection } from "../Models/ads.model.mjs"
import { userCollection } from "../Models/user.model.mjs"
import { onSuccessVisitSite, protect_content } from "../Utils/tele.mjs"

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
                protect_content: protect_content
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
        const findUser = await userCollection.findOne({ _id: user_id })
        if (!findUser) {
            return res.status(404).send({message: "❌ User not found! Restart your bot"})
        }
        if (findUser.is_verified) {
            return res.status(404).send({message: "✅ You have already verified"})
        }
        res.render("verification", { user_id: user_id })
    } catch (err) {
        return res.status(500).send({message: "❌ Internal server error!"})
    }
}

const verificationCheck = async (req, res) => {
    try {
        const { user_id } = req.params
        const { ip } = req.query
        const findUser = await userCollection.findOne({ _id: user_id })
        if (!findUser) {
            return res.status(404).send({message: "❌ User not found! Restart your bot"})
        }
        if (findUser.is_verified) {
            return res.status(404).send({message: "✅ You have already verified"})
        }
        const ipCheck = await userCollection.find({ ip: ip })
        if (ipCheck && ipCheck.length > 0) {
            await userCollection.updateOne({ _id: user_id }, { $set: { ip: ip, is_verified: true, banned: true, ban_reason: "multiple" } })
            return res.status(500).send({message: "❌ Banned due to mutiple account!"})
        }
        if (ipCheck && ipCheck.length == 0) {
            const resData = await userCollection.updateOne({ _id: user_id }, { $set: { ip: ip, is_verified: true } })
            if (resData.matchedCount == 1 && resData.modifiedCount == 1) {
                return res.status(404).send({message: "🎉 You're verified"})
            }
            return res.status(500).send({message: "❌ Internal server error!"})
        }
        return res.status(500).send({message: "OK"})
    } catch (err) {
        return res.status(500).send({message: "❌ Internal server error!"})
    }
}

export default { visitSite, verification, verificationCheck }