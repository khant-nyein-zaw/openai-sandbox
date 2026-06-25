import { Request, Response } from "express"
import chatService from "../services/chatService"

interface ChatRequest {
  prompt: string
  session_id?: string
}

const chat = async (req: Request, res: Response) => {
  const { prompt, session_id: sessionId }: ChatRequest = req.body

  try {
    const response = await chatService.chat(prompt, sessionId)
    res.status(200).json({
      success: true,
      data: response
    })
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: "Your prompt could not be generated"
    })
  }
}

export default { chat }