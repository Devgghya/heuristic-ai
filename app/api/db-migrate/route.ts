import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await sql`
            ALTER TABLE user_usage 
            ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP;
        `;
        return NextResponse.json({ success: true, message: "Migration completed" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
