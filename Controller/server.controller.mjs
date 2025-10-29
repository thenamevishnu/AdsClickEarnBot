const serverStatus = async (_req, res) => {
    try {
        return res.status(200).send({message: new Date().toLocaleString("default", {
            month: "short",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        }).toUpperCase()})
    } catch (err) {
        return res.status(500).send({message: err.message})
    }
}

export default { serverStatus }