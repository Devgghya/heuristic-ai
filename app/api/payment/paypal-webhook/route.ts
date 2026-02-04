import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import crypto from "crypto";

const PAYPAL_API = process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

// Verify PayPal webhook signature
async function verifyWebhookSignature(
    req: NextRequest,
    webhookId: string,
    body: string
): Promise<boolean> {
    try {
        const headers = {
            "auth-algo": req.headers.get("paypal-auth-algo") || "",
            "cert-url": req.headers.get("paypal-cert-url") || "",
            "transmission-id": req.headers.get("paypal-transmission-id") || "",
            "transmission-sig": req.headers.get("paypal-transmission-sig") || "",
            "transmission-time": req.headers.get("paypal-transmission-time") || "",
        };

        // Get PayPal access token
        const auth = Buffer.from(
            `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
        ).toString("base64");

        const tokenResponse = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
            method: "POST",
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
        });

        const { access_token } = await tokenResponse.json();

        // Verify webhook signature
        const verifyResponse = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${access_token}`,
            },
            body: JSON.stringify({
                auth_algo: headers["auth-algo"],
                cert_url: headers["cert-url"],
                transmission_id: headers["transmission-id"],
                transmission_sig: headers["transmission-sig"],
                transmission_time: headers["transmission-time"],
                webhook_id: webhookId,
                webhook_event: JSON.parse(body),
            }),
        });

        const verifyData = await verifyResponse.json();
        return verifyData.verification_status === "SUCCESS";
    } catch (error) {
        console.error("Webhook verification error:", error);
        return false;
    }
}

export async function POST(req: NextRequest) {
    try {
        const webhookId = process.env.PAYPAL_WEBHOOK_ID;
        if (!webhookId || webhookId === "your_paypal_webhook_id_here") {
            console.error("PayPal webhook ID not configured");
            return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
        }

        const body = await req.text();

        // Verify webhook signature
        const isValid = await verifyWebhookSignature(req, webhookId, body);
        if (!isValid) {
            console.error("Invalid PayPal webhook signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        const event = JSON.parse(body);
        const eventType = event.event_type;

        console.log("PayPal Webhook Event:", eventType);

        // Handle different event types
        switch (eventType) {
            case "CHECKOUT.ORDER.APPROVED":
            case "PAYMENT.CAPTURE.COMPLETED": {
                // Extract order/payment details
                const resource = event.resource;
                const orderId = resource.id;
                const customId = resource.purchase_units?.[0]?.custom_id; // User ID
                const amount = resource.purchase_units?.[0]?.amount?.value;

                if (!customId) {
                    console.error("No user ID in PayPal webhook");
                    return NextResponse.json({ received: true });
                }

                // Get order details from database
                const orderResult = await sql`
                    SELECT plan_id FROM payment_orders
                    WHERE order_id = ${orderId} AND user_id = ${customId}
                `;

                if (orderResult.rows.length === 0) {
                    console.error(`Order ${orderId} not found in database`);
                    return NextResponse.json({ received: true });
                }

                const planId = orderResult.rows[0].plan_id;

                // Update payment order status
                await sql`
                    UPDATE payment_orders
                    SET status = 'completed', updated_at = NOW()
                    WHERE order_id = ${orderId}
                `;

                // Calculate expiry date based on plan
                let expiresAt: Date;
                if (planId === "test") {
                    // Test plan: 7 days
                    expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + 7);
                } else {
                    // Regular plans: 30 days (monthly)
                    expiresAt = new Date();
                    expiresAt.setDate(expiresAt.getDate() + 30);
                }

                // Update user plan
                await sql`
                    UPDATE users
                    SET plan = ${planId},
                        plan_expires_at = ${expiresAt.toISOString()},
                        subscription_id = ${orderId},
                        updated_at = NOW()
                    WHERE id = ${customId}
                `;

                console.log(`✅ Plan ${planId} activated for user ${customId}`);
                break;
            }

            case "BILLING.SUBSCRIPTION.ACTIVATED": {
                // Handle subscription activation
                const subscription = event.resource;
                const subscriberId = subscription.subscriber?.email_address;
                const planId = subscription.plan_id;

                console.log("Subscription activated:", subscription.id);
                // Add subscription handling logic here when you set up PayPal subscription plans
                break;
            }

            case "BILLING.SUBSCRIPTION.CANCELLED":
            case "BILLING.SUBSCRIPTION.EXPIRED": {
                // Handle subscription cancellation/expiry
                const subscription = event.resource;
                console.log("Subscription ended:", subscription.id);
                // Add cancellation handling logic here
                break;
            }

            default:
                console.log(`Unhandled PayPal event type: ${eventType}`);
        }

        return NextResponse.json({ received: true });

    } catch (error: any) {
        console.error("PayPal Webhook Error:", error);
        return NextResponse.json(
            { error: "Webhook processing failed", details: error.message },
            { status: 500 }
        );
    }
}
