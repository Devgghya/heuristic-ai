import Link from "next/link";
import { getPostBySlug, getAllPosts } from "@/lib/blog";
import { ThemeToggle } from "@/components/theme-toggle";
import { MDXRemote } from "next-mdx-remote/rsc";
import { ArrowLeft, Clock, Calendar, CheckCircle, Quote, AlertTriangle } from "lucide-react";

// Helper components for MDX
const components = {
    h1: (props: any) => <h1 {...props} className="text-3xl md:text-4xl font-black mt-12 mb-6 text-foreground tracking-tight" />,
    h2: (props: any) => <h2 {...props} className="text-2xl md:text-3xl font-bold mt-12 mb-6 text-foreground tracking-tight relative pl-6 border-l-4 border-indigo-500" />,
    h3: (props: any) => <h3 {...props} className="text-xl md:text-2xl font-bold mt-8 mb-4 text-foreground" />,
    p: (props: any) => <p {...props} className="mb-6 text-lg text-muted-text leading-relaxed" />,
    ul: (props: any) => <ul {...props} className="mb-6 space-y-2 list-none pl-2" />,
    li: (props: any) => <li {...props} className="flex gap-3 text-lg text-muted-text"><span className="text-indigo-500 font-bold">•</span><span>{props.children}</span></li>,
    blockquote: (props: any) => (
        <blockquote className="border-l-4 border-indigo-500 pl-6 py-2 my-8 italic text-xl text-foreground font-serif bg-indigo-500/5 rounded-r-xl">
            {props.children}
        </blockquote>
    ),
    a: (props: any) => <a {...props} className="text-indigo-500 hover:text-indigo-400 font-bold underline decoration-2 underline-offset-2 transition-colors" />,
    Callout: ({ type, title, children }: any) => {
        const isWarning = type === 'warning';
        const Icon = isWarning ? AlertTriangle : CheckCircle;
        const colors = isWarning ? "bg-amber-500/10 border-amber-500/20 text-amber-600" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600";

        return (
            <div className={`my-8 p-6 rounded-2xl border ${colors} flex gap-4`}>
                <Icon className="w-6 h-6 shrink-0" />
                <div>
                    {title && <h4 className="font-bold text-lg mb-2">{title}</h4>}
                    <div className="text-base opacity-90">{children}</div>
                </div>
            </div>
        );
    },
};

export async function generateMetadata({ params }: any) {
    const { slug } = await params;
    const post = getPostBySlug(slug);
    return {
        title: `${post.title} | UIXScore Blog`,
        description: post.excerpt,
    };
}

export async function generateStaticParams() {
    const posts = getAllPosts();
    return posts.map((post) => ({
        slug: post.slug,
    }));
}

export default async function BlogPost({ params }: any) {
    const { slug } = await params;
    const post = getPostBySlug(slug);

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "description": post.excerpt,
        "image": "https://uixscore.com/og-image.png", // Fallback, usually dynamic
        "datePublished": post.date,
        "author": {
            "@type": "Organization",
            "name": post.author
        },
        "publisher": {
            "@type": "Organization",
            "name": "UIXScore",
            "logo": {
                "@type": "ImageObject",
                "url": "https://uixscore.com/uixscore-logo.png"
            }
        }
    };

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
        }, {
            "@type": "ListItem",
            "position": 3,
            "name": post.title,
            "item": `https://uixscore.com/blog/${slug}`
        }]
    };

    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
            />
            <nav className="border-b border-border-dim bg-card/80 backdrop-blur-lg sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
                    <Link href="/blog" className="flex items-center gap-2 text-muted-text font-bold hover:text-foreground transition-colors text-sm">
                        <ArrowLeft className="w-4 h-4" /> Back to Blog
                    </Link>
                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <Link href="/dashboard" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition-all shadow-lg shadow-indigo-600/20 hidden md:block">
                            Try UIXScore Free
                        </Link>
                    </div>
                </div>
            </nav>

            <article className="max-w-3xl mx-auto px-6 py-12 md:py-20">
                <header className="mb-12 text-center">
                    <div className="flex items-center justify-center gap-4 text-sm text-muted-text font-bold uppercase tracking-wider mb-6">
                        <span className="bg-indigo-500/10 text-indigo-500 px-3 py-1 rounded-full">{post.tags?.[0]}</span>
                        <span>{post.readTime}</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-foreground mb-6 tracking-tighter leading-[1.1]">
                        {post.title}
                    </h1>
                    <p className="text-xl text-muted-text leading-relaxed max-w-2xl mx-auto mb-8">
                        {post.excerpt}
                    </p>
                    <div className="flex items-center justify-center gap-3 text-sm text-foreground font-medium border-t border-border-dim pt-8 w-max mx-auto px-8">
                        {post.author} • {new Date(post.date).toLocaleDateString()}
                    </div>
                </header>

                <div className="prose prose-lg dark:prose-invert prose-indigo max-w-none">
                    <MDXRemote source={post.content} components={components} />
                </div>

                {/* CTA */}
                <div className="mt-20 p-8 md:p-12 bg-indigo-600 rounded-3xl text-center text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%)]" />
                    <div className="relative z-10">
                        <h3 className="text-3xl font-black mb-4">Improve Your UX Score Today</h3>
                        <p className="text-indigo-100 text-lg mb-8 max-w-xl mx-auto">
                            Don't just read about heuristics—apply them. Audit your site instantly with our AI-powered tool.
                        </p>
                        <Link href="/dashboard" className="inline-block px-8 py-4 bg-white text-indigo-600 rounded-full font-bold text-lg hover:bg-indigo-50 transition-colors shadow-xl">
                            Run Free Audit Now
                        </Link>
                    </div>
                </div>
            </article>
        </div>
    );
}
