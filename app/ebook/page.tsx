"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp, Edit2, Upload, X, CheckCircle, Loader2, FileText, Settings, BookOpen } from "lucide-react";
import { cleanText } from "@/lib/utils";
import type { NicheCandidate, PackagingOption, BrandData, ScriptSection } from "@/lib/brain";

type StepStatus = "pending" | "generating" | "completed";
interface TocItem { id: string; title: string; type: string; content?: string; status: StepStatus; }
interface SummaryData { title: string; subtitle: string; priceRange: string; about: string; whatYouLearn: string[]; }
interface Reference { id: string; name: string; url?: string; description?: string; }

export default function EbookPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"ebook" | "builder">("builder");
  const [config, setConfig] = useState<{ provider: string; model: string; apiKey: string } | null>(null);
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [niche, setNiche] = useState<NicheCandidate | null>(null);
  const [sections, setSections] = useState<ScriptSection[]>([]);
  const [packaging, setPackaging] = useState<PackagingOption | null>(null);
  const [step1, setStep1] = useState<StepStatus>("pending");
  const [step2, setStep2] = useState<StepStatus>("pending");
  const [step3, setStep3] = useState<StepStatus>("pending");
  const [expanded, setExpanded] = useState<string>("step1");
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [references, setReferences] = useState<Reference[]>([]);
  const [showRefModal, setShowRefModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newRef, setNewRef] = useState({ name: "", url: "", description: "" });
  const [editData, setEditData] = useState({ subtitle: "", priceRange: "", content: "" });
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    const c = localStorage.getItem("bluex_config");
    const b = sessionStorage.getItem("bluex_brand");
    const n = sessionStorage.getItem("bluex_niche");
    const s = sessionStorage.getItem("bluex_sections");
    const p = sessionStorage.getItem("bluex_packaging");
    if (c) setConfig(JSON.parse(c));
    if (b) setBrand(JSON.parse(b));
    if (n) setNiche(JSON.parse(n));
    if (s) setSections(JSON.parse(s));
    if (p) setPackaging(JSON.parse(p));
  }, []);

  async function callBrain(action: string, data: Record<string, unknown>) {
    const res = await fetch("/api/brain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, config, data }),
    });
    return res.json();
  }

  async function generateSummary() {
    if (!config || !brand || !niche) {
      alert("No product data found. Please go back and complete the build flow first.");
      return;
    }
    setStep1("generating");
    try {
      const data = await callBrain("ebookSummary", { brand, niche, packaging });
      if (data.summary) {
        setSummaryData(data.summary);
        setStep1("completed");
        setExpanded("step2");
      } else {
        setSummaryData({
          title: cleanText(brand.productTitle),
          subtitle: cleanText(brand.productSubtitle),
          priceRange: brand.price || "$47-$97",
          about: brand.targetAudience || "A comprehensive guide for creators.",
          whatYouLearn: ["The core framework", "Step-by-step implementation", "Real-world tools", "Common mistakes to avoid", "How to measure results", "How to scale what works"],
        });
        setStep1("completed");
        setExpanded("step2");
      }
    } catch (e) {
      console.error(e);
      setStep1("pending");
    }
  }

  async function generateTOC() {
    if (!config || !brand || !niche) return;
    setStep2("generating");
    try {
      const data = await callBrain("ebookTOC", { brand, niche, sections });
      const tocArray = Array.isArray(data.toc) && data.toc.length > 0 ? data.toc : [
        { title: "Introduction", type: "introduction" },
        { title: "The Core Problem", type: "chapter" },
        { title: "Why Everything Else Has Failed", type: "chapter" },
        { title: `The ${brand.methodName || "Blue-X"} Method`, type: "chapter" },
        { title: "Step-by-Step Implementation", type: "chapter" },
        { title: "Tools and Resources", type: "chapter" },
        { title: "Real Results and Case Studies", type: "chapter" },
        { title: "Conclusion and Next Steps", type: "conclusion" },
      ];
      const items: TocItem[] = tocArray.map((item: { title: string; type: string }, i: number) => ({
        id: `s-${i}`, title: item.title, type: item.type, status: "pending",
      }));
      setTocItems(items);
      setActiveSection(items[0]?.id || null);
      setStep2("completed");
      setExpanded("step3");
    } catch (e) {
      console.error(e);
      setStep2("pending");
    }
  }

  async function generateChapters() {
    if (!config || !brand || !niche) return;
    const items = tocItems.length > 0 ? tocItems : [
      { id: "s-0", title: "Introduction", type: "introduction", status: "pending" as StepStatus },
      { id: "s-1", title: "The Core Problem", type: "chapter", status: "pending" as StepStatus },
      { id: "s-2", title: `The ${brand?.methodName || "Blue-X"} Method`, type: "chapter", status: "pending" as StepStatus },
      { id: "s-3", title: "Step-by-Step Implementation", type: "chapter", status: "pending" as StepStatus },
      { id: "s-4", title: "Tools and Resources", type: "chapter", status: "pending" as StepStatus },
      { id: "s-5", title: "Conclusion", type: "conclusion", status: "pending" as StepStatus },
    ];
    if (tocItems.length === 0) setTocItems(items);
    setStep3("generating");
    for (let i = 0; i < items.length; i++) {
      setTocItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: "generating" } : item));
      setActiveSection(items[i].id);
      let success = false;
      let attempts = 0;
      while (!success && attempts < 3) {
        try {
          const data = await callBrain("ebookChapter", {
            brand, niche,
            chapterTitle: items[i].title,
            chapterType: items[i].type,
            chapterIndex: i,
            totalChapters: items.length,
            references,
          });
          const chapterContent = data.content && data.content.length > 50 ? data.content : null;
          if (!chapterContent) throw new Error("Empty content");
          setTocItems(prev => prev.map((item, idx) =>
            idx === i ? { ...item, content: chapterContent, status: "completed" } : item
          ));
          success = true;
        } catch (e) {
          attempts++;
          console.error(`Chapter ${i + 1} attempt ${attempts} failed:`, e);
          if (attempts < 3) {
            await new Promise(r => setTimeout(r, 1000 * attempts));
          } else {
            setTocItems(prev => prev.map((item, idx) =>
              idx === i ? { ...item, content: `## ${items[i].title}

This chapter could not be generated. Tap regenerate to retry.`, status: "completed" } : item
            ));
          }
        }
      }
      await new Promise(r => setTimeout(r, 600));
    }
    setStep3("completed");
    setActiveTab("ebook");
    setActiveSection(items[0]?.id || null);
  }

  function addReference() {
    if (!newRef.name) return;
    setReferences(prev => [...prev, { id: Date.now().toString(), ...newRef }]);
    setNewRef({ name: "", url: "", description: "" });
    setShowRefModal(false);
  }

  const activeSectionData = tocItems.find(t => t.id === activeSection);
  const activeIdx = tocItems.findIndex(t => t.id === activeSection);

  const stepBadge = (s: StepStatus) => (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
      s === "completed" ? "bg-green-50 text-green-600" :
      s === "generating" ? "bg-yellow-50 text-yellow-600" :
      "bg-orange-50 text-orange-500"
    }`}>
      {s === "completed" ? "✓ Completed" : s === "generating" ? "⟳ Generating" : "● Pending"}
    </span>
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white z-20">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => router.push("/build")} className="flex items-center gap-1 text-gray-400 text-sm flex-shrink-0">
            <ArrowLeft size={14} /> Back
          </button>
          <span className="text-xs text-gray-300 hidden sm:block truncate">
            Products › {brand ? cleanText(brand.productTitle) : "eBook"} › Product
          </span>
        </div>
        {activeTab === "ebook" && (
          <button onClick={() => setShowSidebar(!showSidebar)}
            className="flex items-center gap-1 text-xs text-[#6C63FF] font-medium sm:hidden">
            <BookOpen size={14} /> Contents
          </button>
        )}
      </div>

      {/* Page title + tabs */}
      <div className="px-4 pt-4 pb-0 border-b border-gray-100">
        <h1 className="text-lg font-bold">Create eBook</h1>
        <p className="text-xs text-gray-400 mt-0.5 mb-3">Build and publish comprehensive digital books with chapters, sections, and rich content.</p>
        <div className="flex">
          {[
            { id: "builder", label: "eBook Builder", icon: <Settings size={12} /> },
            { id: "ebook", label: "Your eBook", icon: <FileText size={12} /> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as "ebook" | "builder")}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all mr-1 ${
                activeTab === tab.id ? "border-[#6C63FF] text-[#6C63FF]" : "border-transparent text-gray-400"
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* BUILDER */}
      {activeTab === "builder" && (
        <div className="flex-1 p-4">
          <p className="text-xs text-gray-400 mb-4">Complete these 3 steps to build your full eBook.</p>

          {/* Step 1 */}
          <div className={`border rounded-2xl mb-3 overflow-hidden ${expanded === "step1" ? "border-[#6C63FF44]" : "border-gray-200"}`}>
            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(expanded === "step1" ? "" : "step1")}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">eBook Summary</span>
                <span className="text-xs text-gray-300">Step 1</span>
                {stepBadge(step1)}
              </div>
              {expanded === "step1" ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
            </div>
            {expanded === "step1" && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 mt-3 mb-4">Define your eBook overview, target audience, and key objectives.</p>
                {step1 === "pending" && (
                  <button onClick={generateSummary} className="w-full py-3 bg-[#6C63FF] text-white rounded-xl font-semibold text-sm">
                    Get Started
                  </button>
                )}
                {step1 === "generating" && (
                  <div className="flex flex-col items-center py-6 bg-gray-50 rounded-xl">
                    <Loader2 size={18} className="animate-spin text-[#6C63FF] mb-2" />
                    <p className="text-sm font-medium text-gray-600">Generating eBook Summary...</p>
                    <p className="text-xs text-gray-400 mt-1">Creating overview based on your product data.</p>
                  </div>
                )}
                {step1 === "completed" && summaryData && (
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs bg-[#6C63FF] text-white px-2 py-1 rounded font-mono">{summaryData.priceRange}</span>
                        <span className="font-bold text-sm">{summaryData.title}</span>
                      </div>
                      <button onClick={() => { setEditData({ subtitle: summaryData.subtitle, priceRange: summaryData.priceRange, content: summaryData.about }); setShowEditModal(true); }}
                        className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                        <Edit2 size={11} /> Edit
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">{summaryData.subtitle}</p>
                    <p className="text-xs font-mono text-gray-400 uppercase mb-1">About this eBook</p>
                    <p className="text-xs text-gray-600 leading-relaxed mb-3">{summaryData.about}</p>
                    <p className="text-xs font-mono text-gray-400 uppercase mb-1">What You'll Learn</p>
                    <ul className="space-y-1 mb-4">
                      {summaryData.whatYouLearn.map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                          <span className="text-[#6C63FF] flex-shrink-0">•</span>{item}
                        </li>
                      ))}
                    </ul>
                    {/* Reference Library */}
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold">Reference Library</p>
                        <button onClick={() => setShowRefModal(true)} className="text-xs text-[#6C63FF] font-medium">+ Add</button>
                      </div>
                      <p className="text-xs text-gray-400 mb-3">Add references to make content more targeted and accurate.</p>
                      {references.length === 0 ? (
                        <div className="text-center py-4 bg-gray-50 rounded-xl mb-2">
                          <p className="text-xs text-gray-400">Reference Library is Empty</p>
                        </div>
                      ) : (
                        <div className="space-y-2 mb-2">
                          {references.map(ref => (
                            <div key={ref.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                              <p className="text-xs font-medium text-gray-700">{ref.name}</p>
                              <button onClick={() => setReferences(prev => prev.filter(r => r.id !== ref.id))}>
                                <X size={12} className="text-gray-400" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button onClick={() => setShowRefModal(true)} className="w-full py-2 border border-[#6C63FF] text-[#6C63FF] rounded-xl text-xs font-medium">
                        + Add a reference
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2 */}
          <div className={`border rounded-2xl mb-3 overflow-hidden ${expanded === "step2" ? "border-[#6C63FF44]" : "border-gray-200"}`}>
            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(expanded === "step2" ? "" : "step2")}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">Table of Contents</span>
                <span className="text-xs text-gray-300">Step 2</span>
                {stepBadge(step2)}
              </div>
              {expanded === "step2" ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
            </div>
            {expanded === "step2" && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 mt-3 mb-4">Generate and manage your eBook chapters and sections.</p>
                {step2 === "pending" && step1 === "completed" && (
                  <button onClick={generateTOC} className="w-full py-3 bg-[#6C63FF] text-white rounded-xl font-semibold text-sm">
                    Generate Table of Contents
                  </button>
                )}
                {step2 === "pending" && step1 !== "completed" && (
                  <p className="text-xs text-gray-400 text-center py-3">Complete Step 1 first.</p>
                )}
                {step2 === "generating" && (
                  <div className="space-y-2">
                    {["Introduction", "Chapter 1", "Chapter 2", "Chapter 3", "Conclusion"].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg animate-pulse">
                        <span className="text-xs text-[#6C63FF] font-mono w-5">{String(i+1).padStart(2,"0")}</span>
                        <span className="text-xs text-gray-500 flex-1">{item}</span>
                        <span className="text-xs text-yellow-500">Generating</span>
                      </div>
                    ))}
                  </div>
                )}
           {step2 === "completed" && (
                  <div className="space-y-1">
                    {tocItems.map((item, i) => (
                      <div key={item.id} className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50">
                        <span className="text-xs text-[#6C63FF] font-mono w-5">{String(i+1).padStart(2,"0")}</span>
                        <span className="text-xs text-gray-700 flex-1">{item.title}</span>
                        <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 3 */}
          <div className={`border rounded-2xl mb-4 overflow-hidden ${expanded === "step3" ? "border-[#6C63FF44]" : "border-gray-200"}`}>
            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(expanded === "step3" ? "" : "step3")}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">Chapter Content</span>
                <span className="text-xs text-gray-300">Step 3</span>
                {stepBadge(step3)}
              </div>
              {expanded === "step3" ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
            </div>
            {expanded === "step3" && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 mt-3 mb-4">Generate full content for each chapter with tools and action items.</p>
                {step3 === "pending" && step2 === "completed" && (
                  <button onClick={generateChapters} className="w-full py-3 bg-[#6C63FF] text-white rounded-xl font-semibold text-sm">
                    Generate All Chapters
                  </button>
                )}
                {step3 === "pending" && step2 !== "completed" && (
                  <p className="text-xs text-gray-400 text-center py-3">Complete Step 2 first.</p>
                )}
                {step3 === "generating" && (
                  <div>
                    <div className="flex flex-col items-center py-5 bg-gray-50 rounded-xl mb-3">
                      <Loader2 size={16} className="animate-spin text-[#6C63FF] mb-2" />
                      <p className="text-sm font-medium text-gray-600">Writing chapters in real time...</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {tocItems.filter(t => t.status === "completed").length} of {tocItems.length} complete
                      </p>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-[#6C63FF] h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${(tocItems.filter(t => t.status === "completed").length / Math.max(tocItems.length, 1)) * 100}%` }} />
                    </div>
                    <div className="mt-3 space-y-1">
                      {tocItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg">
                          <span className="text-xs text-[#6C63FF] font-mono w-5">{String(i+1).padStart(2,"0")}</span>
                          <span className="text-xs text-gray-600 flex-1">{item.title}</span>
                          <span className={`text-xs flex-shrink-0 ${
                            item.status === "completed" ? "text-green-500" :
                            item.status === "generating" ? "text-yellow-500 animate-pulse" : "text-gray-300"
                          }`}>
                            {item.status === "completed" ? "✓ Done" : item.status === "generating" ? "⟳ Writing..." : "○ Waiting"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {step3 === "completed" && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-xl">
                    <CheckCircle size={14} />
                    <p className="text-sm font-medium">All {tocItems.length} chapters generated successfully.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {step3 === "completed" && (
            <button onClick={() => setActiveTab("ebook")}
              className="w-full py-3.5 bg-gradient-to-r from-[#6C63FF] to-[#A78BFF] text-white rounded-2xl font-bold text-sm">
              View Your Complete eBook →
            </button>
          )}
        </div>
      )}

      {/* YOUR EBOOK TAB */}
      {activeTab === "ebook" && (
        <div className="flex-1 flex min-h-0 relative">
          {/* Mobile sidebar overlay */}
          {showSidebar && (
            <div className="fixed inset-0 bg-black/40 z-30 sm:hidden" onClick={() => setShowSidebar(false)} />
          )}

          {/* Sidebar */}
          <div className={`
            fixed top-0 left-0 h-full w-56 bg-white border-r border-gray-100 z-40 overflow-y-auto p-3 transition-transform duration-300
            ${showSidebar ? "translate-x-0" : "-translate-x-full"}
            sm:relative sm:translate-x-0 sm:flex sm:flex-col sm:w-52 sm:flex-shrink-0 sm:z-auto
          `}>
            <button onClick={() => setShowSidebar(false)} className="sm:hidden mb-3 text-gray-400">
              <X size={18} />
            </button>
            {brand && (
              <div className="mb-3 pb-3 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-900 leading-tight">{cleanText(brand.productTitle)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{cleanText(brand.productSubtitle)}</p>
              </div>
            )}
            <p className="text-xs font-mono text-gray-400 uppercase mb-2 tracking-wider">Table of Contents</p>
            {tocItems.length === 0 ? (
              <p className="text-xs text-gray-300">Complete the builder first.</p>
            ) : (
              <div className="space-y-0.5">
                {tocItems.map((item, i) => (
                  <button key={item.id} onClick={() => { setActiveSection(item.id); setShowSidebar(false); }}
                    className={`w-full text-left p-2 rounded-lg transition-all ${activeSection === item.id ? "bg-[#F0EFFF] border border-[#6C63FF22]" : "hover:bg-gray-50"}`}>
                    <p className="text-xs text-gray-300 font-mono">Section {i + 1}</p>
                    <p className={`text-xs font-medium leading-snug mt-0.5 ${activeSection === item.id ? "text-[#6C63FF]" : "text-gray-600"}`}>
                      {item.title}
                    </p>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="bg-[#F0EFFF] rounded-xl p-3">
                <p className="text-xs font-bold text-[#6C63FF] mb-1">🗺 Product Charter</p>
                <p className="text-xs text-gray-500 leading-relaxed">This is the DNA of your offer, which feeds directly into the Ghostwriter.</p>
                <button onClick={() => router.push("/ghostwriter")}
                  className="mt-2 w-full text-xs bg-[#6C63FF] text-white py-2 rounded-lg font-medium">
                  Continue to Ghostwriter →
                </button>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto">
            {tocItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-64 text-center p-8">
                <p className="text-4xl mb-3">📖</p>
                <p className="font-bold text-gray-900 mb-2">Your eBook is empty</p>
                <p className="text-sm text-gray-400 mb-4">Complete all 3 builder steps to generate your full eBook.</p>
                <button onClick={() => setActiveTab("builder")}
                  className="bg-[#6C63FF] text-white px-5 py-2.5 rounded-xl font-semibold text-sm">
                  Open eBook Builder
                </button>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto py-6 px-4 sm:px-8">
                {brand && !activeSectionData && (
                  <div className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight mb-1">{cleanText(brand.productTitle)}</h1>
                    <p className="text-base text-gray-400 mb-4">{cleanText(brand.productSubtitle)}</p>
                    <div className="flex items-start gap-3 p-3 bg-[#F0EFFF] rounded-xl border border-[#6C63FF22]">
                      <span className="text-base mt-0.5 flex-shrink-0">🗺</span>
                      <div>
                        <p className="text-sm font-semibold text-[#6C63FF]">Your Product Charter is the DNA of your offer.</p>
                        <p className="text-xs text-gray-400 mt-0.5">This charter guides everything from how you present your product to how it fits your distribution channels.</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeSectionData && (
                  <div>
                    <div className="flex items-center gap-2 mb-5">
                      <span className="text-xs font-mono text-white px-2 py-1 rounded flex-shrink-0"
                        style={{ background: brand?.palette?.accent || "#6C63FF" }}>
                        {String(activeIdx + 1).padStart(2, "0")}
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">{activeSectionData.title}</h2>
                    </div>

                    {activeSectionData.status === "generating" && (
                      <div className="flex items-center gap-3 py-6">
                        <Loader2 size={16} className="animate-spin text-[#6C63FF] flex-shrink-0" />
                        <span className="text-gray-400 text-sm">Generating this chapter...</span>
                      </div>
                    )}

                    {activeSectionData.content && (
                      <div className="text-sm text-gray-700 leading-loose whitespace-pre-wrap"
                        style={{ fontFamily: "Georgia, serif", lineHeight: "1.9" }}>
                        {activeSectionData.content}
                      </div>
                    )}

                    {!activeSectionData.content && activeSectionData.status !== "generating" && (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-sm mb-3">This chapter has not been generated yet.</p>
                        <button onClick={() => setActiveTab("builder")}
                          className="text-xs bg-[#6C63FF] text-white px-4 py-2 rounded-xl">
                          Go to Builder
                        </button>
                      </div>
                    )}

                    <div className="flex justify-between mt-8 pt-4 border-t border-gray-100">
                      {activeIdx > 0 && (
                        <button onClick={() => setActiveSection(tocItems[activeIdx - 1].id)}
                          className="text-sm text-gray-400 hover:text-gray-600">← Previous</button>
                      )}
                      <div className="flex-1" />
                      {activeIdx < tocItems.length - 1 && (
                        <button onClick={() => setActiveSection(tocItems[activeIdx + 1].id)}
                          className="text-sm text-[#6C63FF] font-medium">Next →</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reference Modal */}
      {showRefModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Add a Reference</h3>
              <button onClick={() => setShowRefModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-3">Upload resources to enhance your eBook content</p>
            <label className="text-sm font-medium block mb-1">Name</label>
            <input value={newRef.name} onChange={e => setNewRef(p => ({ ...p, name: e.target.value }))}
              placeholder="Enter content name" className="w-full border border-gray-200 rounded-xl p-3 text-sm mb-3 focus:outline-none focus:border-[#6C63FF]" />
            <label className="text-sm font-medium block mb-1">Upload File</label>
            <div className="w-full border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center mb-3 hover:border-[#6C63FF] cursor-pointer transition-all">
              <Upload size={18} className="text-gray-300 mb-1" />
              <span className="text-sm text-[#6C63FF] font-medium">Upload a file</span>
            </div>
            <label className="text-sm font-medium block mb-1">Or provide URL</label>
            <input value={newRef.url} onChange={e => setNewRef(p => ({ ...p, url: e.target.value }))}
              placeholder="https://example.com/resource" className="w-full border border-gray-200 rounded-xl p-3 text-sm mb-3 focus:outline-none focus:border-[#6C63FF]" />
            <label className="text-sm font-medium block mb-1">Description (Optional)</label>
            <textarea value={newRef.description} onChange={e => setNewRef(p => ({ ...p, description: e.target.value }))}
              placeholder="Brief description..." rows={2}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm mb-4 resize-none focus:outline-none focus:border-[#6C63FF]" />
            <button onClick={addReference} className="w-full py-3 bg-[#6C63FF] text-white rounded-xl font-semibold text-sm">Add Reference</button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Edit eBook Details</h3>
              <button onClick={() => setShowEditModal(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <label className="text-sm font-medium block mb-1">Subtitle</label>
            <input value={editData.subtitle} onChange={e => setEditData(p => ({ ...p, subtitle: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm mb-3 focus:outline-none focus:border-[#6C63FF]" />
            <label className="text-sm font-medium block mb-1">Price Range</label>
            <input value={editData.priceRange} onChange={e => setEditData(p => ({ ...p, priceRange: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm mb-3 focus:outline-none focus:border-[#6C63FF]" />
            <label className="text-sm font-medium block mb-2">About this eBook</label>
            <textarea value={editData.content} onChange={e => setEditData(p => ({ ...p, content: e.target.value }))}
              rows={4} className="w-full border border-gray-200 rounded-xl p-3 text-sm mb-4 resize-none focus:outline-none focus:border-[#6C63FF]" />
            <button onClick={() => {
              if (summaryData) setSummaryData(prev => prev ? { ...prev, subtitle: editData.subtitle, priceRange: editData.priceRange, about: editData.content } : null);
              setShowEditModal(false);
            }} className="w-full py-3 bg-[#6C63FF] text-white rounded-xl font-semibold text-sm">Save Changes</button>
          </div>
        </div>
      )}
    </div>
  );
}
