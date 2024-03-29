import api from "../Config/Telegram.mjs"
import { settings } from "../Config/appConfig.mjs"
import { adsCollection } from "../Models/ads.model.mjs"
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

export default { visitSite }