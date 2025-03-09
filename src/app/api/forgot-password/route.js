// Forgot password route
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);

export async function forgotPassword(request) {
    try {
      const { email } = await request.json();
  
      if (!email) {
        return Response.json({ error: "Email is required" }, { status: 400 });
      }
  
      // Check if user exists
      const users = await base("Applicants")
        .select({ filterByFormula: `{Email}='${email}'`, maxRecords: 1 })
        .firstPage();
  
      if (users.length === 0) {
        return Response.json({ error: "User not found" }, { status: 404 });
      }
  
      // Generate reset token (simple base64 encoding for now, consider JWT for better security)
      const resetToken = Buffer.from(`${email}:${Date.now()}`).toString("base64");
      
      // Trigger Make.com webhook for email delivery
      await fetch(process.env.MAKE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, resetToken }),
      });
  
      return Response.json({ message: "Password reset email sent" });
    } catch (error) {
      logger.error("Forgot Password Error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}