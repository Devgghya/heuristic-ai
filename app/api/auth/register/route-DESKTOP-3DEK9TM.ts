import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createToken, setSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const { email, password, firstName, lastName } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        // Check if user already exists
        const { rows: existingUsers } = await sql`SELECT id FROM users WHERE email = ${email}`;
        if (existingUsers.length > 0) {
            return NextResponse.json({ error: "Email already registered" }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        // create user with is_verified = false (default)
        const { rows: newUser } = await sql`
            INSERT INTO users (email, password_hash, first_name, last_name, is_verified)
            VALUES (${email}, ${passwordHash}, ${firstName}, ${lastName}, FALSE)
            RETURNING id, email, first_name, last_name
        `;

        const user = newUser[0];

        // Generate 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        // Store OTP
        await sql`
            INSERT INTO verification_codes (email, code, expires_at)
            VALUES (${email}, ${code}, ${expiresAt})
            ON CONFLICT (email) DO UPDATE 
            SET code = ${code}, expires_at = ${expiresAt}
        `;

        // Send Email
        await sendEmail({
            to: email,
            subject: "Verify your email - Heuristic AI",
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h1 style="color: #6366f1;">Verify your email</h1>
                    <p>Thanks for signing up for Heuristic AI. Use the code below to verify your account:</p>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111;">${code}</span>
                    </div>
                    <p>This code will expire in 15 minutes.</p>
                </div>
            `
        });

        return NextResponse.json({
            success: true,
            requireVerification: true,
            email: user.email
        });

    } catch (error) {
        console.error("Registration Error:", error);
        console.error("Registration Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error", details: JSON.stringify(error) }, { status: 500 });
    }
}
