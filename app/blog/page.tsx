import Link from "next/link";
import { getAllPosts } from "@/lib/blog";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileButton } from "@/components/user-profile-button";
import { ArrowLeft, Clock, Calendar, ChevronRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "UX & Accessibility Blog | UIXScore",
    description: "Expert insights on heuristic evaluation, WCAG compliance, and automated design audits.",
};

export default function BlogIndex() {
    const posts = getAllPosts();

    const breadcrumbLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [{
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://uixscore.com"
        }, {
            "@type": "ListItem",
            "position": 2,
            "name": "Blog",
            "item": "https://uixscore.com/blog"
        }]
    };

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
            />
            {/* HEADER */}
            <nav className="border-b border-border-dim bg-card/80 backdrop-blur-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-2 text-foreground font-bold hover:opacity-80 transition-opacity">
                        <img src="/uixscore-logo.png" alt="UIXScore" className="w-8 h-8 rounded-lg" />
                        <span>UIXScore</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <Link href="/dashboard" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition-all shadow-lg shadow-indigo-600/20">
                            Launch App
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-12 md:py-20">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h1 className="text-4xl md:text-6xl font-black text-foreground mb-6 tracking-tight">
                        Design Engineering <br /><span className="text-indigo-500">Insights</span>
                    </h1>
                    <p className="text-xl text-muted-text leading-relaxed">
                        Deep dives into UX auditing, accessibility standards, and the future of AI-driven design.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {posts.map((post) => (
                        <Link key={post.slug} href={`/blog/${post.slug}`} className="group relative block h-full">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-3xl transform group-hover:scale-[1.02] transition-transform duration-300" />
                            <article className="relative h-full bg-card border border-border-dim rounded-3xl overflow-hidden p-6 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-col">
                                <div className="mb-4 flex items-center gap-2 text-xs font-bold text-indigo-500 uppercase tracking-wider">
                                    {post.tags?.[0] || "Article"}
                                </div>
                                <h2 className="text-2xl font-bold text-foreground mb-3 group-hover:text-indigo-500 transition-colors leading-tight">
                                    {post.title}
                                </h2>
                                <p className="text-muted-text text-sm leading-relaxed mb-6 line-clamp-3">
                                    {post.excerpt}
                                </p>

                                <div className="mt-auto flex items-center justify-between pt-6 border-t border-border-dim">
                                    <div className="flex items-center gap-4 text-xs text-muted-text font-medium">
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(post.date).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.readTime}</span>
                                    </div>
                                    <span className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                        <ChevronRight className="w-4 h-4" />
                                    </span>
                                </div>
                            </article>
                        </Link>
                    ))}
                </div>
            </main>

            <footer className="border-t border-border-dim bg-card/30 backdrop-blur-lg mt-20">
                <div className="max-w-7xl mx-auto px-6 py-12 text-muted-text text-sm flex flex-col md:flex-row justify-between items-center gap-4">
                    <p>
                        © {new Date().getFullYear()} UIXScore. All rights reserved.
                    </p>
                    <div className="flex gap-6 font-bold">
                        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
                        <Link href="/dashboard" className="hover:text-foreground transition-colors">Audit Tool</Link>
                        <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
