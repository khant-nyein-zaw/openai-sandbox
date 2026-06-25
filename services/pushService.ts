import axios from "axios"

interface PushoverPayload {
  token: string
  user: string
  message: string
  title?: string
  sound?: string
  priority?: number
  device?: string
  url?: string
  url_title?: string
}

interface PushoverResponse {
  success: boolean
  message: string
  request?: string
}

const PUSHOVER_API_URL = "https://api.pushover.net/1/messages.json"

/**
 * Sends a push notification to a user's testing device via the Pushover API.
 *
 * @param message - The notification message body
 * @param title - Optional notification title
 * @param options - Optional additional Pushover parameters (sound, priority, device, url, etc.)
 * @returns A promise resolving to the Pushover response
 */
const sendPushNotification = async (
  message: string,
  title?: string,
  options?: Partial<
    Pick<PushoverPayload, "sound" | "priority" | "device" | "url" | "url_title">
  >
): Promise<PushoverResponse> => {
  const appToken = process.env.PUSHOVER_TOKEN
  const userKey = process.env.PUSHOVER_USER

  if (!appToken || !userKey) {
    return {
      success: false,
      message:
        "Missing PUSHOVER_TOKEN or PUSHOVER_USER in environment variables"
    }
  }

  const payload: PushoverPayload = {
    token: appToken,
    user: userKey,
    message,
    ...(title && { title }),
    ...options
  }

  try {
    const response = await axios.post(PUSHOVER_API_URL, payload, {
      headers: {
        "Content-Type": "application/json"
      }
    })

    if (response.data?.status === 1) {
      return {
        success: true,
        message: "Push notification sent successfully",
        request: response.data.request
      }
    }

    return {
      success: false,
      message:
        response.data?.errors?.join(", ") || "Failed to send push notification"
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Pushover error:", error.response?.data || error.message)
      return {
        success: false,
        message: error.response?.data?.errors?.join(", ") || error.message
      }
    }

    console.error("Unexpected error sending push notification:", error)
    return {
      success: false,
      message: "An unexpected error occurred"
    }
  }
}

export default { sendPushNotification }
