import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const emailSearch = searchParams.get("email");
        const session = await getSession();

        if (!session || !session.isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // 1. Fetch Backend Usage and User Data (Joined)
        let rows; // Declare rows here to be accessible after the try-catch block

        // Try fetching with last_ip first
        try {
            let query;
            if (emailSearch) {
                query = sql`
                    SELECT 
                        u.id as user_id,
                        u.email,
                        u.first_name,
                        u.last_name,
                        u.image_url,
                        u.role,
                        u.permissions,
                        u.last_ip,
                        uu.plan,
                        uu.audits_used,
                        uu.token_limit,
                        uu.updated_at as last_active,
                        (SELECT COUNT(*) FROM audits a WHERE a.user_id = u.id::text) as total_scans
                    FROM users u
                    LEFT JOIN user_usage uu ON u.id::text = uu.user_id
                    WHERE u.email ILIKE ${'%' + emailSearch + '%'} AND u.is_verified = TRUE
                    ORDER BY u.created_at DESC
                `;
            } else {
                query = sql`
                    SELECT 
                        u.id as user_id,
                        u.email,
                        u.first_name,
                        u.last_name,
                        u.image_url,
                        u.role,
                        u.permissions,
                        u.last_ip,
                        uu.plan,
                        uu.audits_used,
                        uu.token_limit,
                        uu.updated_at as last_active,
                        (SELECT COUNT(*) FROM audits a WHERE a.user_id = u.id::text) as total_scans
                    FROM users u
                    LEFT JOIN user_usage uu ON u.id::text = uu.user_id
                    WHERE u.is_verified = TRUE
                    ORDER BY u.created_at DESC
                    LIMIT 100
                `;
            }
            const result = await query;
            rows = result.rows;
        } catch (dbError: any) {
            // Fallback if 'last_ip' column doesn't exist yet
            if (dbError.message?.includes('column') || dbError.message?.includes('does not exist')) {
                console.warn("Retrying admin fetch without last_ip column...");
                let query;
                if (emailSearch) {
                    query = sql`
                        SELECT 
                            u.id as user_id,
                            u.email,
                            u.first_name,
                            u.last_name,
                            u.image_url,
                            u.role,
                            u.permissions,
                            -- u.last_ip removed
                            uu.plan,
                            uu.audits_used,
                            uu.token_limit,
                            uu.updated_at as last_active,
                            (SELECT COUNT(*) FROM audits a WHERE a.user_id = u.id::text) as total_scans
                        FROM users u
                        LEFT JOIN user_usage uu ON u.id::text = uu.user_id
                        WHERE u.email ILIKE ${'%' + emailSearch + '%'} AND u.is_verified = TRUE
                        ORDER BY u.created_at DESC
                    `;
                } else {
                    query = sql`
                        SELECT 
                            u.id as user_id,
                            u.email,
                            u.first_name,
                            u.last_name,
                            u.image_url,
                            u.role,
                            u.permissions,
                            -- u.last_ip removed
                            uu.plan,
                            uu.audits_used,
                            uu.token_limit,
                            uu.updated_at as last_active,
                            (SELECT COUNT(*) FROM audits a WHERE a.user_id = u.id::text) as total_scans
                        FROM users u
                        LEFT JOIN user_usage uu ON u.id::text = uu.user_id
                        WHERE u.is_verified = TRUE
                        ORDER BY u.created_at DESC
                        LIMIT 100
                    `;
                }
                const result = await query;
                rows = result.rows;
            } else {
                throw dbError; // Rethrow other errors
            }
        }

        const enrichedUsers = rows.map(row => ({
            ...row,
            plan: row.plan || "free",
            role: row.role || "user",
            permissions: row.permissions || [],
            audits_used: row.audits_used || 0,
            token_limit: row.token_limit || 2000,
            plan_expires_at: row.plan_expires_at,
            total_scans: parseInt(row.total_scans || "0"),
        }));

        return NextResponse.json({ users: enrichedUsers });
    } catch (error) {
        console.error("Admin API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await getSession();

        if (!session || !session.isAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Granular check - requires 'delete_users' permission OR super_admin role
        const hasPermission = session.role === 'super_admin' || (session.permissions && session.permissions.includes('delete_users'));
        // Special case: Dev email always allowed if Admin
        const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",");
        const isEnvAdmin = ADMIN_EMAILS.includes(session.email);

        if (!hasPermission && !isEnvAdmin) {
            return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
        }

        const { userIds } = await req.json();

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json({ error: "Invalid user IDs" }, { status: 400 });
        }

        // Prevent deleting self
        if (userIds.includes(session.id)) {
            return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
        }

        // Execute cascade deletion
        // Delete from all related tables before deleting user
        const ids = userIds as string[];
        let deletionLog: string[] = [];

        console.log(`[User Deletion] Starting cascade deletion for ${ids.length} user(s): ${ids.join(', ')}`);

        // Get user emails for password_resets and verification_codes deletion
        const { rows: userEmails } = await sql`SELECT email FROM users WHERE id::text = ANY(${ids as any}::text[])`;
        const emails = userEmails.map(row => row.email);

        // 1. Delete password reset tokens
        try {
            if (emails.length > 0) {
                await sql`DELETE FROM password_resets WHERE email = ANY(${emails as any}::text[])`;
                deletionLog.push(`✅ Deleted password_resets for ${emails.length} email(s)`);
            }
        } catch (error: any) {
            deletionLog.push(`⚠️ password_resets: ${error.message}`);
        }

        // 2. Delete verification codes
        try {
            if (emails.length > 0) {
                await sql`DELETE FROM verification_codes WHERE email = ANY(${emails as any}::text[])`;
                deletionLog.push(`✅ Deleted verification_codes for ${emails.length} email(s)`);
            }
        } catch (error: any) {
            // Table might not exist, that's okay
            deletionLog.push(`⚠️ verification_codes: ${error.message}`);
        }

        // 3. Delete payment orders
        try {
            const paymentResult = await sql`DELETE FROM payment_orders WHERE user_id::text = ANY(${ids as any}::text[])`;
            deletionLog.push(`✅ Deleted ${paymentResult.rowCount || 0} payment_orders`);
        } catch (error: any) {
            deletionLog.push(`⚠️ payment_orders: ${error.message}`);
        }

        // 4. Delete user usage data
        try {
            const usageResult = await sql`DELETE FROM user_usage WHERE user_id::text = ANY(${ids as any}::text[])`;
            deletionLog.push(`✅ Deleted ${usageResult.rowCount || 0} user_usage records`);
        } catch (error: any) {
            deletionLog.push(`❌ user_usage: ${error.message}`);
            throw error; // This is critical, should not fail
        }

        // 5. Delete audits
        try {
            const auditResult = await sql`DELETE FROM audits WHERE user_id::text = ANY(${ids as any}::text[])`;
            deletionLog.push(`✅ Deleted ${auditResult.rowCount || 0} audits`);
        } catch (error: any) {
            deletionLog.push(`❌ audits: ${error.message}`);
            throw error; // This is critical, should not fail
        }

        // 6. Finally, delete users
        try {
            const userResult = await sql`DELETE FROM users WHERE id::text = ANY(${ids as any}::text[])`;
            deletionLog.push(`✅ Deleted ${userResult.rowCount || 0} users`);
        } catch (error: any) {
            deletionLog.push(`❌ users: ${error.message}`);
            throw error; // This is critical, should not fail
        }

        console.log(`[User Deletion] Complete:`, deletionLog.join(' | '));

        return NextResponse.json({
            success: true,
            count: userIds.length,
            log: deletionLog
        });

    } catch (error: any) {
        console.error("Admin Bulk Delete Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
