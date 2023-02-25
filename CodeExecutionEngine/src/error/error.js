module.exports.serverError = async (res, message) => {
    res.status(500).json({
        type: 'error',
        message
    })
}