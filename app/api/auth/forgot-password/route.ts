import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        console.log(`[Forgot Password] Received request for email: ${email}`);

        // Check if user exists
        const { rows } = await sql`SELECT id FROM users WHERE email = ${email}`;
        if (rows.length === 0) {
            // Return success even if email not found to prevent enumeration
            console.log(`[Forgot Password] User not found for email: ${email}, but returning success`);
            return NextResponse.json({ success: true });
        }

        // Generate token
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        console.log(`[Forgot Password] Generated token for ${email}, expires at: ${expiresAt.toISOString()}`);

        // Save to DB
        await sql`
            INSERT INTO password_resets (email, token, expires_at)
            VALUES (${email}, ${token}, ${expiresAt.toISOString()})
        `;

        console.log(`[Forgot Password] Token saved to database for ${email}`);

        // Send Email
        await sendPasswordResetEmail(email, token);

        console.log(`[Forgot Password] Reset email sent successfully to ${email}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Forgot Password] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
