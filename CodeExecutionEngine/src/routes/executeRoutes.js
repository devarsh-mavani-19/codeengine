const express = require('express')
const router = express.Router()
const executeController = require('../controllers/executeController')
const { verifyUser } = require('../middleware/authenticationMIddleware')

router.route('/').post(verifyUser, executeController.executeCode)

module.exports = router