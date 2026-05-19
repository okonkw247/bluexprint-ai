"use client";

import { useRef, useState } from "react";
import type { ScriptSection, BrandData } from "@/lib/brain";
import { cleanText } from "@/lib/utils";

interface Props {
  brand: BrandData;
  sections: ScriptSection[];
}

export default function ProductDoc({ brand, sections }: Props) {
  const docRef = useRef<HTMLDivElement>(null);
  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editedSections, setEditedSections] = useState<ScriptSection[]>(sections);

  function handlePrint() {
    const content = docRef.current?.innerHTML || "";
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${cleanText(brand.productTitle)}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Georgia', serif;
              color: #1a1a1a;
              background: white;
              padding: 0;
            }
            .cover {
              width: 100%;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, ${brand.palette?.primary || "#0F1117"}, ${brand.palette?.accent || "#6C63FF"});
              color: white;
              text-align: center;
              padding: 60px 40px;
              page-break-after: always;
            }
            .cover-icon { font-size: 72px; margin-bottom: 32px; }
            .cover-title { font-size: 42px; font-weight: 900; margin-bottom: 12px; letter-spacing: -1px; }
            .cover-subtitle { font-size: 20px; opacity: 0.8; margin-bottom: 24px; }
            .cover-meta { font-size: 13px; opacity: 0.5; font-family: monospace; }
            .toc-page { padding: 60px 80px; page-break-after: always; }
            .toc-title { font-size: 28px; font-weight: 700; margin-bottom: 32px; color: #111; border-bottom: 3px solid ${brand.palette?.accent || "#6C63FF"}; padding-bottom: 12px; }
            .toc-item { display: flex; align-items: center; padding: 12px 0; border-bottom: 1px solid #eee; }
            .toc-num { font-size: 12px; color: ${brand.palette?.accent || "#6C63FF"}; font-family: monospace; width: 40px; }
            .toc-name { font-size: 16px; color: #333; flex: 1; }
            .toc-page-num { font-size: 12px; color: #999; }
            .chapter { padding: 60px 80px; page-break-before: always; }
            .chapter-label { font-size: 11px; color: ${brand.palette?.accent || "#6C63FF"}; font-family: monospace; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 16px; }
            .chapter-title { font-size: 30px; font-weight: 800; color: #111; margin-bottom: 8px; line-height: 1.2; }
            .chapter-divider { width: 60px; height: 4px; background: ${brand.palette?.accent || "#6C63FF"}; border-radius: 2px; margin-bottom: 32px; }
            .chapter-body { font-size: 16px; line-height: 1.9; color: #333; white-space: pre-wrap; }
            .tool-block { margin: 40px 0; background: #f8f7ff; border-left: 5px solid ${brand.palette?.accent || "#6C63FF"}; padding: 24px 28px; border-radius: 0 12px 12px 0; }
            .tool-label { font-size: 10px; font-family: monospace; color: ${brand.palette?.accent || "#6C63FF"}; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
            .tool-title { font-size: 16px; font-weight: 700; color: #111; margin-bottom: 8px; }
            .tool-body { font-size: 14px; color: #555; line-height: 1.7; }
            .method-block { margin: 40px 0; background: #f0efff; border: 2px solid ${brand.palette?.accent || "#6C63FF"}22; padding: 28px; border-radius: 12px; }
            .close-page { padding: 60px 80px; background: linear-gradient(135deg, ${brand.palette?.accent || "#6C63FF"}, ${brand.palette?.primary || "#0F1117"}); color: white; min-height: 50vh; display: flex; flex-direction: column; justify-content: center; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .cover, .chapter { page-break-before: always; }
            }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }

  const tools = [
    {
      title: "Self-Assessment Worksheet",
      body: "Rate yourself honestly from 1-10 on each area covered in this chapter. Any score below 6 is your highest-leverage starting point. Write one specific action next to each low score.",
    },
    {
      title: "Implementation Checklist",
      body: "Work through each step in order. Do not move to the next item until the current one is complete. Check off each item as you finish. Revisit this checklist weekly for the first 30 days.",
    },
    {
      title: "Progress Tracker",
      body: "Record your starting baseline before implementing anything. Measure again after 7 days, 14 days, and 30 days. Even a 10% improvement in one area compounds significantly over 90 days.",
    },
  ];

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 mb-6 bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#F8F9FA] border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <div className="w-3 h-3 rounded-full bg-[#28C840]" />
          </div>
          <div className="h-4 w-px bg-gray-300" />
          <span className="text-xs text-gray-500 font-medium">
            {cleanText(brand.productTitle)}
          </span>
          <span className="text-xs bg-[#6C63FF] text-white px-2 py-0.5 rounded font-mono">
            {brand.format}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {brand.wordCount?.toLocaleString()} words
          </span>
          <button
            onClick={handlePrint}
            className="text-xs bg-[#6C63FF] hover:bg-[#5A52E0] text-white px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1"
          >
            ↓ Download PDF
          </button>
        </div>
      </div>

      {/* Formatting bar */}
      <div className="flex items-center gap-1 px-4 py-2 bg-white border-b border-gray-100 overflow-x-auto">
        {["H1", "H2", "H3", "B", "I", "U", "≡", "•", "99", "⌘"].map((btn) => (
          <button
            key={btn}
            className="w-7 h-7 flex items-center justify-center rounded text-xs text-gray-500 hover:bg-gray-100 font-mono flex-shrink-0"
          >
            {btn}
          </button>
        ))}
        <div className="h-4 w-px bg-gray-200 mx-1" />
        <span className="text-xs text-gray-400 whitespace-nowrap">Georgia · 15pt</span>
      </div>

      {/* Document scroll area */}
      <div className="overflow-y-auto max-h-[75vh] bg-[#F0F0F0] py-6 px-3">

        {/* Cover Page */}
        <div
          className="max-w-2xl mx-auto mb-4 rounded-xl overflow-hidden shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${brand.palette?.primary || "#0F1117"} 0%, ${brand.palette?.accent || "#6C63FF"} 100%)`,
            minHeight: 420,
          }}
        >
          <div className="flex flex-col items-center justify-center text-center text-white p-12 min-h-96">
            <div className="text-6xl mb-6">{brand.coverIcon || "🚀"}</div>
            <div
              className="text-xs font-mono tracking-widest opacity-60 mb-4 uppercase"
              style={{ color: brand.palette?.tint || "#E8E6FF" }}
            >
              {brand.format} · Blue-X-Print AI
            </div>
            <h1 className="text-3xl font-black mb-3 leading-tight">
              {cleanText(brand.productTitle)}
            </h1>
            <p className="text-base opacity-80 mb-8">
              {cleanText(brand.productSubtitle)}
            </p>
            <div
              className="w-12 h-1 rounded-full mb-8"
              style={{ background: brand.palette?.tint || "#E8E6FF" }}
            />
            <p className="text-xs opacity-50 font-mono">
              {brand.wordCount?.toLocaleString()} words · {brand.chapters} chapters · {brand.tools} tools
            </p>
          </div>
        </div>

        {/* Tagline page */}
        <div className="max-w-2xl mx-auto mb-4 bg-white rounded-xl shadow-sm p-10 text-center">
          <p
            className="text-xl italic font-serif leading-relaxed"
            style={{ color: brand.palette?.accent || "#6C63FF" }}
          >
            "{cleanText(brand.tagline)}"
          </p>
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">
              {cleanText(brand.methodName)}
            </p>
          </div>
        </div>

        {/* Table of Contents */}
        <div className="max-w-2xl mx-auto mb-4 bg-white rounded-xl shadow-sm p-8">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-1 h-8 rounded-full"
              style={{ background: brand.palette?.accent || "#6C63FF" }}
            />
            <h2 className="text-xl font-bold text-gray-900">Table of Contents</h2>
          </div>
          {editedSections.map((s, i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0 group">
              <span
                className="text-xs font-mono font-bold w-8"
                style={{ color: brand.palette?.accent || "#6C63FF" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-sm text-gray-700 flex-1">{s.title}</span>
              <span className="text-xs text-gray-300 font-mono">{(i + 1) * 3 + 1}</span>
            </div>
          ))}
        </div>

        {/* About this product */}
        <div className="max-w-2xl mx-auto mb-4 bg-white rounded-xl shadow-sm p-8">
          <div
            className="rounded-xl p-5 mb-0"
            style={{ background: `${brand.palette?.accent || "#6C63FF"}11`, border: `1px solid ${brand.palette?.accent || "#6C63FF"}33` }}
          >
            <p
              className="text-xs font-mono uppercase tracking-widest mb-2"
              style={{ color: brand.palette?.accent || "#6C63FF" }}
            >
              Who This Is For
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">{brand.targetAudience}</p>
            <p
              className="text-xs font-mono uppercase tracking-widest mb-2"
              style={{ color: brand.palette?.accent || "#6C63FF" }}
            >
              Your Transformation
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{brand.transformation}</p>
          </div>
        </div>

        {/* Chapters */}
        {editedSections.map((section, i) => (
          <div key={i} className="max-w-2xl mx-auto mb-4 bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Chapter header */}
            <div
              className="px-8 pt-8 pb-4"
              style={{ borderTop: `4px solid ${brand.palette?.accent || "#6C63FF"}` }}
            >
              <p
                className="text-xs font-mono tracking-widest uppercase mb-2"
                style={{ color: brand.palette?.accent || "#6C63FF" }}
              >
                Chapter {String(i + 1).padStart(2, "0")}
              </p>
              <h2 className="text-xl font-black text-gray-900 leading-tight mb-3">
                {section.title}
              </h2>
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: brand.palette?.accent || "#6C63FF" }}
              />
            </div>

            {/* Chapter body */}
            <div className="px-8 pb-6">
              {editingSection === i ? (
                <textarea
                  className="w-full text-sm text-gray-700 leading-relaxed font-serif border border-[#6C63FF] rounded-lg p-3 resize-none outline-none"
                  rows={12}
                  value={editedSections[i].content}
                  onChange={(e) => {
                    const updated = [...editedSections];
                    updated[i] = { ...updated[i], content: e.target.value };
                    setEditedSections(updated);
                  }}
                  onBlur={() => setEditingSection(null)}
                  autoFocus
                />
              ) : (
                <p
                  className="text-sm text-gray-700 leading-relaxed font-serif cursor-text whitespace-pre-wrap"
                  onClick={() => setEditingSection(i)}
                  title="Click to edit"
                >
                  {editedSections[i].content}
                </p>
              )}

              {/* Tool block every 2 chapters */}
              {i % 2 === 1 && (
                <div
                  className="mt-6 rounded-xl p-5"
                  style={{
                    background: `${brand.palette?.accent || "#6C63FF"}0D`,
                    borderLeft: `4px solid ${brand.palette?.accent || "#6C63FF"}`,
                  }}
                >
                  <p
                    className="text-xs font-mono tracking-widest uppercase mb-2"
                    style={{ color: brand.palette?.accent || "#6C63FF" }}
                  >
                    Tool {Math.ceil((i + 1) / 2)} of {brand.tools}
                  </p>
                  <p className="text-sm font-bold text-gray-800 mb-2">
                    {tools[Math.floor(i / 2) % tools.length].title}
                  </p>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {tools[Math.floor(i / 2) % tools.length].body}
                  </p>
                  {/* Worksheet lines */}
                  <div className="mt-4 space-y-2">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="flex items-center gap-2">
                        <span
                          className="text-xs font-mono w-4"
                          style={{ color: brand.palette?.accent || "#6C63FF" }}
                        >
                          {n}.
                        </span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Final page */}
        <div
          className="max-w-2xl mx-auto mb-4 rounded-xl overflow-hidden shadow-lg text-white p-10 text-center"
          style={{
            background: `linear-gradient(135deg, ${brand.palette?.accent || "#6C63FF"}, ${brand.palette?.primary || "#0F1117"})`,
          }}
        >
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-xl font-bold mb-3">You Now Have Everything You Need</h3>
          <p className="text-sm opacity-80 leading-relaxed mb-6">
            {cleanText(brand.transformation || "From where you started to where you are going — the path is now clear.")}
          </p>
          <div className="inline-block border border-white/30 rounded-xl px-6 py-3">
            <p className="text-xs opacity-60 font-mono uppercase tracking-widest">
              Built with Blue-X-Print AI · Adams X Project
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
