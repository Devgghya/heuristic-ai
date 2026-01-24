"use client";

import { motion } from "framer-motion";
import {
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from "recharts";
import { AlertCircle, CheckCircle, Lightbulb, Zap } from "lucide-react";

interface ReportViewProps {
    data: any; // The full JSON response from the API
    uiTitle: string;
}

export default function ReportView({ data, uiTitle }: ReportViewProps) {
    if (!data) return null;

    // Transform metrics for Radar Chart
    const metrics = data.ux_metrics || {};
    const radarData = Object.keys(metrics).map(key => ({
        subject: key.charAt(0).toUpperCase() + key.slice(1),
        A: metrics[key],
        fullMark: 10,
    }));

    const score = data.score || 0;

    // Color determination for score
    const scoreColor = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";
    const scoreBg = score >= 80 ? "bg-emerald-500/10 border-emerald-500/30" : score >= 60 ? "bg-amber-500/10 border-amber-500/30" : "bg-red-500/10 border-red-500/30";

    return (
        <div id="audit-report-view" className="space-y-8 bg-background text-foreground p-4 md:p-8 rounded-3xl border border-border-dim shadow-xl transition-colors duration-500">

            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row gap-8 items-start justify-between border-b border-white/10 pb-8">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="bg-accent-primary text-white text-[10px] font-black px-2 py-0.5 rounded tracking-widest uppercase">AI AUDIT</span>
                        <span className="text-muted-text text-xs font-medium">{new Date().toLocaleDateString()}</span>
                    </div>
                    <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-3 text-foreground leading-tight">{uiTitle}</h2>
                    <p className="text-lg md:text-xl text-muted-text max-w-2xl leading-relaxed">{data.summary?.summary_text}</p>
                </div>

                {/* SCORE CARD */}
                <div className={`flex flex-col items-center justify-center p-6 rounded-2xl border ${scoreBg} w-full md:min-w-[180px]`}>
                    <span className="text-xs md:text-sm font-bold opacity-80 uppercase tracking-widest mb-1">UX Score</span>
                    <span className={`text-5xl md:text-6xl font-black ${scoreColor}`}>{score}</span>
                    <span className="text-[10px] md:text-xs font-bold mt-2 opacity-60">OUT OF 100</span>
                </div>
            </div>

            {/* METRICS VISUALIZATION */}
            <div className="grid md:grid-cols-2 gap-8">
                {/* RADAR CHART */}
                <div className="bg-card border border-border-dim rounded-2xl p-6 relative overflow-hidden shadow-sm">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-foreground"><Zap className="w-5 h-5 text-accent-primary" /> Performance Metrics</h3>
                    <div id="radar-chart-container" className="h-[250px] md:h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                <PolarGrid stroke="#94a3b8" strokeOpacity={0.2} />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: 'currentColor', fontSize: 12, className: 'text-muted-text font-medium' }} />
                                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                                <Radar
                                    name="UX Metrics"
                                    dataKey="A"
                                    stroke="var(--accent)"
                                    strokeWidth={3}
                                    fill="var(--accent)"
                                    fillOpacity={0.2}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* STRENGTHS & WEAKNESSES */}
                <div className="space-y-6">
                    <div className="bg-card border border-border-dim rounded-2xl p-6 shadow-sm hover:border-emerald-500/20 transition-colors">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground"><CheckCircle className="w-5 h-5 text-emerald-500" /> Key Strengths</h3>
                        <ul className="space-y-3">
                            {data.key_strengths?.map((s: string, i: number) => (
                                <li key={i} className="flex gap-3 text-sm text-muted-text">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 shrink-0" />
                                    {s}
                                </li>
                            )) || <p className="text-muted-text italic">No specific strengths listed.</p>}
                        </ul>
                    </div>

                    <div className="bg-card border border-border-dim rounded-2xl p-6 shadow-sm hover:border-orange-500/20 transition-colors">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground"><AlertCircle className="w-5 h-5 text-orange-500" /> Areas for Improvement</h3>
                        <ul className="space-y-3">
                            {data.key_weaknesses?.map((w: string, i: number) => (
                                <li key={i} className="flex gap-3 text-sm text-muted-text">
                                    <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 shrink-0" />
                                    {w}
                                </li>
                            )) || <p className="text-muted-text italic">No specific weaknesses listed.</p>}
                        </ul>
                    </div>
                </div>
            </div>

            {/* EXECUTIVE SUMMARY */}
            {data.summary?.audit && (
                <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-2xl p-4 md:p-8">
                    <h3 className="text-lg md:text-xl font-bold mb-6 text-indigo-200">Executive Strategic Audit</h3>
                    <div className="space-y-6">
                        {data.summary.audit.map((item: any, idx: number) => (
                            <div key={idx}>
                                <h4 className="font-bold text-white text-lg mb-2">{item.title}</h4>
                                <p className="text-indigo-100/70 mb-3">{item.issue}</p>
                                <div className="bg-indigo-500/10 p-4 rounded-lg border border-indigo-500/20">
                                    <strong className="text-indigo-400 text-xs uppercase tracking-wider block mb-1">Strategic Recommendation</strong>
                                    <p className="text-sm text-white">{item.solution}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* DETAILED ISSUES */}
            <div className="pt-8 border-t border-border-dim">
                <h3 className="text-xl md:text-2xl font-bold mb-8 text-foreground">Detailed Findings</h3>
                <div className="grid gap-6">
                    {data.audit?.map((item: any, i: number) => (
                        <div key={i} className="group flex flex-col sm:flex-row gap-4 p-4 md:p-6 bg-card border border-border-dim rounded-xl transition-all duration-300 hover:border-accent-primary/30 hover:scale-[1.01] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-accent-primary/5">
                            <span className="font-mono text-muted-text text-sm">#{i + 1}</span>
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-bold text-lg text-foreground">{item.title}</h4>
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${item.severity === 'critical' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' :
                                        item.severity === 'high' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' :
                                            'bg-accent-primary text-white shadow-lg shadow-accent-primary/20'
                                        }`}>{item.severity}</span>
                                </div>
                                <p className="text-muted-text text-sm mb-4 leading-relaxed">{item.issue || item.critique}</p>
                                <div className="flex gap-3 items-start bg-foreground/[0.02] p-4 rounded-lg border border-border-dim">
                                    <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-foreground/90 font-medium italic">{item.solution || item.fix}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
