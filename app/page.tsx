"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Zap, LayoutDashboard, ShieldCheck, Image as ImageIcon, Rocket, Eye, GitCompare } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function HomePage() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefsRef = useRef<(HTMLElement | null)[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const updateGlow = () => {
      cardRefsRef.current.forEach((card) => {
        if (card) {
          const rect = card.getBoundingClientRect();
          const cardCenterX = rect.left + rect.width / 2;
          const cardCenterY = rect.top + rect.height / 2;
          const distance = Math.sqrt(
            Math.pow(mousePos.x - cardCenterX, 2) + Math.pow(mousePos.y - cardCenterY, 2)
          );
          const maxDistance = 300;
          const intensity = Math.max(0, 1 - distance / maxDistance);
          const angle = Math.atan2(mousePos.y - cardCenterY, mousePos.x - cardCenterX);

          const background = `radial-gradient(
            circle at ${Math.cos(angle) * 100 + 50}% ${Math.sin(angle) * 100 + 50}%,
            rgba(99, 102, 241, ${intensity * 0.4}) 0%,
            rgba(99, 102, 241, ${intensity * 0.1}) 40%,
            transparent 70%
          )`;
          const boxShadow = `0 0 ${20 + intensity * 30}px rgba(99, 102, 241, ${intensity * 0.5})`;

          const glowLayer = card.querySelector(".glow-layer") as HTMLElement;
          if (glowLayer) {
            glowLayer.style.background = background;
            glowLayer.style.boxShadow = boxShadow;
          }
        }
      });

      animationFrameRef.current = requestAnimationFrame(updateGlow);
    };

    animationFrameRef.current = requestAnimationFrame(updateGlow);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [mousePos]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white" ref={containerRef}>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-indigo-600/20 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[140px]" />
        </div>
        
        {/* Navigation Header */}
        <div className="relative z-20 max-w-6xl mx-auto px-6 py-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold">Heuristic<span className="text-indigo-400">.ai</span></h1>
          </div>
          
          <div>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold text-sm transition-all">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 md:py-20">
          <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            AI-powered UI/UX Audits
          </h2>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl">
            Upload screenshots or a live URL and get precise, actionable feedback
            based on Nielsen, WCAG, and Gestalt principles.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/dashboard" className="px-8 py-4 bg-white text-black rounded-xl font-bold text-base hover:bg-slate-200 transition-colors flex items-center gap-2">
              <Rocket className="w-5 h-5" /> Launch App
            </Link>
          </div>

          <p className="mt-6 text-xs text-slate-500">Accessible to everyone — even when signed in.</p>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: ImageIcon, title: "Upload or URL", desc: "Paste screenshots or analyze a live site with instant captures.", color: "indigo" },
            { icon: ShieldCheck, title: "Industry Heuristics", desc: "Nielsen, WCAG 2.1, and Gestalt guidance synthesized for you.", color: "emerald" },
            { icon: LayoutDashboard, title: "Exportable Reports", desc: "Generate official PDF findings for stakeholders and teammates.", color: "amber" },
          ].map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                ref={(el) => { if (el) cardRefsRef.current[idx] = el; }}
                className="bg-[#121214] border border-white/5 rounded-2xl p-6 relative overflow-hidden transition-all duration-300 hover:border-white/10"
              >
                <div className="glow-layer absolute inset-0 pointer-events-none rounded-2xl" />
                <div className="relative z-10">
                  <div className={`w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 text-${feature.color}-400`} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400">{feature.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-12 text-center">
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-5 py-3 bg-white text-black rounded-xl font-bold text-sm hover:bg-slate-200">
            Get Started
          </Link>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full mb-4">
            <Rocket className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-indigo-300">Coming Soon</span>
          </div>
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-3">More Features On The Way</h3>
          <p className="text-slate-400 max-w-xl mx-auto">We're building powerful new tools to level up your design audits. Stay tuned!</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Rocket, title: "Site Crawler", desc: "Batch audit entire sites. Screenshot every page and surface regressions automatically.", bgColor: "bg-blue-500/20", textColor: "text-blue-400", href: "/dashboard?mode=crawler" },
            { icon: GitCompare, title: "Competitor Compare", desc: "Run audits on competitor UIs and compare scores side-by-side.", bgColor: "bg-purple-500/20", textColor: "text-purple-400", href: "/compare" },
            { icon: Eye, title: "Accessibility Testing", desc: "Persona-based testing: low-vision, keyboard-only, screen reader flows.", bgColor: "bg-emerald-500/20", textColor: "text-emerald-400", href: "/dashboard?mode=accessibility" },
          ].map((feature, idx) => {
            const Icon = feature.icon;
            const CardComponent = (feature.href ? Link : "div") as any;
            return (
              <CardComponent
                key={idx}
                {...(feature.href ? { href: feature.href } : {})}
                ref={(el: any) => { if (el instanceof HTMLElement) cardRefsRef.current[3 + idx] = el; }}
                className={`bg-[#121214] border border-white/5 rounded-2xl p-6 relative overflow-hidden transition-all ${feature.href ? "cursor-pointer hover:border-white/20" : "opacity-75 hover:opacity-100"}`}
              >
                <div className="glow-layer absolute inset-0 pointer-events-none rounded-2xl" />
                <div className="relative z-10">
                  <div className={`w-10 h-10 ${feature.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 ${feature.textColor}`} />
                  </div>
                  <h4 className="text-lg font-bold mb-2">{feature.title}</h4>
                  <p className="text-sm text-slate-400">{feature.desc}</p>
                  {feature.href && <p className="text-xs text-indigo-400 mt-4 font-bold">Launch Feature →</p>}
                </div>
              </CardComponent>
            );
          })}
        </div>
      </section>
      <footer className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-8 text-slate-400 text-sm">
          <p>
            © {new Date().getFullYear()} Heuristic.ai • Built by Devgghya Kulshrestha
          </p>
        </div>
      </footer>
    </main>
  );
}
