import { cookies } from "next/headers";
import logger from "@/lib/logger";
import { unsealData } from "iron-session";
import Airtable from "airtable";
import { logAuditEvent } from "@/lib/auditLogger";
import format from "date-fns/format";

export async function GET(request){
    let userEmail;
    let userRole;
    let userName;
    try{
        // Session Cookie
        const sessionCookie = (await cookies()).get('session')?.value;
        if(!sessionCookie){
            logger.debug("API GET ACTIVITY: No sessionCookie");
            return Response.json({ error: "Unauthorised"},{ status: 401 })
        }
        let session;
        try{
            session = await unsealData(sessionCookie, {
              password: process.env.SESSION_SECRET,
              ttl: 60 * 60 * 8,
            });
        } catch (error) {
            logger.debug(`Invalid session: ${error.message}`)
            return Response.json({ 
              error: "invalid Session",
              details: process.env.NODE_ENV === "development" ? error.message : null
            }, { status: 401 });
        }
        if(!session.userEmail){
            logger.debug(`Invalid session format`)
            return Response.json(
                { error: "Invalid session format" },
                { status: 401 }
            );
        }

        // Get Role
        userRole = session.userRole;
        if(userRole !== "admin"){
            return Response.json(
                { error: "Unauthorised" }, { status: 401 }
            )
        }

        userEmail = session.userEmail;

        // logger.debug(`Activity API: cookie email: ${userEmail} role: ${userRole}`);

        // Get Filter Query Params
        const { searchParams } = new URL(request.url);
        const filter = searchParams.get("filter") || "all";
        const limit = Number.parseInt(searchParams.get("limit") || "15", 10);

        // Airtable
        if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
            logger.error("Server configuration error: Missing Airtable credentials")
            return Response.json({ error: "Server configuration error" }, { status: 500 })
        }

        const base = new Airtable(
            { apiKey: process.env.AIRTABLE_API_KEY}
        ).base(process.env.AIRTABLE_BASE_ID);

        // Build filter formula based on the filter parameter
        let filterFormula = "";

        if (filter === "user") {
            filterFormula = "{Role}='User'";
        } else if (filter === "admin") {
            filterFormula = "{Role} = 'Admin'";
        } else if (filter === "all"){
            filterFormula = "TRUE()";
        }

        // Get activity from Website Log table
        const activityResponse = await base("Website Audit Log")
            .select({
                maxRecords: limit,
                sort: [{ field: "Timestamp", direction: "desc" }],
                filterByFormula: filterFormula,
                fields: ["Timestamp", "Event Type", "Role", "Name", "Event Status", "User Identifier", "Detailed Message"]
        }).firstPage();

        logger.debug(`Acitvity records length: ${activityResponse.length}`)

        // Format activities for frontend
        const activities = activityResponse.map((record) => {
            const fields = record.fields;
            const timestamp = new Date(fields.Timestamp);
            const now = new Date();

            // Calculate time ago
            const diffMs = now - timestamp;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            let timeAgo;
            if (diffDays > 0) {
                timeAgo = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
            } else if (diffHours > 0) {
                timeAgo = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
            } else if (diffMins > 0) {
                timeAgo = `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`
            } else {
                timeAgo = "Just now"
            }

            // Map event type to acitivity map
            let type;
            switch (fields["Event Type"]){
                case "Task Complete":
                    type = "task_completed";
                    break
                case "Sign Up":
                    type = "signup";
                    break
                case "Login":
                    type = "login";
                    break
                case "Logout":
                    type = "logout";
                    break
                case "Reset Password":
                    type = "reset_password"
                    break
                default:
                    type = "other"
            }

            // Extract User Info
            userName = fields["Name"];
            const userIdentifier = fields["User Identifier"] || "Unknown";
            const isEmail = userIdentifier.includes("@");
            const acitivityRole = fields["Role"];

            if(!userName){
                if(isEmail){
                    userName = userIdentifier.split("@")[0];
                }
            }

            return {
                type,
                description: fields["Detailed Message"] || "Activity recorded",
                timeAgo,
                timestamp: fields.Timestamp,
                status: fields["Event Status"],
                user: {
                    email: isEmail ? userIdentifier : null,
                    name: userName,
                    role: acitivityRole
                }
            }
        });
        // logger.debug(`All activities: ${activities}`)

        return Response.json ({ activities });
    } catch (error){
        logger.error("Error fetching admin activites: ", error);
        logAuditEvent({
            eventType: "Server",
            eventStatus: "Error",
            userRole: userRole || "Unknown",
            userIdentifier: userEmail,
            detailedMessage: `Admin login failed, error message: ${error.message}`,
            request,
        })
        return Response.json(
            { error: "Internal server error"},
            { status: 500 }
        )
    }
}