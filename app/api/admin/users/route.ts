import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ADMIN_EMAIL = "devkulshrestha27@gmail.com";

export async function GET() {
    try {
        const user = await currentUser();

        if (!user || user.emailAddresses[0].emailAddress !== ADMIN_EMAIL) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // 1. Fetch Backend Usage Data
        const { rows } = await sql`
      SELECT 
        u.user_id,
        u.plan,
        u.audits_used,
        u.token_limit,
        u.updated_at as last_active,
        COUNT(a.id) as total_scans
      FROM user_usage u
      LEFT JOIN audits a ON u.user_id = a.user_id
      GROUP BY u.user_id, u.plan, u.audits_used, u.token_limit, u.updated_at
      ORDER BY u.updated_at DESC
    `;

        // 2. Fetch User Details from Clerk
        const userIds = rows.map(r => r.user_id);
        let clerkUsers: any[] = [];

        if (userIds.length > 0) {
            try {
                const client = await clerkClient();
                const response = await client.users.getUserList({
                    userId: userIds,
                    limit: 100,
                });
                clerkUsers = response.data;
            } catch (err) {
                console.error("Failed to fetch Clerk users", err);
            }
        }

        // 3. Merge Data
        const enrichedUsers = rows.map(row => {
            const clerkUser = clerkUsers.find(u => u.id === row.user_id);
            return {
                ...row,
                email: clerkUser?.emailAddresses[0]?.emailAddress || "Unknown",
                first_name: clerkUser?.firstName || "",
                last_name: clerkUser?.lastName || "",
                image_url: clerkUser?.imageUrl || "",
            };
        });

        return NextResponse.json({ users: enrichedUsers });
    } catch (error) {
        console.error("Admin API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
