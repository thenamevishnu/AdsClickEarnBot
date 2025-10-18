import mongoose from "mongoose";

mongoose.connect(process.env.DATABASE_URL, {
    dbName: process.env.DATABASE_NAME,
    autoIndex: false
}).then(() => {
    console.log("Database Connected!")
}).catch(err => {
    console.log(err.message)
})