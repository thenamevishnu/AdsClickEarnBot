import { randomBytes } from "crypto"

export const createOrderId = (length=16) => {
    const buffer = randomBytes(length)
    const hash = buffer.toString('hex')
    return hash
}

export const isValidTRXAddress = (address) => {
    const trxAddressRegex = /^(T[0-9a-zA-Z]{33})$/;
    return trxAddressRegex.test(address);
}