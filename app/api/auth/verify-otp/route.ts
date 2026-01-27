import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { createToken, setSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const { email, otp } = await req.json();

        if (!email || !otp) {
            return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
        }

        // Fetch user with matching email and OTP, and check expiry
        const { rows: users } = await sql`
            SELECT id, email, first_name, last_name, otp_expires_at, role, permissions, image_url
            FROM users
            WHERE email = ${email}
            AND otp_code = ${otp}
            AND otp_expires_at > NOW()
            AND is_verified = FALSE
        `;

        if (users.length === 0) {
            return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
        }

        const user = users[0];

        // Mark user as verified and clear OTP
        await sql`
            UPDATE users
            SET is_verified = TRUE, otp_code = NULL, otp_expires_at = NULL
            WHERE id = ${user.id}
        `;

        // Create Session
        const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",");
        const isEnvAdmin = ADMIN_EMAILS.includes(user.email);
        const role = user.role || (isEnvAdmin ? 'admin' : 'user');
        const permissions = user.permissions || [];
        const isAdmin = isEnvAdmin || role === 'admin' || role === 'super_admin';

        const token = await createToken({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            isAdmin,
            role,
            permissions,
            imageUrl: user.image_url
        });

        await setSession(token);

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                isAdmin
            }
        });

    } catch (error) {
        console.error("OTP Verification Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
