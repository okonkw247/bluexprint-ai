"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Loader2, ChevronRight } from "lucide-react";
import { cleanText } from "@/lib/utils";
import ProductDoc from "@/components/ui/productdoc";
import type { NicheCandidate, PackagingOption, ScriptSection, BrandData, CalendarData } from "@/lib/brain";

type Stage = "niche" | "script" | "brand";

export default function BuildPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("niche");
  const [config, setConfig] = useState<{ provider: string; model: string; apiKey: string } | null>(null);
  const [topic, setTopic] = useState("");

  const [loadingNiches, setLoadingNiches] = useState(false);
  const [niches, setNiches] = useState<NicheCandidate[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<NicheCandidate | null>(null);
  const [selectedPackaging, setSelectedPackaging] = useState<PackagingOption | null>(null);
  const [customerResearch, setCustomerResearch] = useState<string>("");

  const [loadingScript, setLoadingScript] = useState(false);
  const [scriptSections, setScriptSections] = useState<ScriptSection[]>([]);
  const [activeSection, setActiveSection] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const typewriterRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loadingBrand, setLoadingBrand] = useState(false);
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [calendar, setCalendar] = useState<CalendarData | null>(null);
  const [activeTab, setActiveTab] = useState<"product" | "charter" | "calendar" | "doc">("product");

  useEffect(() => {
    const savedConfig = localStorage.getItem("bluex_config");
    const savedTopic = sessionStorage.getItem("bluex_topic");
    if (savedConfig) setConfig(JSON.parse(savedConfig));
    if (savedTopic) setTopic(savedTopic);
  }, []);

  useEffect(() => {
    if (scriptSections.length === 0) return;
    const content = scriptSections[activeSection]?.content || "";
    setDisplayedText("");
    let i = 0;
    function type() {
      if (i < content.length) {
        setDisplayedText(content.slice(0, i + 1));
        i++;
        typewriterRef.current = setTimeout(type, 12);
      }
    }
    type();
    return () => { if (typewriterRef.current) clearTimeout(typewriterRef.current); };
  }, [activeSection, scriptSections]);

  async function handleGenerateNiches() {
    if (!config) {
      alert("No AI config found. Go back and set your API key in Settings.");
      return;
    }
    setLoadingNiches(true);
    try {
      const res = await fetch("/api/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "niches", config, data: { topic } }),
      });
      const data = await res.json();
      setNiches(data.niches || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNiches(false);
    }
  }

  async function handleGenerateScript() {
    if (!config || !selectedNiche) return;
    setLoadingScript(true);
    setStage("script");
    setScriptSections([]);
    try {
      const res = await fetch("/api/brain/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config,
          data: {
            niche: selectedNiche,
            packaging: selectedPackaging || { format: "PDF Guide", title: "The Blueprint", description: "", price: "$47", effort: "Medium", deliverable: "Complete guide" },
            customerResearch: customerResearch || "",
          },
        }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const section = JSON.parse(line);
            setScriptSections((prev) => [...prev, { title: section.title, content: section.content }]);
            setActiveSection(section.index);
          } catch {}
        }
      }
    } catch (e) {
      console.error("Script stream error:", e);
    } finally {
      setLoadingScript(false);
    }
  }

  async function handleGenerateBrand() {
    if (!config || !selectedNiche) return;
    setLoadingBrand(true);
    setStage("brand");
    try {
      const brandRes = await fetch("/api/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "brand",
          config,
          data: {
            niche: selectedNiche,
            script: scriptSections,
            packaging: selectedPackaging || {
              format: "PDF Guide",
              title: "The Blueprint",
              description: "",
              price: "$47",
              effort: "Medium",
              deliverable: "Complete guide",
            },
          },
        }),
      });
      const brandData = await brandRes.json();
      console.log("Brand data:", JSON.stringify(brandData).slice(0, 200));
      setBrand(brandData.brand);
      sessionStorage.setItem("bluex_brand", JSON.stringify(brandData.brand));
      sessionStorage.setItem("bluex_niche", JSON.stringify(selectedNiche));
      sessionStorage.setItem("bluex_sections", JSON.stringify(scriptSections));
      if (selectedPackaging) sessionStorage.setItem("bluex_packaging", JSON.stringify(selectedPackaging));

      const calRes = await fetch("/api/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "calendar",
          config,
          data: {
            niche: selectedNiche,
            brand: brandData.brand || {},
          },
        }),
      });
      const calData = await calRes.json();
      setCalendar(calData.calendar);
    } catch (e) {
      console.error("Brand/Calendar error:", e);
    } finally {
      setLoadingBrand(false);
    }
  }

  const stageIndex = stage === "niche" ? 0 : stage === "script" ? 1 : 2;

  return (
    <div className="min-h-screen bg-[#0F1117] text-white flex flex-col">

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E2130] flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1 text-[#4A4D6A] hover:text-white text-sm"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-xs text-[#4A4D6A] font-mono hidden sm:block">
            Offers › Blue-X Creator Method › Build
          </span>
        </div>
        <span className="text-xs bg-[#13152A] border border-[#6C63FF44] text-[#A78BFF] px-3 py-1 rounded-full font-mono">
          {stage === "niche" ? "Choosing the angle" : stage === "script" ? "Writing the draft" : "Defining the brand"}
        </span>
      </div>

      {/* Stage Tracker */}
      <div className="px-4 sm:px-8 pt-5 pb-2">
        <div className="relative flex items-center" style={{ height: 40 }}>
          <div className="absolute left-0 right-0 h-0.5 bg-[#1E2130] top-3" />
          <div
            className="absolute left-0 h-0.5 bg-gradient-to-r from-[#6C63FF] to-[#A78BFF] top-3 transition-all duration-700"
            style={{ width: stageIndex === 0 ? "0%" : stageIndex === 1 ? "50%" : "100%" }}
          />
          {["NICHE", "SCRIPT", "BRANDING"].map((label, i) => (
            <div
              key={label}
              className="absolute flex flex-col items-center"
              style={{
                left: i === 0 ? 0 : i === 1 ? "50%" : "100%",
                transform: i === 0 ? "none" : i === 1 ? "translateX(-50%)" : "translateX(-100%)",
              }}
            >
              <div className={`w-3 h-3 rounded-full border-2 transition-all duration-500 ${
                i < stageIndex ? "bg-[#6C63FF] border-[#6C63FF]" :
                i === stageIndex ? "bg-[#6C63FF] border-[#A78BFF] shadow-[0_0_10px_#6C63FF]" :
                "bg-[#0F1117] border-[#1E2130]"
              }`} />
              <span className={`text-xs font-mono mt-1 ${i <= stageIndex ? "text-[#A78BFF]" : "text-[#2A2D45]"}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Page Header */}
      <div className="px-4 sm:px-8 mb-5 mt-2">
        <h1 className="text-lg sm:text-xl font-bold text-[#E8E6FF]">Building your AI Digital Product</h1>
        <p className="text-sm text-[#4A4D6A] mt-1">Three steps: lock in the niche, write the script, then render the final cover.</p>
      </div>

      {/* STAGE 1 — NICHE */}
      {stage === "niche" && (
        <div className="px-4 sm:px-8 flex-1">
          {niches.length === 0 && (
            <div className="bg-[#0D0F1E] border border-[#1E2130] rounded-2xl p-4 mb-5">
              <p className="text-xs font-mono text-[#4A4D6A] uppercase mb-3">What's your topic?</p>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. content creation, freelancing, fitness..."
                className="w-full bg-[#13152A] border border-[#1E2130] rounded-xl px-4 py-3 text-sm text-[#C5C3E8] placeholder-[#2A2D45] focus:outline-none focus:border-[#6C63FF] mb-3"
              />
              <button
                onClick={handleGenerateNiches}
                disabled={loadingNiches}
                className="w-full bg-gradient-to-r from-[#6C63FF] to-[#A78BFF] py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingNiches && <Loader2 size={15} className="animate-spin" />}
                {topic ? "Generate Niches" : "Choose for me"}
              </button>
            </div>
          )}

          {loadingNiches && (
            <div className="flex items-center gap-3 mb-4">
              <Loader2 size={15} className="animate-spin text-[#6C63FF]" />
              <span className="text-xs font-mono text-[#6C63FF] uppercase tracking-widest">Weighing candidates...</span>
            </div>
          )}

          {niches.length > 0 && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={15} className="text-[#6C63FF]" />
                <span className="text-xs font-mono text-[#A78BFF] uppercase tracking-widest">
                  {niches.length}/20 ready
                </span>
                <span className="text-xs text-[#4A4D6A] ml-1">· {topic || "AI chosen"}</span>
              </div>

              <div className="flex flex-col gap-4 mb-5">
                {niches.map((niche, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedNiche(niche)}
                    className={`bg-white text-gray-900 rounded-2xl p-4 cursor-pointer border-2 transition-all ${
                      selectedNiche?.headline === niche.headline
                        ? "border-[#6C63FF]"
                        : "border-transparent"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase">{niche.category}</span>
                        <span className="text-xs text-gray-300 ml-2">{niche.sub}</span>
                      </div>
                      <span className={`text-xs font-bold text-white px-2 py-1 rounded-lg ${
                        niche.score >= 9 ? "bg-teal-500" :
                        niche.score >= 8 ? "bg-yellow-500" : "bg-orange-400"
                      }`}>{niche.score}</span>
                    </div>
                    <p className="font-bold text-sm mb-2 leading-snug">{niche.headline}</p>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{niche.description}</p>
                    {[
                      { label: "PAIN", value: niche.pain, color: "bg-orange-400" },
                      { label: "DEMAND", value: niche.demand, color: "bg-red-400" },
                      { label: "SPEED", value: niche.speed, color: "bg-green-400" },
                    ].map((bar) => (
                      <div key={bar.label} className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400 w-12">{bar.label}</span>
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                          <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${bar.value * 10}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-4">{bar.value}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {selectedNiche && (
                <button
                  onClick={handleGenerateScript}
                  className="w-full py-4 bg-gradient-to-r from-[#6C63FF] to-[#A78BFF] rounded-2xl font-bold text-white flex items-center justify-center gap-2 mb-8"
                >
                  Continue with selected niche <ChevronRight size={16} />
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* STAGE 2 — SCRIPT */}
      {stage === "script" && (
        <div className="px-4 sm:px-8 flex-1">
          <div className="bg-[#0D0F1E] border border-[#1E2130] rounded-2xl p-4 mb-5">
            <div className="flex justify-between items-start mb-3 gap-2">
              <div>
                <p className="text-xs font-mono text-[#6C63FF] uppercase">Draft Atelier</p>
                <p className="text-xs text-[#2A2D45] mt-0.5">Watch the manuscript form in order, one page at a time.</p>
              </div>
              <span className="text-xs font-mono text-[#4A4D6A] whitespace-nowrap">
                {scriptSections.length} OF 5
              </span>
            </div>
            <div className="h-1 bg-[#1E2130] rounded-full">
              <div
                className="h-full bg-gradient-to-r from-[#6C63FF] to-[#A78BFF] rounded-full transition-all duration-500"
                style={{ width: `${(scriptSections.length / 5) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs font-mono text-[#2A2D45]">MANUSCRIPT MAP</span>
              <span className="text-xs font-mono text-[#6C63FF]">{Math.round((scriptSections.length / 5) * 100)}%</span>
            </div>
          </div>

          {loadingScript && scriptSections.length === 0 && (
            <div className="flex items-center gap-3 mb-4">
              <Loader2 size={15} className="animate-spin text-[#6C63FF]" />
              <span className="text-sm text-[#4A4D6A]">Writing your manuscript...</span>
            </div>
          )}

          {scriptSections.length > 0 && (
            <>
              {/* Section tabs — horizontal scroll on mobile */}
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
                {scriptSections.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSection(i)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                      activeSection === i
                        ? "bg-[#13152A] border-[#6C63FF] text-[#C5C3E8]"
                        : "border-[#1E2130] text-[#4A4D6A]"
                    }`}
                  >
                    {i + 1}. {s.title.length > 18 ? s.title.slice(0, 18) + "..." : s.title}
                  </button>
                ))}
              </div>

              {/* Content card */}
              <div className="bg-[#0D0F1E] border border-[#1E2130] rounded-2xl p-5 mb-5">
                <p className="text-xs font-mono text-[#4A4D6A] text-right mb-2">RENDERED</p>
                <h3 className="text-base font-bold text-[#E8E6FF] mb-2">{scriptSections[activeSection]?.title}</h3>
                <p className="text-sm text-[#8B8BA7] leading-relaxed">{displayedText}</p>
              </div>
            </>
          )}

          {scriptSections.length === 5 && (
            <button
              onClick={handleGenerateBrand}
              className="w-full py-4 bg-gradient-to-r from-[#6C63FF] to-[#A78BFF] rounded-2xl font-bold text-white flex items-center justify-center gap-2 mb-3"
            >
              Define the Brand <ChevronRight size={16} />
            </button>
          )}
        </div>
      )}

      {/* STAGE 3 — BRAND */}
      {stage === "brand" && (
        <div className="px-4 sm:px-8 flex-1">
          {loadingBrand && (
            <div className="flex items-center gap-3 mb-6">
              <Loader2 size={15} className="animate-spin text-[#6C63FF]" />
              <span className="text-sm text-[#4A4D6A]">Generating your brand and launch calendar...</span>
            </div>
          )}

          {brand && (
            <>
              {/* Hero */}
              <div className="bg-gradient-to-br from-[#0D1A2A] to-[#13152A] border border-[#1E2130] rounded-2xl p-5 mb-4">
                <p className="text-xs font-mono text-[#4A4D6A] uppercase mb-1">Digital Product</p>
                <h2 className="text-xl font-bold uppercase leading-tight">{cleanText(brand.productTitle)}</h2>
                <p className="text-[#6C63FF] mt-1 text-sm">{cleanText(brand.productSubtitle)}</p>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-[#0D0F1E] rounded-2xl p-1 mb-4">
                {(["product", "charter", "calendar", "doc"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-all ${
                      activeTab === tab ? "bg-[#1A1D2E] text-white" : "text-[#4A4D6A]"
                    }`}
                  >
                    {tab === "product" ? "Product" : tab === "charter" ? "Charter" : tab === "calendar" ? "Calendar" : "📄 Doc"}
                  </button>
                ))}
              </div>

              {/* Product Tab */}
              {activeTab === "product" && (
                <div className="bg-[#0D0F1E] border border-[#1E2130] rounded-2xl p-5 mb-4">
                  <h3 className="font-bold text-base mb-1 leading-snug">
                    {cleanText(brand.productTitle)}: {cleanText(brand.productSubtitle)}
                  </h3>
                  <p className="text-[#4A4D6A] text-sm mb-4">{cleanText(brand.tagline)}</p>
                  <div className="flex gap-2 flex-wrap mb-4">
                    <span className="bg-[#1A0D2A] text-purple-400 text-xs px-3 py-1 rounded-full border border-purple-800">{brand.format}</span>
                    <span className="bg-[#0D2A1A] text-teal-400 text-xs px-3 py-1 rounded-full border border-teal-800">{brand.price}</span>
                  </div>
                  <p className="text-xs font-mono text-[#4A4D6A] uppercase mb-1">Target Audience</p>
                  <p className="text-sm text-[#8B8BA7] mb-4">{brand.targetAudience}</p>
                  <p className="text-xs font-mono text-[#4A4D6A] uppercase mb-1">Transformation</p>
                  <p className="text-sm text-[#8B8BA7] mb-4">{brand.transformation}</p>
                  <div className="grid grid-cols-3 gap-2 bg-[#13152A] rounded-xl p-4">
                    {[["Words", brand.wordCount], ["Chapters", brand.chapters], ["Tools", brand.tools]].map(([l, v]) => (
                      <div key={String(l)} className="text-center">
                        <p className="text-lg font-bold text-[#A78BFF]">{v}</p>
                        <p className="text-xs font-mono text-[#4A4D6A] uppercase">{l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Charter Tab */}
              {activeTab === "charter" && (
                <div className="bg-[#0D0F1E] border border-[#1E2130] rounded-2xl p-5 mb-4">
                  <p className="text-xs font-mono text-[#4A4D6A] uppercase mb-1">Method Name</p>
                  <p className="font-bold text-[#E8E6FF] mb-4">{cleanText(brand.methodName)}</p>
                  <p className="text-xs font-mono text-[#4A4D6A] uppercase mb-1">Format</p>
                  <p className="text-sm text-[#8B8BA7] mb-4">{brand.format}</p>
                  <p className="text-xs font-mono text-[#4A4D6A] uppercase mb-1">Suggested Price</p>
                  <p className="text-2xl font-bold text-teal-400">{brand.price}</p>
                </div>
              )}

              {/* Calendar Tab */}
              {activeTab === "calendar" && calendar && (
                <div className="flex flex-col gap-4 mb-8">
                  {calendar.phases.map((phase, pi) => (
                    <div key={pi} className="bg-[#0D0F1E] border border-[#1E2130] rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: phase.colour }} />
                        <h4 className="font-bold text-sm">{phase.name}</h4>
                      </div>
                      <div className="flex flex-col gap-2">
                        {phase.days.map((day) => (
                          <div key={day.day} className="bg-[#13152A] rounded-xl p-3 border-l-2" style={{ borderColor: phase.colour }}>
                            <p className="text-xs font-mono text-[#4A4D6A]">DAY {day.day}</p>
                            <p className="font-bold text-sm">{day.title}</p>
                            <p className="text-xs text-[#4A4D6A] mt-1">{day.task}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Doc Tab - Full Product Document */}
              {activeTab === "doc" && (
                <ProductDoc brand={brand} sections={scriptSections} />
              )}

              {/* Create eBook CTA */}
              <div className="mt-4 mb-8 bg-gradient-to-r from-[#0D1A2A] to-[#13152A] border border-[#1E2130] rounded-2xl p-5">
                <p className="text-xs font-mono text-[#4A4D6A] uppercase mb-1">Next Step</p>
                <h3 className="font-bold text-[#E8E6FF] mb-1">Build Your Complete eBook</h3>
                <p className="text-xs text-[#4A4D6A] mb-4">Generate a full Google Doc-style eBook with chapters, action items, reference library and download to PDF.</p>
                <button
                  onClick={() => router.push("/ebook")}
                  className="w-full py-3 bg-gradient-to-r from-[#6C63FF] to-[#A78BFF] rounded-xl font-bold text-white text-sm"
                >
                  Create eBook →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
