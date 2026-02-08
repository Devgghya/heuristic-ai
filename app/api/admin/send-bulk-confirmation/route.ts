import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendPaymentConfirmationEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const session = await getSession();

        if (!session || !session.isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Get active subscribers
        const query = sql`
            SELECT 
                u.email,
                u.first_name,
                uu.plan,
                uu.plan_expires_at
            FROM users u
            JOIN user_usage uu ON u.id::text = uu.user_id
            WHERE uu.plan != 'free' 
            AND uu.plan_expires_at > NOW()
        `;

        const result = await query;
        const users = result.rows;

        const results = {
            total: users.length,
            success: 0,
            failed: 0,
            errors: [] as string[]
        };

        console.log(`[Bulk Email] Starting send for ${users.length} users...`);

        for (const user of users) {
            try {
                const formattedDate = new Date(user.plan_expires_at).toLocaleDateString('en-GB'); // DD/MM/YYYY
                const formattedPlan = user.plan.charAt(0).toUpperCase() + user.plan.slice(1);

                await sendPaymentConfirmationEmail({
                    to: user.email,
                    planName: formattedPlan,
                    expiryDate: formattedDate
                });
                results.success++;
                console.log(`[Bulk Email] Sent to ${user.email}`);
            } catch (error: any) {
                results.failed++;
                results.errors.push(`${user.email}: ${error.message}`);
                console.error(`[Bulk Email] Failed for ${user.email}:`, error);
            }
        }

        return NextResponse.json({
            message: "Bulk email process completed",
            results
        });

    } catch (error: any) {
        console.error("Bulk Email Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
