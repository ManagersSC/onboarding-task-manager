import { cookies } from "next/headers";
import { sealData } from "iron-session";
import logger from "@/lib/utils/logger";
import Airtable from "airtable";
import bcrypt from "bcryptjs";
import { logAuditEvent } from "@/lib/auditLogger";

// Login route
export async function POST(request) {
    let base;
    let normalisedEmail;
    let userRole;
    let userName;

    try{
        const { email, password } = await request.json();
        if(!email || !password){
            return new Response(
                JSON.stringify({
                    error: "Email and password is required",
                    userError: "Email and password is required",
                }),
                { status: 400 },
            )
        }

        const escapedEmail = email.replace(/'/g, "''");
        normalisedEmail = escapedEmail.trim().toLowerCase();

        if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
            logger.error("Server configuration error: Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID")
            return Response.json(
                {
                    error: "Server configuration error",
                    userError: "Apologies, we are experiencing a internal error. Please try again later.",
                },
                { status: 500 },
            )
        }

        base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

        // Fetch admin user from Airtable
        const admins = await base("Staff")
            .select({
                filterByFormula: `AND({Email}='${normalisedEmail}', {IsAdmin}=TRUE())`,
                maxRecords: 1,
            }
        ).firstPage();

        if (admins.length === 0) {
            return new Response(
                JSON.stringify({
                    error: "Invalid credentials",
                    userError: "Invalid admin credentials or insufficient permissions.",
                }),
                { status: 401 },
            )
        }

        const admin = admins[0];
        
        const storedHashedPassword = admin.fields.Password;

        // Not Registered or no password set
        if (!storedHashedPassword) {
            return new Response(
                JSON.stringify({
                    error: "Invalid credentials",
                    userError: "Admin account not properly configured. Please contact support.",
                }),
                { status: 401 },
            )
        }

        // Compare Password
        const isMatch = await bcrypt.compare(password, storedHashedPassword)
        if (!isMatch) {
            return new Response(
                JSON.stringify({
                    error: "Invalid credentials",
                    userError: "Wrong email or password.",
                }),
                { status: 401 },
            )
        }


        // Set encrypted session cookie with admin role
        const cookieStore = await cookies();
        const sessionData = {
            userEmail: normalisedEmail,
            userRole: 'admin',
            userName: admin.fields.Name
        }
        logger.debug(`Session Data to add: \nemail: ${sessionData.userEmail} \nrole: ${sessionData.userRole}`)
        const sealedSession = await sealData(sessionData, {
            password: process.env.SESSION_SECRET,
            ttl: 60 * 60 * 8, // 8 hours expiration
        })
        cookieStore.set("session", sealedSession, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 8
        });

        userRole = sessionData.userRole;
        userName = sessionData.userName;

        logAuditEvent({
            eventType: "Login",
            eventStatus: "Success",
            userRole: userRole,
            userName: userName,
            userIdentifier: normalisedEmail,
            detailedMessage: `Admin login: ${normalisedEmail}`,
            request
        })

        return new Response(
            JSON.stringify({
                message: "logged in successfully",
                role: "admin",
                name: admin.fields.Name || "Admin",
            }),
        )
    } catch (error){
        logger.error("Admin Login Error:", {
            message: error.message,
            stack: error.stack,
        });

        logAuditEvent({
            eventType: "Login",
            eventStatus: "Error",
            userRole: userRole || "Unknown",
            userName: userName || "Unknown",
            userIdentifier: normalisedEmail,
            detailedMessage: `Admin login failed, error message: ${error.message}`,
            request,
        });
        
        return new Response(
            JSON.stringify({
              error: `Internal server error. Error: ${error.message}`,
              details: process.env.NODE_ENV === "development" ? error.message : null,
            }),
            { status: 500 },
        )
    }
}