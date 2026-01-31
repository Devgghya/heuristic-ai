import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        // Fetch user
        const { rows: users } = await sql`
            SELECT id, email, is_verified, otp_expires_at
            FROM users
            WHERE email = ${email}
        `;

        if (users.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const user = users[0];

        if (user.is_verified) {
            return NextResponse.json({ error: "Email already verified" }, { status: 400 });
        }

        // Generate new OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Update User
        await sql`
            UPDATE users
            SET otp_code = ${otpCode}, otp_expires_at = ${otpExpiresAt.toISOString()}
            WHERE id = ${user.id}
        `;

        // Send OTP Email
        await sendEmail({
            to: user.email,
            subject: "Verify your email - UIXScore",
            html: `
                <!DOCTYPE html>
                <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0a0a; color: #f8fafc; margin: 0; padding: 40px;">
                    <div style="max-width: 500px; margin: 0 auto; background-color: #121214; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden;">
                        <div style="padding: 32px; text-align: center; border-bottom: 1px solid #1e293b;">
                            <img src="${process.env.NEXT_PUBLIC_APP_URL || 'https://uixscore.com'}/uixscore-logo.png" alt="UIXScore" width="48" height="48" style="border-radius: 8px;" />
                            <h1 style="margin: 16px 0 0; font-size: 24px; font-weight: 800; color: #f8fafc;">UIXScore<span style="color: #818cf8;"></span></h1>
                        </div>
                        <div style="padding: 40px 32px; text-align: center;">
                            <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #f8fafc;">Verify your email address</h2>
                            <p style="margin: 0 0 32px; color: #94a3b8; line-height: 1.5;">Here is your new verification code. This code will expire in 10 minutes.</p>
                            
                            <div style="background-color: rgba(129, 140, 248, 0.1); border: 1px solid rgba(129, 140, 248, 0.2); border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                                <span style="font-family: monospace; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #818cf8; display: block;">${otpCode}</span>
                            </div>

                            <p style="margin: 0; font-size: 13px; color: #64748b;">If you didn't request this code, you can safely ignore this email.</p>
                        </div>
                        <div style="background-color: #0a0a0a; padding: 20px; text-align: center; border-top: 1px solid #1e293b;">
                             <p style="margin: 0; font-size: 11px; color: #475569;">&copy; ${new Date().getFullYear()} UIXScore • All rights reserved</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        return NextResponse.json({ success: true, message: "OTP resent successfully" });

    } catch (error) {
        console.error("Resend OTP Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
