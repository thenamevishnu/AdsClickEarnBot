import { Schema, model } from "mongoose";
import { settings } from "../Config/appConfig.mjs";

const user = new Schema({
    _id: { type: Number, required: true, unique: true },
    first_name: { type: String, required: true },
    last_name: { type: String },
    username: { type: String },
    blocked_bot: { type: Boolean, default: false },
    balance: {
        points: { type: Number, default: 0 },
        withdrawable: { type: Number, default: 0 },
        balance: { type: Number, default: 0 },
        deposits: { type: Number, default: 0 },
        referral: { type: Number, default: 0 },
        payouts: { type: Number, default: 0 },
        earned: { type: Number, default: 0 }
    },
    is_verified: { type: Boolean, default: false },
    ip: { type: String },
    next_reward: { type: Number, default: 0 },
    ban_reason: { type: String },
    banned: { type: Boolean, default: false },
    invites: { type: Number, default: 0 },
    invited_by: { type: Number, default: settings.ADMIN.ID },
    notification: { type: Boolean, default: true },
    last_active: { type: Number, default: Math.floor(new Date().getTime() / 1000) }
}, {
    timestamps: true
})

export const userCollection = model("users", user)