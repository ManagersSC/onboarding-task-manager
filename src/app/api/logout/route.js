// src/app/api/logout/route.js
import { cookies } from "next/headers";
import logger from "@/lib/logger";

export async function logout(request) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("user_email");
    return Response.json({ message: "Logged out successfully" });
  } catch (error) {
    logger.error("Logout Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
