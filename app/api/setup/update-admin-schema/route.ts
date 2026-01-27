import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
    try {
        await sql`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user',
            ADD COLUMN IF NOT EXISTS permissions TEXT[];
        `;
        return NextResponse.json({ success: true, message: "Admin Schema updated successfully" });
    } catch (error: any) {
        console.error("Schema Update Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
