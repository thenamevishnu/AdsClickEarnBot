import express from "express"
import "./Config/database.mjs"
import serverRoute from "./Router/server.route.mjs"

import "./Controller/text.controller.mjs"
import "./Controller/message.controller.mjs"
import "./Controller/callback.controller.mjs"

const app = express()

app.use("/server", serverRoute)

app.listen(process.env.PORT || 6001, () => {
    console.log(`Running: ${process.env.PORT || 6001}`)
})