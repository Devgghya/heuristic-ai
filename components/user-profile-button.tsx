"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { User, LogOut, LayoutDashboard, Shield } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export function UserProfileButton({ direction = "down" }: { direction?: "up" | "down" }) {
    const { user, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!user) return null;

    return (
        <div className="relative w-full" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-transparent hover:bg-foreground/5 hover:border-border-dim transition-all group text-left"
            >
                <div className="w-9 h-9 rounded-lg bg-accent-primary/10 text-accent-primary border border-accent-primary/20 flex items-center justify-center shrink-0 font-bold overflow-hidden">
                    {user.imageUrl ? (
                        <img src={user.imageUrl} alt={user.firstName} className="w-full h-full object-cover" />
                    ) : (
                        user.firstName?.[0] || <User className="w-4 h-4" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-accent-primary transition-colors">
                        {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-muted-text truncate">{user.email}</p>
                </div>
                {/* Chevron icon could go here if needed, but clean look is fine too */}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: direction === "up" ? 10 : -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: direction === "up" ? 10 : -10, scale: 0.95 }}
                        className={`absolute ${direction === "up" ? "bottom-full mb-2" : "top-full mt-2"} right-0 w-full min-w-[200px] bg-card border border-border-dim rounded-xl shadow-2xl overflow-hidden py-1 z-50 backdrop-blur-xl ring-1 ring-black/5`}
                    >
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-text hover:text-foreground hover:bg-foreground/5 transition-colors"
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                        </Link>

                        <Link
                            href="/account"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-text hover:text-foreground hover:bg-foreground/5 transition-colors"
                        >
                            <User className="w-4 h-4" />
                            Account Settings
                        </Link>

                        {user.isAdmin && (
                            <Link
                                href="/admin"
                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-text hover:text-foreground hover:bg-foreground/5 transition-colors"
                            >
                                <Shield className="w-4 h-4" />
                                Admin Console
                            </Link>
                        )}

                        <div className="h-px bg-border-dim my-1" />

                        <button
                            onClick={() => logout()}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-colors text-left"
                        >
                            <LogOut className="w-4 h-4" />
                            Log Out
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
