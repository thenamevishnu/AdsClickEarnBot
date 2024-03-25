import axios from "axios"
import cronJob from "node-cron"

cronJob.schedule("* * * * *", async () => {
    try {
        const { data } = await axios.get(`${process.env.SERVER}/server/status`)
        console.log(data.message)
    } catch (err) {
        console.log(err.message)
    }
})