import Airtable from "airtable";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import logger from "@/lib/logger";

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

export async function signup(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await base("Applicants")
      .select({ filterByFormula: `{Email}='${email}'`, maxRecords: 1 })
      .firstPage();

    if (existingUser.length > 0) {
      return Response.json({ error: "User already exists" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store hashed password in Airtable
    await base("Applicants").update([
        {
            id: existingUser.id,
            fields: {
                Password: hashedPassword
            }
        }
    ]);

    return Response.json({ message: "User registered successfully", recordId: existingUser.id });
  } catch (error) {
    logger.error("Signup Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}