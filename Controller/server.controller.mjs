import { settings } from "../Config/appConfig.mjs"
import { adsCollection } from "../Models/ads.model.mjs"
import { deletedAdsModel } from "../Models/deleted_ads.model.mjs"
import { userCollection } from "../Models/user.model.mjs"

const serverStatus = async (_req, res) => {
    try {
        return res.status(200).send({message: new Date().toLocaleString("default", {
            month: "short",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        }).toUpperCase()})
    } catch (err) {
        return res.status(500).send({message: err.message})
    }
}

const website = async (_req, res) => {
    try {
        const [ads, ads_deleted, total_users] = await Promise.all([
            adsCollection.aggregate([
                {
                    $group: {
                        _id: null,
                        live_campaigns: { $sum: { $cond: [{ $eq: ["$status", true] }, 1, 0] } },
                        total_clicks: { $sum: { $size: "$completed" } }
                    }
                }
            ]),
            deletedAdsModel.aggregate([
                {
                    $group: {
                        _id: null,
                        total_clicks: { $sum: { $size: "$completed" } }
                    }
                }
            ]),
            userCollection.aggregate([
                {
                    $group: {
                        _id: null,
                        total_users: { $sum: 1 },
                        payouts: { $sum: "$balance.payouts" }
                    }
                }
            ])
        ]);
        return res.render("Website/LandingPage", {
            favicon: process.env.SERVER + "/file/true_click_favicon.png",
            live_campaigns: ads[0]?.live_campaigns || 0,
            total_clicks: (ads[0]?.total_clicks||0) + (ads_deleted[0]?.total_clicks||0),
            total_users: total_users[0]?.total_users || 0,
            total_payouts: total_users[0]?.payouts || 0,
            updates: settings.CHANNEL.USERNAME,
            community: settings.CHAT.USERNAME,
            bot_username: settings.BOT.USERNAME,
            dev: settings.ADMIN.USERNAME,
            email: settings.BOT.EMAIL,
            per_refer: settings.REF.PER_REF,
            per_task: settings.REF.INCOME.TASK,
            per_deposit: settings.REF.INCOME.DEPOSIT
        });
    } catch (err) {
        return res.status(500).send({message: err.message})
    }
}

export default { serverStatus, website }