import type { Metadata } from "next";
import PricingPageClient from "./page-client";

export const metadata: Metadata = {
    title: "Simple Pricing for UX Audits - Free Guest Mode Available | UIXScore",
    description: "Unlimited audits for free. Upgrade for competitor benchmarking, PDF reports, and advanced crawler capabilities. No hidden fees.",
    alternates: {
        canonical: 'https://uixscore.com/pricing',
    },
};

export default function PricingPage() {
    return <PricingPageClient />;
}
