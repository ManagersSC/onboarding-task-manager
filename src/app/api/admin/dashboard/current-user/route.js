import { cookies } from "next/headers";
import { unsealData } from "iron-session";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sealedSession = cookieStore.get("session")?.value;
    if (!sealedSession) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
    }

    const session = await unsealData(sealedSession, {
      password: process.env.SESSION_SECRET,
    });

    if (!session || !session.userName || !session.userEmail) {
      return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
    }

    // Handle both admin and user sessions
    const userId = session.userStaffId || session.recordId || null;
    const userRole = session.userRole || 'user';

    return new Response(
      JSON.stringify({ 
        id: userId, 
        name: session.userName, 
        email: session.userEmail,
        userName: session.userName,
        role: userRole
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to get current user", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 