import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";



const PLAN_PRICES_CENTS = {
    lite: 200,    // $2.00
    plus: 500,    // $5.00
    pro: 1900,    // $19.00
    agency: 4900, // $49.00
};

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { planId } = await req.json();

        if (!planId || !PLAN_PRICES_CENTS[planId as keyof typeof PLAN_PRICES_CENTS]) {
            return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
        }

        const amount = PLAN_PRICES_CENTS[planId as keyof typeof PLAN_PRICES_CENTS];

        const razorpay = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });

        // Receipt max length is 40. Clerk IDs are long. Shorten the receipt.
        const shortReceipt = `rcpt_${Date.now().toString().slice(-10)}`;

        const options = {
            amount: amount,
            currency: "USD",
            receipt: shortReceipt,
            notes: {
                userId: userId,
                plan: planId,
            },
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json({
            id: order.id,
            amount: order.amount,
            currency: order.currency,
        });
    } catch (error: any) {
        console.error("Razorpay Create Order Error:", error);
        return NextResponse.json({
            error: "Failed to create order",
            details: error.message,
            debug: {
                hasKeyId: !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                hasSecret: !!process.env.RAZORPAY_KEY_SECRET
            }
        }, { status: 500 });
    }
}
