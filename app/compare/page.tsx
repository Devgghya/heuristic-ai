import type { Metadata } from "next";
import ComparePageClient from "@/components/compare-page-client";

export const metadata: Metadata = {
  title: "Competitor UX Benchmarking Tool - Compare Your Site | UIXScore",
  description: "See how your UI stacks up against competitors. Run a side-by-side AI heuristic evaluation and gain a competitive edge.",
  alternates: {
    canonical: 'https://uixscore.com/compare',
  },
};

export default function ComparePage() {
  return <ComparePageClient />;
}
