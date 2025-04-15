import { cookies } from "next/headers";

export async function GET(){
    const cookieStore = cookies();
    const userEmail = (await cookieStore).get("session");
    return Response.json({ isAuthenticated: !!userEmail });
}