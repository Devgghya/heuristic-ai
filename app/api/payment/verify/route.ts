import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSession } from "@/lib/auth";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";

const FREE_MAX_TOKENS = 2000;
const PRO_MAX_TOKENS = 4000;
const DESIGN_MAX_TOKENS = 8000;

export async function POST(req: Request) {
    try {
        const session = await getSession();
        const userId = session?.id;
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await req.json();
        const {
            razorpay_payment_id,
            razorpay_signature,
            planId,
            billingCycle = "monthly",
            type = "order"
        } = data;

        let expectedSignature = "";

        if (type === "subscription") {
            const { razorpay_subscription_id } = data;
            const body = razorpay_payment_id + "|" + razorpay_subscription_id;
            expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET!)
                .update(body)
                .digest("hex");
        } else {
            const { razorpay_order_id } = data;
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
                .update(body)
                .digest("hex");
        }

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // Payment Verified - Update User Plan
            let targetTokenLimit = FREE_MAX_TOKENS;
            if (planId === "pro") targetTokenLimit = PRO_MAX_TOKENS;
            else if (planId === "design") targetTokenLimit = DESIGN_MAX_TOKENS;

            const current = new Date().toISOString().slice(0, 7);
            const expiresAt = new Date();
            if (billingCycle === "annual") {
                expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 Year
            } else {
                expiresAt.setDate(expiresAt.getDate() + 30); // 30 Days
            }

            // Using subscription_id in notes/db if possible
            const subscriptionId = data.razorpay_subscription_id || null;

            await sql`
                INSERT INTO user_usage (user_id, plan, audits_used, period_key, token_limit, plan_expires_at, subscription_id)
                VALUES (${userId}, ${planId}, 0, ${current}, ${targetTokenLimit}, ${expiresAt.toISOString()}, ${subscriptionId})
                ON CONFLICT (user_id) DO UPDATE SET
                  plan = EXCLUDED.plan,
                  token_limit = EXCLUDED.token_limit,
                  plan_expires_at = EXCLUDED.plan_expires_at,
                  subscription_id = EXCLUDED.subscription_id,
                  updated_at = NOW()
            `;

            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }
    } catch (error: any) {
        console.error("Razorpay Verify Error:", error);
        return NextResponse.json({ error: "Verification failed", details: error.message }, { status: 500 });
    }
}
