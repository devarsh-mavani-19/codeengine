let API_KEYS = []
API_KEYS = process.env.GRANTED_KEY.split(",")
module.exports.verifyUser = (req, res, next) => {
    console.log(API_KEYS)
    next()
}