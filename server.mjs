import express from "express"
import "./Config/database.mjs"
import serverRoute from "./Router/server.route.mjs"
import paymentRoute from "./Router/payment.route.mjs"

import "./Controller/text.controller.mjs"
import "./Controller/message.controller.mjs"
import "./Controller/callback.controller.mjs"

const app = express()
app.use(express.json())

app.use("/server", serverRoute)
app.use("/payments", paymentRoute)

app.listen(process.env.PORT || 6001, () => {
    console.log(`Running: ${process.env.PORT || 6001}`)
})