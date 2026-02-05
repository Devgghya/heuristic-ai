import type { Metadata } from "next";
import HomePageClient from "@/components/home-page-client";

export const metadata: Metadata = {
  title: "UIXScore - AI-Powered UX & Accessibility Audits (Instant Report)",
  description: "Stop guessing. Audit your UI for UX flaws, accessibility (WCAG 2.1) issues, and conversion killers instantly using AI. Get your free score now.",
  alternates: {
    canonical: 'https://uixscore.com',
  },
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "UIXScore",
    "operatingSystem": "Web",
    "applicationCategory": "DesignApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "120"
    },
    "featureList": "AI-powered UX Audits, Accessibility Checking, PDF Reports"
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePageClient />
    </>
  );
}
