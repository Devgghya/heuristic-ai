import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS audits (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        ui_title VARCHAR(255),
        image_url TEXT,
        framework VARCHAR(50),
        analysis JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

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

    return NextResponse.json({ message: "Table 'audits' created successfully" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
