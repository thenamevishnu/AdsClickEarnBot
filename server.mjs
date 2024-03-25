import express from "express"
import serverRoute from "./Router/server.route.mjs"
import "./Utils/cron.mjs"

const app = express()

app.use("/server", serverRoute)

app.listen(process.env.PORT || 6001, () => {
    console.log(`Running: ${process.env.PORT || 6001}`)
})