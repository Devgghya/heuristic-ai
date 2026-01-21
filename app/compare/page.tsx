"use client";

import { useState } from "react";
import { SignInButton } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { Plus, Trash2, BarChart3, Loader, Download } from "lucide-react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Competitor {
  id: string;
  name: string;
  url?: string;
  file?: File;
  analysis?: any;
  loading?: boolean;
}

export default function ComparePage() {
  const { user, isLoaded } = useUser();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [yourSite, setYourSite] = useState<Competitor>({ id: "your-site", name: "Your Site" });
  const [framework, setFramework] = useState("nielsen");
  const [comparing, setComparing] = useState(false);

  const addCompetitor = () => {
    const newCompetitor: Competitor = {
      id: `competitor-${Date.now()}`,
      name: `Competitor ${competitors.length + 1}`,
      url: "",
      loading: false,
    };
    setCompetitors([...competitors, newCompetitor]);
  };

  const updateCompetitor = (id: string, updates: Partial<Competitor>) => {
    setCompetitors(
      competitors.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const removeCompetitor = (id: string) => {
    setCompetitors(competitors.filter((c) => c.id !== id));
  };

  const runComparison = async () => {
    if (!yourSite.url && !yourSite.file) {
      alert("Please enter your site URL or upload a screenshot");
      return;
    }

    if (competitors.length === 0) {
      alert("Please add at least one competitor");
      return;
    }

    setComparing(true);

    try {
      // Run audit on your site
      const yourFormData = new FormData();
      yourFormData.append("framework", framework);
      if (yourSite.url) {
        yourFormData.append("mode", "url");
        yourFormData.append("url", yourSite.url);
      } else if (yourSite.file) {
        yourFormData.append("mode", "file");
        yourFormData.append("file", yourSite.file);
      }

      const yourResponse = await fetch("/api/audit", {
        method: "POST",
        body: yourFormData,
      });
      const yourData = await yourResponse.json();
      setYourSite({ ...yourSite, analysis: yourData });

      // Run audits on all competitors
      const updatedCompetitors = await Promise.all(
        competitors.map(async (comp) => {
          if (!comp.url) return comp;

          const formData = new FormData();
          formData.append("framework", framework);
          formData.append("mode", "url");
          formData.append("url", comp.url!);

          const response = await fetch("/api/audit", {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          return { ...comp, analysis: data };
        })
      );

      setCompetitors(updatedCompetitors);
    } catch (error) {
      console.error("Error running comparison:", error);
      alert("Error running comparison. Please try again.");
    } finally {
      setComparing(false);
    }
  };

  const calculateMetrics = (analysis: any) => {
    if (!analysis?.audit || !Array.isArray(analysis.audit)) {
      return {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        categories: {},
      };
    }

    const issues = analysis.audit;
    const metrics = {
      total: issues.length,
      critical: issues.filter((i: any) => i.severity === "critical").length,
      high: issues.filter((i: any) => i.severity === "high").length,
      medium: issues.filter((i: any) => i.severity === "medium").length,
      low: issues.filter((i: any) => i.severity === "low").length,
      categories: {} as Record<string, number>,
    };

    // Count by category
    issues.forEach((issue: any) => {
      const category = issue.category || "Other";
      metrics.categories[category] = (metrics.categories[category] || 0) + 1;
    });

    return metrics;
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
       // Brand Colors
      const BRAND_COLOR = [99, 102, 241]; // Indigo
      const DARK_BG = [10, 10, 10]; // Black

      // --- COVER PAGE ---
      doc.setFillColor(DARK_BG[0], DARK_BG[1], DARK_BG[2]); 
      doc.rect(0, 0, pageWidth, pageHeight, "F");
      
      doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
      doc.rect(0, 0, pageWidth, 4, "F");

      // Logo
      doc.setFont("helvetica", "bold");
      doc.setFontSize(40);
      doc.setTextColor(255, 255, 255);
      doc.text("Heuristic", 20, 60);
      doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
      doc.text(".ai", 20 + doc.getTextWidth("Heuristic"), 60);

      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text("Competitor Benchmark Report", 20, 110);
      
      doc.setFontSize(14);
      doc.setTextColor(150, 150, 150);
      doc.text(`Comparisons: ${competitors.length + 1} Sites`, 20, 125);
      doc.text(`Framework: ${framework.toUpperCase()}`, 20, 132);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 139);

      // --- SUMMARY PAGE ---
      doc.addPage();
      
      // Header
      const drawHeader = () => {
        doc.setFillColor(250, 250, 250);
        doc.rect(0, 0, pageWidth, 25, "F");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Comparison Matrix", 15, 17);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150, 150, 150);
        doc.text("Heuristic.ai", pageWidth - 40, 17);
        doc.setDrawColor(230, 230, 230);
        doc.line(0, 25, pageWidth, 25);
      };
      drawHeader();

      let yPosition = 40;

      // Summary Table
      const summaryData: any[] = [["Metric", yourSite.name, ...competitors.map((c) => c.name)]];
      const yourMetrics = calculateMetrics(yourSite.analysis);
      const compMetrics = competitors.map((c) => calculateMetrics(c.analysis));

      summaryData.push([
        "Total Issues",
        yourMetrics.total,
        ...compMetrics.map((m) => m.total),
      ]);
      summaryData.push([
        "Critical",
        yourMetrics.critical,
        ...compMetrics.map((m) => m.critical),
      ]);
      summaryData.push([
        "High",
        yourMetrics.high,
        ...compMetrics.map((m) => m.high),
      ]);
      summaryData.push([
        "Medium",
        yourMetrics.medium,
        ...compMetrics.map((m) => m.medium),
      ]);

      autoTable(doc, {
        head: [summaryData[0]],
        body: summaryData.slice(1),
        startY: yPosition,
        theme: "grid",
        headStyles: { 
            fillColor: DARK_BG, 
            textColor: [255, 255, 255],
            fontStyle: "bold",
            lineWidth: 0
        },
        alternateRowStyles: { fillColor: [245, 245, 250] },
        styles: { textColor: [40, 40, 40], fontSize: 10, cellPadding: 5 },
        margin: { left: 15, right: 15 },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 20;

      // Detailed Issues per Site
      [
        { name: yourSite.name, analysis: yourSite.analysis },
        ...competitors.map((c) => ({ name: c.name, analysis: c.analysis })),
      ].forEach((site, siteIdx) => {
        if (yPosition > pageHeight - 50) {
          doc.addPage();
          drawHeader();
          yPosition = 40;
        }

        doc.setFontSize(18);
        doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
        doc.setFont("helvetica", "bold");
        doc.text(`${site.name}`, 15, yPosition);
        yPosition += 10;

        if (!site.analysis?.audit || site.analysis.audit.length === 0) {
          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.text("No significant issues detected.", 15, yPosition);
          yPosition += 20;
        } else {
          const issuesData: any[] = site.analysis.audit.map((issue: any) => [
              issue.title || "Issue",
              issue.severity ? issue.severity.toUpperCase() : "MED",
              `${issue.issue || issue.critique}\n\nFIX: ${issue.solution || issue.fix}`
          ]);

          autoTable(doc, {
            head: [["Issue", "Sev", "Analysis"]],
            body: issuesData,
            startY: yPosition,
            theme: "grid",
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
            bodyStyles: { textColor: [40, 40, 40], fontSize: 9 },
            columnStyles: { 
              0: { cellWidth: 40, fontStyle: "bold" }, 
              1: { cellWidth: 20, halign: "center" },
            },
            margin: { left: 15, right: 15 },
            didDrawPage: function(data) {
                 if (data.pageNumber > 2) drawHeader();
            }
          });

          yPosition = (doc as any).lastAutoTable.finalY + 15;
        }
      });

      // Save the PDF
      const fileName = `heuristic-compare-${Date.now()}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again.");
    }
  };

  if (!isLoaded) {
    return <div className="text-center py-20">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      {/* Back Link */}
      <div className="max-w-7xl mx-auto mb-8">
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-bold">Competitor Compare</h1>
          </div>
          <p className="text-slate-400 text-lg">Audit your site and competitors side-by-side</p>
        </div>

        {/* Framework Selection */}
        <div className="mb-8 bg-[#121214] border border-white/5 rounded-2xl p-6">
          <label className="block text-sm font-bold mb-4">Heuristic Framework</label>
          <div className="grid md:grid-cols-3 gap-4">
            {["nielsen", "wcag", "gestalt"].map((f) => (
              <button
                key={f}
                onClick={() => setFramework(f)}
                className={`p-4 rounded-lg border-2 transition-all capitalize ${
                  framework === f
                    ? "border-indigo-500 bg-indigo-500/10"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                {f === "nielsen" && "Nielsen Heuristics"}
                {f === "wcag" && "WCAG 2.1"}
                {f === "gestalt" && "Gestalt Principles"}
              </button>
            ))}
          </div>
        </div>

        {/* Your Site */}
        <div className="mb-8 bg-[#121214] border border-white/5 rounded-2xl p-6">
          <h2 className="text-2xl font-bold mb-6">Your Site</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Enter your website URL"
              value={yourSite.url || ""}
              onChange={(e) => setYourSite({ ...yourSite, url: e.target.value })}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-indigo-500"
            />
            <div>
              <label className="block text-sm text-slate-400 mb-2">Or upload screenshot</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setYourSite({ ...yourSite, file: e.target.files?.[0] })
                }
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Competitors */}
        <div className="mb-8 bg-[#121214] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Competitors</h2>
            <button
              onClick={addCompetitor}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Competitor
            </button>
          </div>

          {competitors.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No competitors added yet. Click "Add Competitor" to get started.</p>
          ) : (
            <div className="space-y-4">
              {competitors.map((comp) => (
                <div
                  key={comp.id}
                  className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-lg"
                >
                  <input
                    type="text"
                    placeholder="Company name"
                    value={comp.name}
                    onChange={(e) => updateCompetitor(comp.id, { name: e.target.value })}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Competitor URL"
                    value={comp.url || ""}
                    onChange={(e) => updateCompetitor(comp.id, { url: e.target.value })}
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => removeCompetitor(comp.id)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Run Comparison */}
        <div className="mb-12">
          <button
            onClick={runComparison}
            disabled={comparing}
            className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 rounded-lg font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {comparing ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Running Audits...
              </>
            ) : (
              "Run Comparison"
            )}
          </button>
        </div>

        {/* Results */}
        {yourSite.analysis && competitors.some((c) => c.analysis) && (
          <div className="bg-[#121214] border border-white/5 rounded-2xl p-6 overflow-x-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Comparison Results</h2>
              <button
                onClick={exportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold transition-colors"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
            </div>

            {/* Summary Table */}
            <div className="mb-12">
              <h3 className="text-lg font-bold mb-4 text-slate-300">Summary Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b-2 border-indigo-500/30">
                      <th className="text-left py-4 px-4 font-bold text-slate-300">Metric</th>
                      <th className="text-center py-4 px-4 font-bold text-white">{yourSite.name}</th>
                      {competitors.map((comp) => (
                        <th key={comp.id} className="text-center py-4 px-4 font-bold text-white">
                          {comp.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/10 bg-amber-500/5">
                      <td className="py-4 px-4 font-bold text-amber-300">📊 Total Issues</td>
                      <td className="text-center py-4 px-4">
                        <span className="text-2xl font-bold text-amber-400">
                          {calculateMetrics(yourSite.analysis).total}
                        </span>
                      </td>
                      {competitors.map((comp) => (
                        <td key={comp.id} className="text-center py-4 px-4">
                          <span className="text-2xl font-bold text-amber-400">
                            {calculateMetrics(comp.analysis).total}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-white/10 bg-red-500/5">
                      <td className="py-4 px-4 font-bold text-red-300">🔴 Critical Severity</td>
                      <td className="text-center py-4 px-4">
                        <span className="text-xl font-bold text-red-400">
                          {calculateMetrics(yourSite.analysis).critical}
                        </span>
                      </td>
                      {competitors.map((comp) => (
                        <td key={comp.id} className="text-center py-4 px-4">
                          <span className="text-xl font-bold text-red-400">
                            {calculateMetrics(comp.analysis).critical}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-white/10 bg-orange-500/5">
                      <td className="py-4 px-4 font-bold text-orange-300">🟠 High Severity</td>
                      <td className="text-center py-4 px-4">
                        <span className="text-xl font-bold text-orange-400">
                          {calculateMetrics(yourSite.analysis).high}
                        </span>
                      </td>
                      {competitors.map((comp) => (
                        <td key={comp.id} className="text-center py-4 px-4">
                          <span className="text-xl font-bold text-orange-400">
                            {calculateMetrics(comp.analysis).high}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-white/10 bg-yellow-500/5">
                      <td className="py-4 px-4 font-bold text-yellow-300">🟡 Medium Severity</td>
                      <td className="text-center py-4 px-4">
                        <span className="text-xl font-bold text-yellow-400">
                          {calculateMetrics(yourSite.analysis).medium}
                        </span>
                      </td>
                      {competitors.map((comp) => (
                        <td key={comp.id} className="text-center py-4 px-4">
                          <span className="text-xl font-bold text-yellow-400">
                            {calculateMetrics(comp.analysis).medium}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-white/10 bg-green-500/5">
                      <td className="py-4 px-4 font-bold text-green-300">🟢 Low Severity</td>
                      <td className="text-center py-4 px-4">
                        <span className="text-xl font-bold text-green-400">
                          {calculateMetrics(yourSite.analysis).low}
                        </span>
                      </td>
                      {competitors.map((comp) => (
                        <td key={comp.id} className="text-center py-4 px-4">
                          <span className="text-xl font-bold text-green-400">
                            {calculateMetrics(comp.analysis).low}
                          </span>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Competitive Position */}
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-6 mb-12">
              <h3 className="text-xl font-bold mb-4">Competitive Position</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-slate-400 mb-2">Best Performance (Fewest Issues)</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {(() => {
                      const all = [
                        {
                          name: yourSite.name,
                          count: calculateMetrics(yourSite.analysis).total,
                        },
                        ...competitors.map((c) => ({
                          name: c.name,
                          count: calculateMetrics(c.analysis).total,
                        })),
                      ];
                      return all.reduce((prev, current) =>
                        prev.count < current.count ? prev : current
                      ).name;
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 mb-2">Highest Risk (Most Critical Issues)</p>
                  <p className="text-2xl font-bold text-red-400">
                    {(() => {
                      const all = [
                        {
                          name: yourSite.name,
                          count: calculateMetrics(yourSite.analysis).critical,
                        },
                        ...competitors.map((c) => ({
                          name: c.name,
                          count: calculateMetrics(c.analysis).critical,
                        })),
                      ];
                      return all.reduce((prev, current) =>
                        prev.count > current.count ? prev : current
                      ).name;
                    })()}
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Issues */}
            <div className="mt-12">
              <h3 className="text-2xl font-bold mb-8 text-white">📋 Detailed Findings by Site</h3>
              <div className="space-y-12">
                {[
                  { name: yourSite.name, analysis: yourSite.analysis },
                  ...competitors.map((c) => ({ name: c.name, analysis: c.analysis })),
                ].map((site, idx) => (
                  <div key={idx} className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-3 h-12 bg-indigo-500 rounded-full"></div>
                      <h4 className="text-2xl font-bold text-white">{site.name}</h4>
                    </div>
                    
                    {/* Severity Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                        <p className="text-amber-300 text-xs font-bold mb-1">TOTAL</p>
                        <p className="text-4xl font-bold text-amber-400">
                          {calculateMetrics(site.analysis).total}
                        </p>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                        <p className="text-red-300 text-xs font-bold mb-1">CRITICAL</p>
                        <p className="text-4xl font-bold text-red-400">
                          {calculateMetrics(site.analysis).critical}
                        </p>
                      </div>
                      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                        <p className="text-orange-300 text-xs font-bold mb-1">HIGH</p>
                        <p className="text-4xl font-bold text-orange-400">
                          {calculateMetrics(site.analysis).high}
                        </p>
                      </div>
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                        <p className="text-yellow-300 text-xs font-bold mb-1">MEDIUM</p>
                        <p className="text-4xl font-bold text-yellow-400">
                          {calculateMetrics(site.analysis).medium}
                        </p>
                      </div>
                    </div>

                    {/* Issues List */}
                    {site.analysis?.audit && site.analysis.audit.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-lg font-bold text-white">Issues Found ({site.analysis.audit.length})</h5>
                          <p className="text-xs text-slate-400">Showing all issues</p>
                        </div>
                        {site.analysis.audit.map((issue: any, issueIdx: number) => (
                          <div
                            key={issueIdx}
                            className="bg-[#0a0a0a] border border-white/10 rounded-lg p-6 hover:border-indigo-500/50 transition-all"
                          >
                            <div className="flex items-start gap-4">
                              {/* Issue Number Badge */}
                              <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {issueIdx + 1}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                {/* Issue Title */}
                                <div className="flex items-start justify-between gap-4 mb-3">
                                  <h6 className="text-lg font-bold text-white leading-tight">
                                    {issue.issue || "Issue description not available"}
                                  </h6>
                                  <span
                                    className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap flex-shrink-0 ${
                                      issue.severity === "critical"
                                        ? "bg-red-500 text-white"
                                        : issue.severity === "high"
                                        ? "bg-orange-500 text-white"
                                        : issue.severity === "medium"
                                        ? "bg-yellow-500 text-black"
                                        : "bg-green-500 text-white"
                                    }`}
                                  >
                                    {issue.severity?.toUpperCase() || "UNKNOWN"}
                                  </span>
                                </div>

                                {/* Solution */}
                                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-4 mb-3">
                                  <p className="text-xs font-bold text-indigo-300 mb-2">💡 RECOMMENDED SOLUTION</p>
                                  <p className="text-sm text-slate-300 leading-relaxed">
                                    {issue.solution || "Solution not available"}
                                  </p>
                                </div>

                                {/* Category Badge */}
                                {issue.category && (
                                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
                                    <span className="text-xs text-slate-400 font-medium">
                                      {issue.category}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                        <div className="text-6xl mb-4">✅</div>
                        <p className="text-xl font-bold text-emerald-400 mb-2">No Issues Found!</p>
                        <p className="text-slate-400">This site appears to be following best practices.</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
