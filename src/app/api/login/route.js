import { cookies } from "next/headers"
import logger from "@/lib/logger"
import Airtable from "airtable";
import bcrypt from "bcryptjs";

// Login route
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

export async function login(request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return Response.json({ error: "Email and password is required" }, { status: 400 })
    }

    // Fetch user from Airtable
    const users = await base("Applicants")
      .select(
        {
          filterByFormula: `{Email}='${email}'`,
          maxRecords: 1
        }
      )
    .firstPage();

    if(users.length === 0){
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const user = users[0];
    const storedHashedPassword = user.fields.Password;

    // Compare Password
    const isMatch = await bcrypt.compare(password, storedHashedPassword);
    if(!isMatch){
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set("user_email", email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    })

    return Response.json({ message: "Logged in successfully" })
  } catch (error) {
    logger.error('Full Error:', {
      message: error.message,
      stack: error.stack
    })
    return Response.json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' ? error.message : null
    }, { status: 500 })
  }
}

