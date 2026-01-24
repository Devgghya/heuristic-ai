import { currentUser } from "@clerk/nextjs/server";
import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ADMIN_EMAIL = "devkulshrestha27@gmail.com";
const FREE_MAX_TOKENS = 2000;

export async function POST(req: Request) {
    try {
        const user = await currentUser();

        if (!user || user.emailAddresses[0].emailAddress !== ADMIN_EMAIL) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const { userId, action } = await req.json();

        if (!userId || action !== "downgrade") {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        // Reset to Free Plan
        await sql`
      UPDATE user_usage
      SET plan = 'free', token_limit = ${FREE_MAX_TOKENS}, updated_at = NOW()
      WHERE user_id = ${userId}
    `;

        return NextResponse.json({ success: true, plan: "free" });
    } catch (error) {
        console.error("Admin Manage User Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
