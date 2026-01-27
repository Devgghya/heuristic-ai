import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    const userId = session?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch user's audits, sorted by newest first
    const { rows } = await sql`
      SELECT * FROM audits 
      WHERE user_id = ${userId} 
      ORDER BY created_at DESC 
      LIMIT 20
    `;

    return NextResponse.json({ history: rows });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    const userId = session?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("id")?.split(",") || [];
    const all = searchParams.get("all") === "true";

    if (all) {
      await sql`
        DELETE FROM audits 
        WHERE user_id = ${userId}
      `;
      return NextResponse.json({ success: true, message: "All audits deleted" });
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: "IDs are required" }, { status: 400 });
    }

    // Individual or Multiple delete
    await sql`
      DELETE FROM audits 
      WHERE id = ANY(${ids as any}) AND user_id = ${userId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Error:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}