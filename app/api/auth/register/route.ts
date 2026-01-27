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
        const { rows: existingUsers } = await sql`SELECT id, is_verified FROM users WHERE email = ${email}`;

        const passwordHash = await bcrypt.hash(password, 10);
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        let user;

        if (existingUsers.length > 0) {
            const existingUser = existingUsers[0];
            if (existingUser.is_verified) {
                return NextResponse.json({ error: "Email already registered" }, { status: 400 });
            } else {
                // User exists but is NOT verified. Update the record (Reset).
                const { rows: updatedUser } = await sql`
                    UPDATE users
                    SET password_hash = ${passwordHash}, 
                        first_name = ${firstName}, 
                        last_name = ${lastName}, 
                        otp_code = ${otpCode}, 
                        otp_expires_at = ${otpExpiresAt.toISOString()}
                    WHERE id = ${existingUser.id}
                    RETURNING id, email, first_name, last_name
                `;
                user = updatedUser[0];
            }
        } else {
            // New User
            const { rows: newUser } = await sql`
                INSERT INTO users (email, password_hash, first_name, last_name, otp_code, otp_expires_at, is_verified)
                VALUES (${email}, ${passwordHash}, ${firstName}, ${lastName}, ${otpCode}, ${otpExpiresAt.toISOString()}, FALSE)
                RETURNING id, email, first_name, last_name
            `;
            user = newUser[0];
        }

        // Send OTP Email
        await sendEmail({
            to: user.email,
            subject: "Verify your email - Heuristic AI",
            html: `
                <!DOCTYPE html>
                <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0a0a; color: #f8fafc; margin: 0; padding: 40px;">
                    <div style="max-width: 500px; margin: 0 auto; background-color: #121214; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden;">
                        <div style="padding: 32px; text-align: center; border-bottom: 1px solid #1e293b;">
                            <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://heuristic.ai'}/heuristic-logo.png" alt="Heuristic.ai" width="48" height="48" style="border-radius: 8px;" />
                            <h1 style="margin: 16px 0 0; font-size: 24px; font-weight: 800; color: #f8fafc;">Heuristic<span style="color: #818cf8;">.ai</span></h1>
                        </div>
                        <div style="padding: 40px 32px; text-align: center;">
                            <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #f8fafc;">Verify your email address</h2>
                            <p style="margin: 0 0 32px; color: #94a3b8; line-height: 1.5;">Please use the following verification code to complete your registration. This code will expire in 10 minutes.</p>
                            
                            <div style="background-color: rgba(129, 140, 248, 0.1); border: 1px solid rgba(129, 140, 248, 0.2); border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                                <span style="font-family: monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #818cf8; display: block;">${otpCode}</span>
                            </div>

                            <p style="margin: 0; font-size: 13px; color: #64748b;">If you didn't request this code, you can safely ignore this email.</p>
                        </div>
                        <div style="background-color: #0a0a0a; padding: 20px; text-align: center; border-top: 1px solid #1e293b;">
                             <p style="margin: 0; font-size: 11px; color: #475569;">&copy; ${new Date().getFullYear()} Heuristic.ai • All rights reserved</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        // Do NOT create session token yet.
        // Instead return success and indicate OTP is required.

        return NextResponse.json({
            success: true,
            requireOtp: true,
            email: user.email
        });

    } catch (error: any) {
        console.error("Registration Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
