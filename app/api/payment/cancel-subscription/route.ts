import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getSession } from "@/lib/auth";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";

export async function POST(req: Request) {
    try {
        const session = await getSession();
        const userId = session?.id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get subscription ID from database for this user
        const { rows } = await sql`SELECT subscription_id FROM user_usage WHERE user_id = ${userId}`;
        const subscriptionId = rows[0]?.subscription_id;

        if (!subscriptionId) {
            return NextResponse.json({ error: "No active subscription found to cancel." }, { status: 400 });
        }

        const razorpay = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });

        // Cancel the subscription in Razorpay
        await razorpay.subscriptions.cancel(subscriptionId);

        // Update database (setting subscription_id to null but keeping plan until expiry)
        // Or we keep subscription_id but mark as cancelling. 
        // For simplicity, we just null it out so they can't cancel again.
        // The plan will remain active until plan_expires_at is reached.
        await sql`
            UPDATE user_usage 
            SET subscription_id = NULL,
                updated_at = NOW()
            WHERE user_id = ${userId}
        `;

        return NextResponse.json({ success: true, message: "Subscription cancelled successfully. You will have access until your current period ends." });

    } catch (error: any) {
        console.error("Razorpay Cancel Error:", error);
        return NextResponse.json({ error: "Failed to cancel subscription", details: error.message }, { status: 500 });
    }
}
