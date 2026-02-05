"use client";

import { PricingPlans } from "@/app/dashboard/PricingPlans";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileButton } from "@/components/user-profile-button";
import { useAuth } from "@/components/auth-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PricingPageClient() {
    const { user, loading } = useAuth();
    const isSignedIn = !!user;
    const router = useRouter();

    const handleUpgrade = (planId: string) => {
        // If user is not logged in, redirect to login
        if (!isSignedIn) {
            window.location.href = `/register?plan=${planId}`;
            return;
        }
        // If user is logged in, redirect to dashboard
        router.push("/dashboard?tab=pricing");
    };

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
            <nav className="border-b border-border-dim bg-card/80 backdrop-blur-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2 text-foreground font-bold hover:opacity-80 transition-opacity">
                        <img src="/uixscore-logo.png" alt="UIXScore" className="w-8 h-8 rounded-lg" />
                        <span>UIXScore</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        {!loading && isSignedIn ? <UserProfileButton /> : (
                            <Link href="/login" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition-all">Sign In</Link>
                        )}
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-12">
                <PricingPlans
                    currentPlan={"guest"}
                    onUpgrade={handleUpgrade}
                    planExpiresAt={null}
                    subscriptionId={null}
                />
            </main>
        </div>
    );
}
