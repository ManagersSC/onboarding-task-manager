import { cookies } from "next/headers"
import { unsealData } from "iron-session"

export async function GET() {
  try {
    // Authentication check
    const cookieStore = await cookies()
    const sealedSession = cookieStore.get("session")?.value
    
    if (!sealedSession) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 })
    }

    const session = await unsealData(sealedSession, {
      password: process.env.SESSION_SECRET,
    })

    if (!session || session.userRole !== 'admin') {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    }

    return new Response(JSON.stringify({
      message: "API is working correctly",
      user: {
        name: session.userName,
        email: session.userEmail,
        role: session.userRole
      },
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      error: "Test failed",
      details: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}
