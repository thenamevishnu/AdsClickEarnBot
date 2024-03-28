import { randomBytes } from "crypto"

export const createOrderId = (length=16) => {
    const buffer = randomBytes(length)
    const hash = buffer.toString('hex')
    return hash
}