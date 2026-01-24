"use client";

import { Check, Sparkles, CreditCard, Shield, Zap, Rocket, Loader2, Coffee } from "lucide-react";
import { useState, useEffect } from "react";

declare global {
    interface Window {
        Razorpay: any;
    }
}

interface Plan {
    id: string;
    name: string;
    price: string;
    period: string;
    features: string[];
    recommended?: boolean;
    cta: string;
    color: string;
}

const PLANS: Plan[] = [
    {
        id: "free",
        name: "Free Starter",
        price: "$0",
        period: "/month",
        features: [
            "2 Audits per month",
            "Basic Heuristic Analysis (Nielsen)",
            "Public Report Links",
            "Community Support",
        ],
        cta: "Current Plan",
        color: "slate",
    },
    {
        id: "lite",
        name: "Lite",
        price: "$2",
        period: "/month",
        features: [
            "5 Audits per month",
            "Basic Heuristic Analysis",
            "Public Report Links",
            "Community Support",
        ],
        cta: "Get Lite",
        color: "emerald",
    },
    {
        id: "plus",
        name: "Plus",
        price: "$5",
        period: "/month",
        features: [
            "12 Audits per month",
            "Nielsen + WCAG Frameworks",
            "Public Report Links",
            "Community Support",
        ],
        cta: "Upgrade to Plus",
        color: "blue",
    },
    {
        id: "pro",
        name: "Pro Analyst",
        price: "$19",
        period: "/month",
        features: [
            "Unlimited Audits",
            "All Frameworks (WCAG, Gestalt)",
            "PDF Export & Private History",
            "Priority Email Support",
            "Competitor Benchmarking",
        ],
        recommended: true,
        cta: "Upgrade to Pro",
        color: "indigo",
    },
    {
        id: "agency",
        name: "Agency",
        price: "$49",
        period: "/month",
        features: [
            "Everything in Pro",
            "5 Team Seats",
            "White-label Reports",
            "API Access",
            "Dedicated Success Manager",
        ],
        cta: "Contact Sales",
        color: "purple",
    },
];

