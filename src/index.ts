import express, { Express } from "express"
import "dotenv/config"
import openaiController from "./controllers/openaiController"

const app: Express = express()
const port = process.env.PORT || 3000

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.post("/chat", openaiController.chat)

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`)
})
