import axios from "axios"
import cronJob from "node-cron"

cronJob.schedule("* * * * *", async () => {
    try {
        await axios.get(`${process.env.SERVER}/server/status`)
    } catch (err) {
        console.log(err.message)
    }
})