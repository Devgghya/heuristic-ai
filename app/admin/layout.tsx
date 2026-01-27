import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    if (!session || !session.isAdmin) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent-primary/30 transition-colors duration-300">
            <nav className="border-b border-border-dim bg-card sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent-primary rounded-lg flex items-center justify-center font-bold text-white">A</div>
                        <span className="font-bold text-lg">Admin Console</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <a href="/dashboard" className="text-sm text-muted-text hover:text-foreground transition-colors">
                            Back to App
                        </a>
                    </div>
                </div>
            </nav>
            <main className="max-w-7xl mx-auto px-6 py-12">
                {children}
            </main>
        </div>
    );
}
