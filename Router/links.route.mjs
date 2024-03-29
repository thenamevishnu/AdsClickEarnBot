import { Router } from "express"
import linksController from "../Controller/links.controller.mjs"

const app = Router()

app.get("/visit/:campaign", linksController.visitSite)

export default app