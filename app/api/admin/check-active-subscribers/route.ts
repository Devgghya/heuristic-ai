import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const session = await getSession();

        if (!session || !session.isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const query = sql`
            SELECT 
                u.email,
                u.first_name,
                u.last_name,
                uu.plan,
                uu.plan_expires_at
            FROM users u
            JOIN user_usage uu ON u.id::text = uu.user_id
            WHERE uu.plan != 'free' 
            AND uu.plan_expires_at > NOW()
            ORDER BY uu.plan_expires_at DESC
        `;

        const result = await query;

        return NextResponse.json({
            count: result.rowCount,
            recipients: result.rows
        });

    } catch (error: any) {
        console.error("Check Active Subscribers Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
