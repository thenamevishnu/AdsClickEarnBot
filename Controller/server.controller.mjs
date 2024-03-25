const serverStatus = async (req, res) => {
    try {
        return res.status(200).send({message: "Server Up"})
    } catch (err) {
        return res.status(500).send({message: err.message})
    }
}

export default { serverStatus }