import { Router } from "express"
import linksController from "../Controller/links.controller.mjs"

const app = Router()

app.get("/:user_id", linksController.verification)
app.get("/check/:user_id", linksController.verificationCheck)

export default app