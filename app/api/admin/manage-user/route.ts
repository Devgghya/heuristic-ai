import { getSession } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

const PLAN_TOKENS = {
    free: 2000,
    lite: 2500,
    plus: 3000,
    pro: 4000,
    agency: 8000,
};

export async function POST(req: Request) {
    try {
        const session = await getSession();

        if (!session || !session.isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const { userId, action, plan, email, password, firstName, lastName, role, permissions } = body;

        if (action === "update-plan") {
            if (!userId) return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
            const tokenLimit = PLAN_TOKENS[plan as keyof typeof PLAN_TOKENS] || 2000;
            const periodKey = new Date().toISOString().slice(0, 7);
            await sql`
                INSERT INTO user_usage (user_id, plan, token_limit, period_key, updated_at)
                VALUES (${userId}, ${plan}, ${tokenLimit}, ${periodKey}, NOW())
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    plan = EXCLUDED.plan, 
                    token_limit = EXCLUDED.token_limit, 
                    updated_at = NOW()
            `;
            return NextResponse.json({ success: true, plan });
        }

        if (action === "downgrade") {
            if (!userId) return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
            // Reset to Free Plan
            await sql`
                UPDATE user_usage
                SET plan = 'free', token_limit = ${PLAN_TOKENS.free}, updated_at = NOW()
                WHERE user_id = ${userId}
            `;
            return NextResponse.json({ success: true, plan: "free" });
        }

        if (action === "update-access") {
            if (!userId) return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
            // Check Granular Permissions
            const hasPermission = session.role === 'super_admin' || (session.permissions && session.permissions.includes('manage_admins'));
            // Special case: Dev email always allowed
            const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",");
            const isEnvAdmin = ADMIN_EMAILS.includes(session.email);

            if (!hasPermission && !isEnvAdmin) {
                return NextResponse.json({ error: "Insufficient permissions to manage access" }, { status: 403 });
            }

            // Validate Role
            if (!['user', 'admin', 'super_admin'].includes(role)) {
                return NextResponse.json({ error: "Invalid role" }, { status: 400 });
            }

            // Update User
            await sql`
                UPDATE users
                SET role = ${role}, permissions = ${permissions}
                WHERE id = ${userId}
            `;

            return NextResponse.json({ success: true, role, permissions });
        }

        if (action === "update-expiry") {
            const { expiresAt } = body;
            if (!userId) return NextResponse.json({ error: "Missing user ID" }, { status: 400 });

            await sql`
                UPDATE user_usage
                SET plan_expires_at = ${expiresAt}, updated_at = NOW()
                WHERE user_id = ${userId}
            `;
            return NextResponse.json({ success: true, expiresAt });
        }

        if (action === "create-user") {
            if (!email || !password || !firstName || !lastName) {
                return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
            }

            // Check if user already exists
            const { rows: existingUsers } = await sql`SELECT id FROM users WHERE email = ${email}`;
            if (existingUsers.length > 0) {
                return NextResponse.json({ error: "User with this email already exists" }, { status: 400 });
            }

            const passwordHash = await bcrypt.hash(password, 10);

            // Create verified user
            const { rows: newUser } = await sql`
                INSERT INTO users (email, password_hash, first_name, last_name, is_verified, created_at)
                VALUES (${email}, ${passwordHash}, ${firstName}, ${lastName}, TRUE, NOW())
                RETURNING id
            `;

            const userId = newUser[0].id;

            // Initialize usage
            const tokenLimit = PLAN_TOKENS.free;
            const periodKey = new Date().toISOString().slice(0, 7);
            await sql`
                INSERT INTO user_usage (user_id, plan, token_limit, period_key, updated_at)
                VALUES (${userId}, 'free', ${tokenLimit}, ${periodKey}, NOW())
            `;

            return NextResponse.json({ success: true, userId });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Admin Manage User Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
