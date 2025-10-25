import express from "express"
import path, {dirname} from "path"
import { fileURLToPath } from "url"
import "./Config/database.mjs"
import serverRoute from "./Router/server.route.mjs"
import linkRoute from "./Router/links.route.mjs"
import paymentRoute from "./Router/payment.route.mjs"
import verificationRoute from "./Router/verify.route.mjs"
import "./Utils/cron.mjs"
import "./telegram.mjs"

const app = express()

app.set("view engine", "ejs")
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
app.set('views', path.join(__dirname, 'Web'))

app.use(express.json())

app.use("/server", serverRoute)
app.use("/payments", paymentRoute)
app.use("/links", linkRoute)
app.use("/verification", verificationRoute)

app.listen(process.env.PORT || 6001, () => {
    console.log(`Running: ${process.env.PORT || 6001}`)
})