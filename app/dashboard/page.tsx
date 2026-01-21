"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
   Upload, CheckCircle, AlertCircle, Loader2, Download, Lock, 
   ChevronDown, LogOut, Zap, LayoutDashboard, Home as HomeIcon, History as HistoryIcon, 
  Plus, X, Trash2, User, Sparkles, CreditCard, ArrowRight, ExternalLink, GitCompare, Eye
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useUser, SignInButton, SignOutButton } from "@clerk/nextjs";

// --- TYPES ---
interface AuditItem {
  title: string;
  critique: string;
  fix: string;
  severity: "High" | "Medium" | "Low";
}

interface HistoryRecord {
  id: string;
  ui_title: string;
  date: string;
  preview: string; // This will now be the Vercel Blob URL
  analysis: AuditItem[];
  framework: string;
}

interface AuditImageGroup {
   index: number;
   ui_title: string;
   audit: AuditItem[];
}

export default function Home() {
  const { isSignedIn, user } = useUser();
  const searchParams = useSearchParams();
  
  // --- APP STATE ---
  const [activeTab, setActiveTab] = useState<"dashboard" | "history">("dashboard");
  const [showSubscription, setShowSubscription] = useState(false);
  
  // --- USER DATA ---
  const [isPro, setIsPro] = useState(false);
  const [auditCount, setAuditCount] = useState(0);

  // --- AUDIT INPUTS ---
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [mode, setMode] = useState<"upload" | "url" | "crawler" | "accessibility">("upload");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // --- AUDIT RESULTS ---
  const [analysis, setAnalysis] = useState<AuditItem[] | null>(null);
  const [analysisGrouped, setAnalysisGrouped] = useState<AuditImageGroup[] | null>(null);
  const [currentUiTitle, setCurrentUiTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [framework, setFramework] = useState("nielsen");
  const [history, setHistory] = useState<HistoryRecord[]>([]);

  // --- INIT DATA & PARAMS ---
  useEffect(() => {
    // 0. Check Params for Crawler Mode
    const modeParam = searchParams.get("mode");
    if (modeParam === "crawler") setMode("crawler");
    if (modeParam === "accessibility") setMode("accessibility");

    // 2. Load User Limits (Mock DB for Subscriptions)
    if (isSignedIn && user) {
        const count = localStorage.getItem(`audit_count_${user.id}`);
        const proStatus = localStorage.getItem(`is_pro_${user.id}`);
        setAuditCount(count ? parseInt(count) : 0);
        setIsPro(proStatus === "true");
    }

    // 3. FETCH REAL HISTORY FROM CLOUD DB
    async function fetchCloudHistory() {
      if (!isSignedIn) return;
      try {
        const res = await fetch("/api/history");
        const data = await res.json();
        
        if (data.history) {
          // Transform Postgres Data -> Frontend Shape
          const formattedHistory: HistoryRecord[] = data.history.map((record: any) => ({
             id: record.id.toString(),
             ui_title: record.ui_title || "Untitled Scan",
             date: new Date(record.created_at).toLocaleDateString(),
             preview: record.image_url, // Vercel Blob URL
             analysis: record.analysis,
             framework: record.framework
          }));
          setHistory(formattedHistory);
        }
      } catch (error) {
        console.error("Failed to load history:", error);
      }
    }

    fetchCloudHistory();
  }, [isSignedIn, user]);


  // --- HANDLERS ---
  const handleUpgrade = () => {
    setLoading(true);
    setTimeout(() => {
        setIsPro(true);
        localStorage.setItem(`is_pro_${user?.id}`, "true");
        setLoading(false);
        setShowSubscription(false);
        alert("Welcome to Pro! You now have unlimited access.");
    }, 1500);
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Note: In a real app, you'd send a DELETE request to API here
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
  };

  // --- PASTE LISTENER ---
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.items) {
        const items = Array.from(e.clipboardData.items);
        const imageItems = items.filter((item) => item.type.startsWith("image/"));
        if (imageItems.length > 0) {
          const newFiles: File[] = [];
          const newPreviews: string[] = [];
          imageItems.forEach((item) => {
            const file = item.getAsFile();
            if (file) {
              newFiles.push(file);
              newPreviews.push(URL.createObjectURL(file));
            }
          });
          setFiles((prev) => [...prev, ...newFiles]);
          setPreviews((prev) => [...prev, ...newPreviews]);
          setMode("upload");
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);


  // --- MAIN AUDIT FUNCTION ---
  async function handleAudit() {
    if (mode === "upload" && files.length === 0) return;
    if ((mode === "url" || mode === "crawler" || mode === "accessibility") && !urlInput) return;

    // Subscription Gate
    if (isSignedIn && !isPro && auditCount >= 2) {
        setShowSubscription(true);
        return;
    }

    setLoading(true);
   setAnalysis(null);
   setAnalysisGrouped(null);
    setCurrentUiTitle("");

    const formData = new FormData();
    formData.append("framework", framework);
    formData.append("mode", mode);
    if (mode === "url" || mode === "crawler" || mode === "accessibility") formData.append("url", urlInput);
    else files.forEach((file) => formData.append("file", file));

    try {
         const res = await fetch("/api/audit", { method: "POST", body: formData });
      const data = await res.json();
      
      if (data.audit) {
        setAnalysis(data.audit);
            if (data.analysis_grouped) setAnalysisGrouped(data.analysis_grouped);
        setCurrentUiTitle(data.ui_title);
        
        // Update Local Limits
        if (isSignedIn) {
            const newCount = auditCount + 1;
            setAuditCount(newCount);
            localStorage.setItem(`audit_count_${user?.id}`, newCount.toString());
            
            // UPDATE HISTORY STATE INSTANTLY (With Cloud URL)
            // The API returns 'image_url' which is the Vercel Blob link
            const newRecord: HistoryRecord = {
                id: Date.now().toString(), // Temp ID until refresh
                ui_title: data.ui_title,
                date: new Date().toLocaleDateString(),
                preview: data.image_url, 
                analysis: data.audit,
                framework: framework
            };
            setHistory([newRecord, ...history]);
        }
      } else if (data.error) {
        alert(data.error);
      }
    } catch (error) {
      console.error(error);
      alert("Error analyzing. Check console.");
    } finally {
      setLoading(false);
    }
  }

  // --- PDF ENGINE (OFFICIAL) ---
   const generatePDF = (data = analysis, title = currentUiTitle, allPreviews: string[] = previews) => {
      if (!data) return;
    const doc = new jsPDF();
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // Brand Colors (Indigo-500)
    const BRAND_COLOR = [99, 102, 241]; // #6366f1
    const DARK_BG = [10, 10, 10];      // #0a0a0a

    // --- COVER PAGE ---
    // Full Dark Background
    doc.setFillColor(DARK_BG[0], DARK_BG[1], DARK_BG[2]); 
    doc.rect(0, 0, width, height, "F");

    // Decorative Accent Line (Top)
    doc.setFillColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.rect(0, 0, width, 2, "F");

    // "Heuristic.ai" Branding
    doc.setFont("helvetica", "bold");
    doc.setFontSize(40);
    doc.setTextColor(255, 255, 255);
    doc.text("Heuristic", 20, 50);
    doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.text(".ai", 20 + doc.getTextWidth("Heuristic"), 50);

    // Subtitle
    doc.setFontSize(14);
    doc.setTextColor(150, 150, 150); 
    doc.setFont("helvetica", "normal");
    doc.text("INTELLIGENT UX AUDIT REPORT", 20, 60);

    // Document Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont("times", "normal"); // Serif for content title looks classy
    const splitTitle = doc.splitTextToSize(title || "Untitled Scan", width - 40);
    doc.text(splitTitle, 20, 100);
    
    // Metadata
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.text(`Framework: ${framework.toUpperCase()}`, 20, 125);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, 132);

      // Embed primary visual
      try {
            const first = allPreviews && allPreviews.length > 0 ? allPreviews[0] : undefined;
            if (first) {
                  const imgProps = doc.getImageProperties(first);
                  // Fit within a box
                  const maxW = width - 40;
                  const maxH = 120;
                  const scale = Math.min(maxW / imgProps.width, maxH / imgProps.height);
                  const w = imgProps.width * scale;
                  const h = imgProps.height * scale;
                  
                  // Image Border
                  doc.setDrawColor(40, 40, 40);
                  doc.rect((width - w)/2 - 1, 150 - 1, w + 2, h + 2);
                  doc.addImage(first, "JPEG", (width - w)/2, 150, w, h);
            }
      } catch (e) {}

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text("heuristic.ai | Automated UX Intelligence", 20, height - 20);

    // --- REPORT CONTENT ---
    doc.addPage();
    
    // Header for internal pages
    const drawHeader = (doc: any) => {
        doc.setFillColor(250, 250, 250);
        doc.rect(0, 0, width, 25, "F");
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Detailed Findings", 15, 17);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150, 150, 150);
        doc.text("Heuristic.ai", width - 40, 17);
        doc.setDrawColor(230, 230, 230);
        doc.line(0, 25, width, 25);
    };

    drawHeader(doc);

      const tableBody = data.map((item, i) => [
      `#${i+1}`,
      `${item.title || "Issue"}\nSeverity: ${item.severity ? item.severity.toUpperCase() : 'MEDIUM'}`,
      `OBSERVATION:\n${item.issue || item.critique}\n\nRECOMMENDATION:\n${item.solution || item.fix}`
    ]);

    autoTable(doc, {
      startY: 35,
      head: [["ID", "Heuristic Violation", "Analysis & Recommendation"]],
      body: tableBody,
      theme: 'grid',
      headStyles: { 
          fillColor: [10, 10, 10], // Black header
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          lineWidth: 0
      },
      columnStyles: { 
          0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' }, 
          1: { cellWidth: 50, fontStyle: 'bold' } 
      },
      styles: {
          fontSize: 10,
          cellPadding: 5,
          lineColor: [230, 230, 230],
          lineWidth: 0.1,
          textColor: [40, 40, 40]
      },
      alternateRowStyles: {
          fillColor: [250, 250, 250]
      },
      didDrawPage: function (data) {
          // Don't draw header on first content page (we did it manually above)
          if (data.pageNumber > 2) { 
             drawHeader(doc);
          }
      },
      margin: { top: 30 }
    });
    
    doc.save(`${title ? title.replace(/ /g, "_") : "Audit"}_Report.pdf`);
    
      // Gallery with annotations (same style upgrade)
      if (allPreviews && allPreviews.length > 0) {
         allPreviews.forEach((src, idx) => {
            doc.addPage();
            drawHeader(doc); // Use same header

            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(16);
            const groupTitle = analysisGrouped?.find(g => g.index === idx)?.ui_title || `Screenshot ${idx + 1}`;
            doc.text(groupTitle, 15, 45);

            try {
               const props = doc.getImageProperties(src);
               const maxW = width - 30;
               const scaledH = (props.height * maxW) / props.width;
               const y = 55;
               doc.addImage(src, "JPEG", 15, y, maxW, Math.min(scaledH, height - 120));
               
               // Image Analysis Table
               // If there is space below image (let's say > 30% of page left), put it there. Otherwise new page.
               const endY = y + Math.min(scaledH, height - 120) + 10;
               const spaceLeft = height - endY;
               
               let startYTable = endY;
               if (spaceLeft < 100) { 
                  doc.addPage();
                  drawHeader(doc);
                  startYTable = 40;
               }

               const groupItems = analysisGrouped?.find(g => g.index === idx)?.audit || [];
               if (groupItems.length > 0) {
                   // BACKWARD COMPATIBILITY: Similar mapping as route.js to ensure fields exist
                   const mappedItems = groupItems.map((item: any) => ({
                      title: item.title || item.issue?.substring(0, 50) + "..." || "Issue Detected",
                      issue: item.issue || item.critique || "N/A",
                      solution: item.solution || item.fix || "N/A",
                      severity: item.severity || "medium"
                   }));

                   const annBody = mappedItems.map((item, i) => [
                      `#${i + 1}`,
                      `${item.title}\nSeverity: ${item.severity ? item.severity.toUpperCase() : 'MEDIUM'}`,
                      `OBSERVATION:\n${item.issue}\n\nRECOMMENDATION:\n${item.solution}`
                   ]);

                   autoTable(doc, {
                      startY: startYTable,
                      head: [["ID", "Finding", "Analysis"]],
                      body: annBody,
                      theme: 'grid',
                      headStyles: { 
                        fillColor: [10, 10, 10], 
                        textColor: [255, 255, 255],
                        fontStyle: 'bold',
                        lineWidth: 0
                      },
                      columnStyles: { 
                        0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' }, 
                        1: { cellWidth: 50, fontStyle: 'bold' } 
                      },
                      styles: {
                        fontSize: 9,
                        cellPadding: 4,
                        lineColor: [230, 230, 230],
                        lineWidth: 0.1,
                        textColor: [40, 40, 40]
                      },
                      alternateRowStyles: { fillColor: [250, 250, 250] },
                      margin: { top: 30 },
                      didDrawPage: function (data) {
                        if (data.pageNumber > (doc as any).internal.pages.length) { 
                           drawHeader(doc);
                        }
                      },
                   });
               }

            } catch (e) {}
         });
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
      setPreviews((prev) => [...prev, ...selectedFiles.map(f => URL.createObjectURL(f))]);
    }
  };

  const removeImage = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };




  // ==========================
  // VIEW: DASHBOARD
  // ==========================
  return (
   <div className="min-h-screen bg-[#09090b] text-slate-200 font-sans overflow-hidden">
      
      {/* IMAGE PREVIEW MODAL */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8 backdrop-blur-sm cursor-zoom-out"
          >
             <motion.img 
               initial={{ scale: 0.9 }} 
               animate={{ scale: 1 }} 
               exit={{ scale: 0.9 }} 
               src={selectedImage} 
               className="max-w-full max-h-full rounded-lg shadow-2xl border border-white/10" 
             />
             <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
               <X className="w-8 h-8" />
             </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 h-screen w-72 border-r border-white/5 bg-[#0c0c0e] hidden md:flex flex-col">
        <div className="p-6">
           <div className="flex items-center gap-3 mb-10">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center"><Zap className="w-5 h-5 text-white" /></div>
             <span className="text-xl font-bold text-white tracking-tight">Heuristic<span className="text-indigo-400">.ai</span></span>
           </div>
           <nav className="space-y-2">
                  <Link href="/" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium text-slate-500 hover:text-white hover:bg-white/5">
                     <HomeIcon className="w-5 h-5" /> Home
                  </Link>
             <button onClick={() => setActiveTab("dashboard")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === 'dashboard' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
               <LayoutDashboard className="w-5 h-5" /> New Audit
             </button>
             <Link href="/compare" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium text-slate-500 hover:text-white hover:bg-white/5">
               <GitCompare className="w-5 h-5" /> Competitor Compare
             </Link>
             <button onClick={() => setActiveTab("history")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${activeTab === 'history' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
               <HistoryIcon className="w-5 h-5" /> History
             </button>
           </nav>
        </div>
        <div className="mt-auto p-6 border-t border-white/5">
           {!isSignedIn ? (
              <div className="bg-[#151518] p-4 rounded-xl border border-white/5 text-center">
                 <p className="text-xs text-slate-400 mb-3">Sign in to save history</p>
                 <SignInButton mode="modal"><button className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-bold text-xs">Sign In</button></SignInButton>
              </div>
           ) : (
              <div className="flex items-center gap-3 bg-[#151518] p-3 rounded-xl border border-white/5">
                 {user.imageUrl ? (
                     <img src={user.imageUrl} alt={user.fullName || "User"} className="w-10 h-10 rounded-full border border-white/10 shadow-lg object-cover" />
                 ) : (
                     <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">{user.firstName?.charAt(0)}</div>
                 )}
                 <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white truncate">{user.firstName}</p>
                        {isPro && <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 rounded font-bold">PRO</span>}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{isPro ? "Unlimited Access" : `${2 - auditCount} Free Audits Left`}</p>
                 </div>
                 <SignOutButton><button className="text-slate-500 hover:text-red-400 transition-colors"><LogOut className="w-4 h-4" /></button></SignOutButton>
              </div>
           )}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto relative md:ml-72">
        <div className="max-w-5xl mx-auto px-6 py-12">
          
          {/* --- TAB 1: NEW AUDIT --- */}
          {activeTab === "dashboard" && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
               <div className="flex justify-between items-end mb-12">
                 <div>
                   <h1 className="text-3xl font-bold text-white mb-2">{isSignedIn ? `Welcome back, ${user.firstName}` : "Design Audit Dashboard"}</h1>
                   <p className="text-slate-400">Upload your UI to get expert feedback instantly.</p>
                 </div>
                 {!isPro && isSignedIn && (
                    <button onClick={() => setShowSubscription(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-xs rounded-full shadow-lg shadow-orange-500/20 hover:scale-105 transition-transform"><Sparkles className="w-4 h-4" /> Upgrade to Pro</button>
                 )}
               </div>

               {/* TOOL BOX */}
               <div className="bg-[#121214] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                 
                 <div className="flex justify-center mb-8">
                    <div className="bg-black/40 p-1.5 rounded-xl flex gap-1 border border-white/5">
                       <button onClick={() => setMode("upload")} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'upload' ? 'bg-[#1F1F23] text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>Upload Images</button>
                       <button onClick={() => setMode("url")} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'url' ? 'bg-[#1F1F23] text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>Website URL</button>
                       <button onClick={() => setMode("crawler")} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'crawler' ? 'bg-[#1F1F23] text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>Site Crawler</button>
                    </div>
                 </div>
                 
                 {mode === "accessibility" && (
                    <div className="flex justify-center -mt-6 mb-8">
                       <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
                          <Eye className="w-3 h-3" /> Accessibility Mode Active
                       </span>
                    </div>
                 )}

                 <div className="min-h-[200px] flex flex-col justify-center">
                   {mode === "upload" ? (
                       previews.length > 0 ? (
                          <div className="grid grid-cols-4 gap-4">
                             {previews.map((src, i) => (
                               <div key={i} className="relative group">
                                 <img 
                                   src={src} 
                                   onClick={() => setSelectedImage(src)}
                                   className="rounded-xl border border-white/10 w-full h-32 object-cover cursor-zoom-in hover:opacity-90 transition-opacity" 
                                 />
                                 <button 
                                   onClick={() => removeImage(i)}
                                   className="absolute top-2 right-2 bg-black/60 hover:bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm transform hover:scale-110"
                                 >
                                   <X className="w-4 h-4" />
                                 </button>
                               </div>
                             ))}
                             <label className="border border-dashed border-white/10 rounded-xl flex items-center justify-center cursor-pointer hover:bg-white/5 min-h-[128px] transition-colors">
                               <Plus className="w-6 h-6 text-slate-500" />
                               <input type="file" multiple onChange={handleFileChange} className="hidden" />
                             </label>
                          </div>
                       ) : (
                          <label className="border-2 border-dashed border-white/10 rounded-2xl h-48 flex flex-col items-center justify-center hover:bg-white/[0.02] hover:border-indigo-500/30 transition-all cursor-pointer">
                             <Upload className="w-8 h-8 text-slate-500 mb-4" /><p className="text-slate-300 font-medium">Click to Upload or Paste (Ctrl+V)</p><input type="file" multiple onChange={handleFileChange} className="hidden" />
                          </label>
                       )
                    ) : (
                       <div className="w-full">
                         <input type="text" placeholder={mode === "crawler" ? "https://example.com (Scans 3 pages)" : (mode === "accessibility" ? "https://example.com (Accessibility Scan)" : "https://example.com")} value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white focus:border-indigo-500 focus:outline-none" />
                         {mode === "crawler" && <p className="text-xs text-slate-500 mt-3 text-center">Crawler will analyze home, about, pricing, and other key pages automatically.</p>}
                         {mode === "accessibility" && <p className="text-xs text-slate-500 mt-3 text-center">Simulates Low-Vision, Screen Reader, and Motor Impairment experiences.</p>}
                       </div>
                    )}
                 </div>

                 <div className="mt-8 pt-8 border-t border-white/5 flex gap-4">
                    <select value={framework} onChange={(e) => setFramework(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none">
                       <option value="nielsen">Nielsen's Heuristics</option>
                       <option value="wcag">WCAG 2.1 (Accessibility)</option>
                       <option value="gestalt">Gestalt Principles</option>
                    </select>
                    <button onClick={handleAudit} disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50">
                      {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Run Deep Audit"}
                    </button>
                 </div>
               </div>

               {/* RESULTS DISPLAY */}
               <AnimatePresence>
                 {analysis && (
                   <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12 space-y-6">
                      <div className="flex justify-between items-center">
                         <div>
                            <h2 className="text-2xl font-bold text-white">{currentUiTitle}</h2>
                            <p className="text-slate-400 text-sm">{analysis.length} Issues Found</p>
                         </div>
                         {isSignedIn && (
                            <button onClick={() => generatePDF(analysis, currentUiTitle, previews)} className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-200"><Download className="w-4 h-4" /> Export PDF</button>
                         )}
                      </div>

                      {analysis.map((item, index) => {
                         if (!isSignedIn && index > 0) return index === 1 ? (
                            <div key="lock" className="bg-[#121214] border border-white/5 rounded-2xl p-12 text-center relative overflow-hidden">
                               <div className="absolute inset-0 bg-indigo-500/5 blur-3xl" />
                               <Lock className="w-10 h-10 text-indigo-400 mx-auto mb-4 relative z-10" />
                               <h3 className="text-xl font-bold text-white relative z-10">Unlock {analysis.length - 1} More Issues</h3>
                               <SignInButton mode="modal"><button className="mt-4 px-6 py-2 bg-white text-black font-bold rounded-lg relative z-10">Sign In</button></SignInButton>
                            </div>
                         ) : null;
                         return (
                            <motion.div key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#121214] border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors">
                               <div className="flex gap-4">
                                  <div className={`mt-1 p-2 rounded-lg h-fit ${item.severity === 'High' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}><AlertCircle className="w-5 h-5" /></div>
                                  <div>
                                     <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                                     <p className="text-slate-400 text-sm mb-4">{item.critique}</p>
                                     <div className="bg-green-500/5 border border-green-500/10 p-4 rounded-lg">
                                        <p className="text-green-400 font-bold text-xs uppercase mb-1">Fix</p>
                                        <p className="text-slate-300 text-sm">{item.fix}</p>
                                     </div>
                                  </div>
                               </div>
                            </motion.div>
                         );
                      })}
                   </motion.div>
                 )}
               </AnimatePresence>
            </motion.div>
          )}

          {/* --- TAB 2: HISTORY --- */}
          {activeTab === "history" && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="text-3xl font-bold text-white mb-8">Audit History</h1>
                {history.length === 0 ? (
                   <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
                      <HistoryIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-500">No past audits found.</p>
                   </div>
                ) : (
                   <div className="grid md:grid-cols-2 gap-6">
                      {history.map((record) => (
                         <div 
                            key={record.id} 
                            className="bg-[#121214] border border-white/5 rounded-2xl p-4 hover:border-indigo-500/30 transition-all group cursor-pointer relative overflow-hidden" 
                            onClick={() => { 
                               // 1. Normalize Old Data (Map issue/solution -> critique/fix)
                               const restoredAnalysis = record.analysis.map((item: any) => ({
                                  title: item.title || item.issue?.substring(0, 30) + "..." || "Issue Finding",
                                  critique: item.critique || item.issue || "No detail provided",
                                  fix: item.fix || item.solution || "No solution provided",
                                  severity: item.severity || "medium"
                               }));
                               
                               setAnalysis(restoredAnalysis); 
                               setCurrentUiTitle(record.ui_title); 
                               
                               // 2. Restore Images
                               if (record.preview) {
                                  setPreviews([record.preview]); 
                                  setMode("upload");
                               }
                               
                               setActiveTab("dashboard"); 
                            }}
                         >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex gap-4 mb-4 relative z-10">
                               <div className="w-20 h-20 bg-black rounded-lg overflow-hidden border border-white/10 shrink-0">
                                  {/* USE CLOUD URL HERE */}
                                  {record.preview && <img src={record.preview} className="w-full h-full object-cover" />}
                               </div>
                               <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                      <h3 className="text-white font-bold truncate text-lg">{record.ui_title}</h3>
                                      <button onClick={(e) => deleteHistoryItem(record.id, e)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-1">{record.framework} • {record.date}</p>
                                  <div className="flex gap-2 mt-3">
                                      <span className="text-[10px] bg-white/5 text-slate-300 px-2 py-0.5 rounded border border-white/10">{record.analysis.length} Issues</span>
                                  </div>
                               </div>
                            </div>
                         </div>
                      ))}
                   </div>
                )}
             </motion.div>
          )}
        </div>
      </main>

      {/* SUBSCRIPTION MODAL */}
      <AnimatePresence>
        {showSubscription && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#121214] border border-white/10 p-8 rounded-3xl max-w-md w-full relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
                 <button onClick={() => setShowSubscription(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
                 <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20"><Zap className="w-8 h-8 text-amber-500" /></div>
                    <h3 className="text-2xl font-bold text-white mb-2">Upgrade to Pro</h3>
                    <p className="text-slate-400 text-sm">You've used your 2 free audits. Upgrade for unlimited access.</p>
                 </div>
                 <div className="bg-white/5 rounded-xl p-4 mb-6">
                    <div className="flex justify-between items-center mb-2"><span className="text-white font-medium">Monthly Plan</span><span className="text-xl font-bold text-white">₹109<span className="text-xs text-slate-400 font-normal">/mo</span></span></div>
                    <ul className="text-sm text-slate-400 space-y-2">
                       <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> Unlimited Audits</li>
                       <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-green-500" /> Official PDF Reports</li>
                    </ul>
                 </div>
                 <button onClick={handleUpgrade} disabled={loading} className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 rounded-xl font-bold text-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20">
                   {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Pay ₹109 & Activate"}
                 </button>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}