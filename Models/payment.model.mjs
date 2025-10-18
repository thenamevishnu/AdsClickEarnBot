import { Schema, model } from "mongoose";

const payment = new Schema({
    user_id: {
        type: Number
    },
    amount: {
        type: Number
    },
    payAmount: {
        type: Number
    },
    network: {
        type: String  
    },
    type: {
        type: String  
    },
    status: {
        type: String
    },
    currency: {
        type: String
    },
    payCurrency: {
        type: String
    },
    orderId: {
        type: String
    },
    date: {
        type: Number
    },
    payDate: {
        type: Number  
    },
    trackId: {
        type: Number,
        unique: true
    },
    address: {
        type: String  
    },
    txID: {
        type: String
    },
    txs: {
        type: Array,
        default: []
    }
}, {
    timestamps: true
})

export const paymentCollection = model("payments", payment)