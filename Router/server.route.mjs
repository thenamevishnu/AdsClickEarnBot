import { Router } from "express"
import serverController from "../Controller/server.controller.mjs"
const app = Router()

app.get("/status", serverController.serverStatus)

export default app