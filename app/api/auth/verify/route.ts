import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { createToken, setSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const { email, code } = await req.json();

        if (!email || !code) {
            return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
        }

        // Verify Code
        const { rows: codes } = await sql`
            SELECT * FROM verification_codes 
            WHERE email = ${email} AND code = ${code}
        `;

        if (codes.length === 0) {
            return NextResponse.json({ error: "Invalid code" }, { status: 400 });
        }

        const record = codes[0];
        if (new Date() > new Date(record.expires_at)) {
            return NextResponse.json({ error: "Code expired" }, { status: 400 });
        }

        // Mark user as verified
        const { rows: users } = await sql`
            UPDATE users 
            SET is_verified = TRUE 
            WHERE email = ${email}
            RETURNING id, email, first_name, last_name
        `;

        if (users.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const user = users[0];

        // Clean up code
        await sql`DELETE FROM verification_codes WHERE email = ${email}`;

        // Create Session
        const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "devkulshrestha27@gmail.com").split(",");
        const isAdmin = ADMIN_EMAILS.includes(user.email);

        const token = await createToken({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            isAdmin
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
        console.error("Verification Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
