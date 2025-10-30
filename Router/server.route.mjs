import { Router } from "express"
import serverController from "../Controller/server.controller.mjs"
const app = Router()

app.get("/server/status", serverController.serverStatus)
app.get("/", serverController.website)

export default app