export function PricingPlans({ onUpgrade }: { onUpgrade: (planId: string) => void }) {
    const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const handleSubscribe = async (planId: string) => {
        if (!window.Razorpay) {
            alert("Razorpay SDK failed to load. Please check your internet connection.");
            return;
        }

        if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
            alert("Razorpay Key ID is missing. Please restart the dev server to load environment variables.");
            return;
        }

        setLoadingPlan(planId);
        try {
            // 1. Create Order
            const res = await fetch("/api/payment/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.details || data.error || "Failed to create order");
            }
            const order = await res.json();

            // 2. Initialize Razorpay
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "Heuristic AI",
                description: `Upgrade to ${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
                order_id: order.id,
                handler: async function (response: any) {
                    // 3. Verify Payment
                    try {
                        const verifyRes = await fetch("/api/payment/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ ...response, planId }),
                        });

                        if (verifyRes.ok) {
                            onUpgrade(planId); // Success! Refresh user state
                        } else {
                            alert("Payment verification failed. Please contact support.");
                        }
                    } catch (err) {
                        alert("Payment verification failed.");
                    }
                },
                prefill: {
                    name: "", // Can be filled if we have user details
                    email: "",
                },
                theme: {
                    color: "#6366f1",
                },
            };

            const rzp1 = new window.Razorpay(options);
            rzp1.open();

            rzp1.on('payment.failed', function (response: any) {
                alert(response.error.description);
            });

        } catch (error: any) {
            console.error(error);
            alert(`Checkout failed: ${error.message}`);
        } finally {
            setLoadingPlan(null);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-5xl font-black text-foreground mb-4 tracking-tight">
                    Simple, Transparent Pricing
                </h2>
                <p className="text-muted-text text-lg max-w-2xl mx-auto">
                    Choose the perfect plan for your design auditing needs. No hidden fees.
                </p>

                {/* Billing Toggle (Mock) */}
                <div className="flex items-center justify-center gap-4 mt-8">
                    <button
                        onClick={() => setBillingCycle("monthly")}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${billingCycle === "monthly" ? "bg-accent-primary text-white shadow-lg shadow-accent-primary/25" : "text-muted-text hover:text-foreground"}`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBillingCycle("annual")}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${billingCycle === "annual" ? "bg-accent-primary text-white shadow-lg shadow-accent-primary/25" : "text-muted-text hover:text-foreground"}`}
                    >
                        Annual <span className="text-[10px] text-emerald-400 ml-1 font-black uppercase tracking-wider">Save 20%</span>
                    </button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
                {PLANS.map((plan) => (
                    <div
                        key={plan.id}
                        className={`relative bg-card border rounded-2xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${plan.recommended
                            ? "border-accent-primary shadow-[0_0_40px_rgba(99,102,241,0.1)] scale-105 z-10"
                            : "border-border-dim shadow-xl"
                            }`}
                    >
                        {plan.recommended && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">
                                Most Popular
                            </div>
                        )}

                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 self-start ${plan.color === "indigo" ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" :
                            plan.color === "purple" ? "bg-purple-500/10 text-purple-600 dark:text-purple-400" :
                                plan.color === "blue" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                                    "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                            }`}>
                            {plan.id === "pro" ? <Sparkles className="w-6 h-6" /> :
                                plan.id === "agency" ? <Shield className="w-6 h-6" /> :
                                    plan.id === "plus" ? <Rocket className="w-6 h-6" /> :
                                        plan.id === "lite" ? <Coffee className="w-6 h-6" /> :
                                            <Zap className="w-6 h-6" />}
                        </div>

                        <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
                        <div className="flex items-baseline gap-1 mb-6">
                            <span className="text-4xl font-black text-foreground">
                                {billingCycle === "annual" && plan.id !== "free"
                                    ? `$${(parseInt(plan.price.replace("$", "")) * 0.8).toFixed(0)}`
                                    : plan.price}
                            </span>
                            <span className="text-muted-text font-medium">{plan.period}</span>
                        </div>

                        <ul className="space-y-4 mb-8">
                            {plan.features.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-base text-muted-text font-medium leading-relaxed">
                                    <Check className={`w-5 h-5 shrink-0 mt-0.5 ${plan.color === "indigo" ? "text-indigo-600 dark:text-indigo-400" :
                                        plan.color === "purple" ? "text-purple-600 dark:text-purple-400" :
                                            plan.color === "blue" ? "text-blue-600 dark:text-blue-400" :
                                                "text-emerald-600 dark:text-emerald-400"
                                        }`} />
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleSubscribe(plan.id)}
                            disabled={plan.id === "free" || loadingPlan === plan.id}
                            className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${plan.id === "free"
                                ? "bg-foreground/5 text-muted-text cursor-default"
                                : plan.recommended
                                    ? "bg-accent-primary hover:bg-accent-primary/90 text-white shadow-lg shadow-accent-primary/25 hover:shadow-xl hover:shadow-accent-primary/40 hover:scale-[1.02]"
                                    : "bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02]"
                                }`}

                        >
                            {loadingPlan === plan.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    {plan.id !== "free" && <CreditCard className="w-4 h-4" />}
                                    {plan.cta}
                                </>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-16 text-center bg-card border border-border-dim rounded-2xl p-8 max-w-3xl mx-auto">
                <h4 className="text-lg font-bold text-foreground mb-4">Enterprise Custom Plans</h4>
                <p className="text-muted-text mb-6">
                    Need more than 5 seats or custom API integration? We offer tailored solutions for large design teams.
                </p>
                <button className="text-accent-primary font-bold hover:underline">Contact Enterprise Support →</button>
            </div>
        </div >
    );
}
