const express = require('express')
const app = express()
const port = process.env.PORT || 3000
const executeRouter = require('./routes/executeRoutes')

app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!!!!!')
})

app.use("/api/v1/execute", executeRouter)

app.listen(port,async () => {
  // initialize
  await require('./initialize')()
  console.log(`Example app listening on port ${port}`)
})

