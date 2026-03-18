import { OpenAI } from "openai"
import { readFileSync } from "fs"
import type {
  ChatCompletionTool,
  ChatCompletionMessageParam
} from "openai/resources/chat/completions"
import pushService from "./pushService"
import { PDFParse } from "pdf-parse"

const openai = new OpenAI()

const name = "Khant Nyein Zaw"
const SYSTEM_PROMPT = `You are acting as ${name}. You are answering questions on ${name}'s website, \
particularly questions related to ${name}'s career, background, skills and experience. \
Your responsibility is to represent ${name} for interactions on the website as faithfully as possible. \
You are given a summary of ${name}'s background and LinkedIn profile which you can use to answer questions. \
Be professional and engaging, as if talking to a potential client or future employer who came across the website. \
If you don't know the answer to any question, use your record_unknown_question tool to record the question that you couldn't answer, even if it's about something trivial or unrelated to career. \
If the user is engaging in discussion, try to steer them towards getting in touch via email; ask for their email and record it using your record_user_details tool.`

const historyStore: Record<string, ChatCompletionMessageParam[]> = {}
let cachedSummary: string | null = null
let cachedLinkedInText: string | null = null

const loadContext = async () => {
  if (!cachedSummary) {
    cachedSummary = readFileSync(__dirname + "/../me/summary.txt", "utf-8")
  }
  if (!cachedLinkedInText) {
    const parser = new PDFParse({ url: __dirname + "/../me/linkedin.pdf" })
    const linkedInData = await parser.getText()
    cachedLinkedInText = linkedInData.text
    await parser.destroy()
  }
  return { summary: cachedSummary, linkedInText: cachedLinkedInText }
}

const handleToolCall = async (
  toolCall: any
): Promise<ChatCompletionMessageParam | null> => {
  if (toolCall.type !== "function") return null

  const args = JSON.parse(toolCall.function.arguments)
  let result

  switch (toolCall.function.name) {
    case "recordUserDetails":
      result = await recordUserDetails(args.name, args.email, args.notes)
      break
    case "recordUnknownQuestion":
      result = await recordUnknownQuestion(args.question)
      break
    default:
      console.warn(`Unknown tool called: ${toolCall.function.name}`)
      result = { error: "Unknown tool" }
  }

  return {
    role: "tool",
    content: JSON.stringify(result),
    tool_call_id: toolCall.id
  }
}

const chat = async (prompt: string, sessionId: string = "default") => {
  if (!historyStore[sessionId]) {
    historyStore[sessionId] = []
  }

  const { summary, linkedInText } = await loadContext()

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: `Context Summary: ${summary}` },
    { role: "system", content: `Context LinkedIn: ${linkedInText}` },
    ...(historyStore[sessionId] || []),
    { role: "user", content: prompt }
  ]

  let done = false
  let message

  try {
    while (!done) {
      const response = await openai.chat.completions.create({
        model: "gpt-5-nano",
        messages,
        tools: getTools()
      })

      message = response.choices[0]?.message

      if (
        response.choices[0]?.finish_reason === "tool_calls" &&
        message?.tool_calls
      ) {
        messages.push(message)

        const toolResults = await Promise.all(
          message.tool_calls.map(handleToolCall)
        )

        messages.push(
          ...(toolResults.filter(Boolean) as ChatCompletionMessageParam[])
        )
      } else {
        done = true
      }
    }

    if (message?.content) {
      const history = historyStore[sessionId] ?? []
      history.push({ role: "user", content: prompt })
      history.push({
        role: "assistant",
        content: message.content
      })
      historyStore[sessionId] = history
    }

    return message?.content
  } catch (error) {
    console.error("Chat error:", error)
    return "Something went wrong: " + error
  }
}

const recordUserDetails = async (
  name: string,
  email: string,
  notes: string
): Promise<{ recorded: string }> => {
  pushService.sendPushNotification(
    `Recording interest from ${name} with email ${email} and notes ${notes}`
  )
  return { recorded: "ok" }
}

const recordUnknownQuestion = async (
  question: string
): Promise<{ recorded: string }> => {
  pushService.sendPushNotification(`Recording unknown question: ${question}`)
  return { recorded: "ok" }
}

const getTools = (): ChatCompletionTool[] => {
  return [
    {
      type: "function",
      function: {
        name: "recordUserDetails",
        description:
          "Use this tool to record that a user is interested in being in touch and provided an email address",
        parameters: {
          type: "object",
          properties: {
            email: {
              type: "string",
              description: "The email address of this user"
            },
            name: {
              type: "string",
              description: "The user's name, if they provided it"
            },
            notes: {
              type: "string",
              description:
                "Any additional information about the conversation that's worth recording to give context"
            }
          },
          required: ["email"],
          additionalProperties: false
        }
      }
    },
    {
      type: "function",
      function: {
        name: "recordUnknownQuestion",
        description:
          "Always use this tool to record any question that couldn't be answered as you didn't know the answer",
        parameters: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description: "The question that couldn't be answered"
            }
          },
          required: ["question"],
          additionalProperties: false
        }
      }
    }
  ]
}

export default { chat, recordUserDetails, recordUnknownQuestion }
