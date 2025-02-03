import { cookies } from "next/headers"

export async function POST(request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return Response.json({ error: "Email is required" }, { status: 400 })
    }

    // Set cookie with email
    const cookieStore = await cookies()
    cookieStore.set("user_email", email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    })

    return Response.json({ message: "Logged in successfully" })
  } catch (error) {
    console.error('Full Error:', {
      message: error.message,
      stack: error.stack
    })
    return Response.json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : null
    }, { status: 500 })
  }
}

