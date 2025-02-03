import Airtable from "airtable";
import { cookies } from "next/headers";

export async function POST(request) {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
    console.error("ctServer configuration error: Missing API key or base ID");
    return Response.json({ error: "Server configuration error" }, { status: 500 });
  }

  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_BASE_ID);

  try {
    const { taskId } = await request.json();
    console.log("ctReceived request with taskId:", taskId);
    if (!taskId) {
      console.error("ctMissing taskId in request body");
      return Response.json({ error: "Missing taskId" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const userEmail = cookieStore.get("user_email")?.value;
    console.log("User email from cookies:", userEmail);
    if (!userEmail) {
      console.error("ctUnauthorized access: No user_email found in cookies");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update the Status field in the Onboarding Tasks Logs table
    const updateResult = await base("Onboarding Tasks Logs").update([
      {
        id: taskId,
        fields: {
          Status: "Completed",
        },
      },
    ]);

    console.log("ctUpdate result:", updateResult);
    console.log("ctTask completed successfully for task log record:", taskId);

    return Response.json({ message: "Task completed successfully" });
  } catch (error) {
    console.error("Full Error:", {
      message: error.message,
      stack: error.stack,
    });
    return Response.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.message : null,
      },
      { status: 500 }
    );
  }
}