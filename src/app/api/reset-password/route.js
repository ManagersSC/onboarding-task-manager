// Reset password route
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
    process.env.AIRTABLE_BASE_ID
);

export async function resetPassword(request) {
    try {
      const { resetToken, newPassword } = await request.json();
  
      if (!resetToken || !newPassword) {
        return Response.json({ error: "Invalid request" }, { status: 400 });
      }
  
      // Decode token to get email
      const decoded = Buffer.from(resetToken, "base64").toString("utf-8");
      const [email] = decoded.split(":");
  
      // Check if user exists
      const users = await base("Applicants")
        .select({ filterByFormula: `{Email}='${email}'`, maxRecords: 1 })
        .firstPage();
  
      if (users.length === 0) {
        return Response.json({ error: "Invalid token or user not found" }, { status: 400 });
      }
  
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      // Update password in Airtable
      await base("Applicants").update(users[0].id, {
        Password: hashedPassword,
      });
  
      return Response.json({ message: "Password reset successful" });
    } catch (error) {
      logger.error("Reset Password Error:", error);
      return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}