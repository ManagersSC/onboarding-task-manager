import Airtable from "airtable"
import logger from "@/lib/utils/logger"

export async function GET(req){
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
        throw new Error("Airtable environment variables are missing")
    }
    const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

    try{
        const staffs = await base("Staff")
        .select({
            filterByFormula: `AND({isAdmin}=1, NOT({Password} =''))`,
        })
        .all()

        const staff = staffs.map((rec) => ({
            id: rec.id,
            name: rec.get("Name")
        }))

        return new Response(JSON.stringify(staff), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        })
    } catch (error){
        logger.error(error);
        return new Response(JSON.stringify({ error: "Failed to fetch staff" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}