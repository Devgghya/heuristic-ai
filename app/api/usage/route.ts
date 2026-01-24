import { auth } from "@clerk/nextjs/server";
import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const FREE_AUDIT_LIMIT = 2;
const LITE_AUDIT_LIMIT = 5;
const PLUS_AUDIT_LIMIT = 12;

const FREE_MAX_TOKENS = 2000;
const LITE_MAX_TOKENS = 2500;
const PLUS_MAX_TOKENS = 3000;
const PRO_MAX_TOKENS = 4000;
const AGENCY_MAX_TOKENS = 8000;

const periodKey = () => new Date().toISOString().slice(0, 7); // YYYY-MM

type Usage = {
  plan: "free" | "lite" | "plus" | "pro" | "agency";
  auditsUsed: number;
  tokenLimit: number;
  period: string;
  auditLimit?: number | null;
};

async function ensureUsage(userId: string): Promise<Usage> {
  const current = periodKey();
  await sql`
    CREATE TABLE IF NOT EXISTS user_usage (
      user_id VARCHAR(255) PRIMARY KEY,
      plan VARCHAR(20) DEFAULT 'free',
      audits_used INTEGER DEFAULT 0,
      period_key VARCHAR(7) NOT NULL,
      token_limit INTEGER DEFAULT 2000,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  const { rows } = await sql`
    SELECT plan, audits_used, period_key
    FROM user_usage
    WHERE user_id = ${userId}
  `;

  if (rows.length === 0) {
    await sql`
      INSERT INTO user_usage (user_id, plan, audits_used, period_key, token_limit)
      VALUES (${userId}, 'free', 0, ${current}, ${FREE_MAX_TOKENS})
    `;
    return { plan: "free", auditsUsed: 0, tokenLimit: FREE_MAX_TOKENS, period: current };
  }

  const row = rows[0];
  let auditsUsed = row.audits_used || 0;
  let storedPeriod = row.period_key || current;

  if (storedPeriod !== current) {
    await sql`
      UPDATE user_usage
      SET audits_used = 0, period_key = ${current}, updated_at = NOW()
      WHERE user_id = ${userId}
    `;
    auditsUsed = 0;
    storedPeriod = current;
  }

  const plan = (row.plan || "free") as Usage["plan"];

  let tokenLimit = FREE_MAX_TOKENS;
  if (plan === "lite") tokenLimit = LITE_MAX_TOKENS;
  else if (plan === "plus") tokenLimit = PLUS_MAX_TOKENS;
  else if (plan === "pro") tokenLimit = PRO_MAX_TOKENS;
  else if (plan === "agency") tokenLimit = AGENCY_MAX_TOKENS;

  let auditLimit: number | null = null;
  if (plan === "free") auditLimit = FREE_AUDIT_LIMIT;
  else if (plan === "lite") auditLimit = LITE_AUDIT_LIMIT;
  else if (plan === "plus") auditLimit = PLUS_AUDIT_LIMIT;

  return { plan, auditsUsed, tokenLimit, period: storedPeriod, auditLimit };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({
      plan: "guest",
      audits_used: 0,
      limit: FREE_AUDIT_LIMIT,
      token_limit: FREE_MAX_TOKENS,
    });
  }

  const usage = await ensureUsage(userId);
  return NextResponse.json({
    plan: usage.plan,
    audits_used: usage.auditsUsed,
    limit: usage.plan === "free" ? FREE_AUDIT_LIMIT : usage.plan === "lite" ? LITE_AUDIT_LIMIT : usage.plan === "plus" ? PLUS_AUDIT_LIMIT : null,
    token_limit: usage.tokenLimit,
    period_key: usage.period,
  });
}

export async function POST(req: Request) {
  return NextResponse.json({ error: "Deprecated. Use payment gateway." }, { status: 403 });
}
