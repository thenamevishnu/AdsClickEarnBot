import axios from "axios"

export const createPaymentLink = async (user_id, amount, callbackUrl, orderId) => {

    const headers = {
        "merchant_api_key": process.env.OXAPAY_MERCHANT,
        "Content-Type": "application/json"
    };

    const data = JSON.stringify({
        amount: amount,
        currency: "USDT",
        lifeTime: 30,
        feePaidByPayer: 0,
        underPaidCover: 0,
        callbackUrl: callbackUrl,
        description: `${user_id}`,
        orderId: `${orderId}`,
    })

    try {
        const { data: response } = await axios.post(process.env.OXAPAY_REQUEST_API, data, { headers });
        return response.data
    } catch (error) {
        return null
    }
}

export const createPayout = async (user_id, receiver_crypto_address, amount, callbackUrl) => {
        
    const headers = {
        "payout_api_key": process.env.OXAPAY_PAYOUT,
        "Content-Type": "application/json"
    };

    const body = {
        address: receiver_crypto_address,
        amount: amount,
        currency: "USDT",
        network: "TRC20",
        callbackUrl: callbackUrl,
        description: `${user_id}`
    }

    try {
        const { data: response } = await axios.post(process.env.OXAPAY_PAYOUT_API, body, { headers })
        return response.status
    } catch (error) {
        return null
    }
}