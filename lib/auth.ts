import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { sql } from '@vercel/postgres';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'fallback-secret-change-me'
);

export interface AuthUser {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    isAdmin: boolean;
    role?: 'user' | 'admin' | 'super_admin';
    permissions?: string[];
    imageUrl?: string;
}

export async function createToken(user: AuthUser) {
    return await new SignJWT({ ...user })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<AuthUser | null> {
    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as unknown as AuthUser;
    } catch (error) {
        return null;
    }
}

export async function getSession(): Promise<AuthUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) return null;

    const user = await verifyToken(token);
    if (!user) return null;

    // Validate user still exists in database (for immediate logout on deletion)
    try {
        const { rows } = await sql`SELECT id FROM users WHERE id = ${user.id}`;
        if (rows.length === 0) {
            // User was deleted, invalidate session
            console.log(`[Auth] User ${user.id} no longer exists, invalidating session`);
            return null;
        }
    } catch (error) {
        console.error('[Auth] Session validation error:', error);
        return null;
    }

    return user;
}

export async function setSession(token: string) {
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
    });
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete('auth_token');
}
