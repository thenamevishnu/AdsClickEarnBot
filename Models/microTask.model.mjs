import { Schema, model } from "mongoose";

const microTasks = new Schema({
    campaign_id: { type: String, required: true },
    cpc: { type: Number, required: true },
    done_by: { type: Number, required: true },
    done_by_first_name: { type: String },
    done_by_username: { type: String },
    status: { type: String, default: "pending" },
    reason: { type: String },
    proof: { type: Number, required: true },
    creator: { type: Number, required: true },
    time: { type: Number, required: true }
}, {
    timestamps: true
})

export const pendingMicroCollection = model("microtasks", microTasks)