import { cookies } from "next/headers";

export async function GET(){
    const cookieStore = cookies();
    const userEmail = (await cookieStore).get("user_email");
    return Response.json({ isAuthenticated: !!userEmail });
}