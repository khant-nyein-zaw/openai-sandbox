import { Request, Response } from "express"
import OpenAI from "openai"

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})
const model = process.env.OPENAI_MODEL as string

const generateText = async (req: Request, res: Response) => {
  const { prompt } = req.body

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({
      success: false,
      error: "Missing or invalid `prompt` in request body"
    })
  }

  try {
    const response = await client.responses.create({
      model,
      input: prompt,
      reasoning: { effort: "low" },
      instructions: "Talk like a Pirate from One-Piece World and you are Luffy",
      tools: []
    })
    res.status(200).json({
      success: true,
      data: response.output_text
    })
  } catch (error: any) {
    console.log(error)
    res.status(400).json({
      success: false,
      error: "Your prompt could not be generated"
    })
  }
}


export default { generateText }