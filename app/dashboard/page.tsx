"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Rocket, Search, LayoutDashboard, Tag, PenTool,
  Users, Settings, X, Zap, RefreshCw, Loader2, Menu,
} from "lucide-react";
import { PROVIDERS } from "@/lib/providers";
import type { ProviderID } from "@/lib/providers";

export default function Dashboard() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<"guided" | "fast">("fast");
  const [provider, setProvider] = useState<ProviderID>("anthropic");
  const [model, setModel] = useState(PROVIDERS[0].models[0].id);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedProvider = PROVIDERS.find((p) => p.id === provider)!;

  function handleProviderChange(id: ProviderID) {
    setProvider(id);
    setModel(PROVIDERS.find((p) => p.id === id)!.models[0].id);
  }

  function handleStart() {
    if (!apiKey) {
      alert("Please add your API key in Settings first.");
      setShowModal(false);
      setShowSettings(true);
      return;
    }
    sessionStorage.setItem("bluex_config", JSON.stringify({ provider, model, apiKey }));
    sessionStorage.setItem("bluex_topic", topic);
    setShowModal(false);
    router.push("/build");
  }

  function handleSaveSettings() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setShowSettings(false);
    }, 800);
  }

  const stats = [
    { label: "Total Products", value: "0", icon: <Tag size={16} className="text-teal-400" /> },
    { label: "Your Products", value: "0", icon: <LayoutDashboard size={16} className="text-gray-400" /> },
    { label: "Audits Run", value: "0", icon: <Search size={16} className="text-purple-400" /> },
    { label: "Team Members", value: "1", icon: <Users size={16} className="text-gray-400" /> },
  ];

  const navItems = [
    { icon: <LayoutDashboard size={16} />, label: "Dashboard", active: true },
    { icon: <Tag size={16} />, label: "Offers" },
    { icon: <PenTool size={16} />, label: "Ghostwriter" },
    { icon: <Users size={16} />, label: "Team" },
    { icon: <Settings size={16} />, label: "Settings", action: () => { setShowSidebar(false); setShowSettings(true); } },
  ];

  return (
    <div className="flex min-h-screen bg-[#0F1117] text-white">

      {/* Mobile overlay */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setShowSidebar(false)} />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-56 bg-[#0D0F1A] border-r border-[#1E2130] z-50
        flex flex-col p-4 gap-1 transition-transform duration-300
        ${showSidebar ? "translate-x-0" : "-translate-x-full"}
        lg:relative lg:translate-x-0 lg:flex lg:w-48
      `}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-white">Blue-X-Print AI</span>
            <span className="text-xs text-[#6C63FF] block">1.0 — Adams X Project</span>
          </div>
          <button className="lg:hidden" onClick={() => setShowSidebar(false)}>
            <X size={16} className="text-[#4A4D6A]" />
          </button>
        </div>
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
              item.active
                ? "bg-[#1A1D2E] text-white border-l-2 border-[#6C63FF]"
                : "text-[#4A4D6A] hover:text-white hover:bg-[#1A1D2E]"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E2130] lg:hidden">
          <button onClick={() => setShowSidebar(true)}>
            <Menu size={20} className="text-[#4A4D6A]" />
          </button>
          <span className="text-sm font-bold">Blue-X-Print AI</span>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#6C63FF] text-white text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1"
          >
            <Zap size={12} /> New
          </button>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Welcome back, Adams</h1>
              <p className="text-[#4A4D6A] mt-1 text-sm">Here's what's happening in your workspace.</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="hidden lg:flex items-center gap-2 bg-[#6C63FF] hover:bg-[#5A52E0] text-white text-sm px-4 py-2 rounded-full font-bold transition-all"
            >
              <Zap size={14} /> New
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-[#1A1D2E] rounded-2xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-[#4A4D6A] leading-tight">{stat.label}</span>
                  {stat.icon}
                </div>
                <span className="text-2xl sm:text-3xl font-bold">{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Action Cards */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-br from-[#0D2A2A] to-[#0D1A2A] border border-[#1E3A3A] hover:border-teal-500 rounded-2xl p-5 text-left transition-all"
            >
              <Rocket size={24} className="text-teal-400 mb-2" />
              <div className="font-bold text-base">Build New Product</div>
              <div className="text-[#4A4D6A] text-sm mt-1">
                Generate a niche, script, and branded digital product.
              </div>
            </button>

            <button className="bg-gradient-to-br from-[#1A0D2A] to-[#0D0F1A] border border-[#2A1E3A] hover:border-purple-500 rounded-2xl p-5 text-left transition-all">
              <Search size={24} className="text-purple-400 mb-2" />
              <div className="font-bold text-base">Run Creator Audit</div>
              <div className="text-[#4A4D6A] text-sm mt-1">
                Turn any creator into 3 monetisation opportunities.
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* New Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 text-gray-900 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold">Start a new offer</h2>
              <button onClick={() => setShowModal(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-5">
              {[
                { id: "guided", icon: <RefreshCw size={13} />, label: "Guided", sub: "Step-by-step workflow" },
                { id: "fast", icon: <Zap size={13} />, label: "Fast Mode", sub: "One topic, ~2,000 words" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as "guided" | "fast")}
                  className={`flex flex-col items-center py-3 px-3 rounded-xl border text-sm transition-all ${
                    mode === m.id ? "border-[#6C63FF] bg-[#F0EFFF]" : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs">{m.icon} {m.label}</div>
                  <span className="text-gray-400 text-xs mt-1">{m.sub}</span>
                </button>
              ))}
            </div>

            <div className="flex justify-between mb-1">
              <label className="text-sm font-medium">What's your topic?</label>
              <span className="text-xs text-gray-400">{topic.length}/500</span>
            </div>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value.slice(0, 500))}
              placeholder="choose a topic for me"
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none h-20 mb-1 focus:outline-none focus:border-[#6C63FF]"
            />
            <div className="flex justify-between mb-4">
              <span className="text-xs text-gray-400">We'll pick the niche and write a ~2,000 word AI Digital Product</span>
              <span className="text-xs text-[#6C63FF] cursor-pointer ml-2">Improve Writing</span>
            </div>

            <label className="text-sm font-medium block mb-1">Output language</label>
            <select className="w-full border border-gray-200 rounded-xl p-3 text-sm mb-5 focus:outline-none focus:border-[#6C63FF]">
              <option>🇺🇸 English</option>
            </select>

            <button
              onClick={handleStart}
              className="w-full py-3 rounded-xl font-bold text-white bg-[#6C63FF] hover:bg-[#5A52E0] transition-all flex items-center justify-center gap-2"
            >
              <Zap size={16} /> Create My AI Digital Product
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D0F1A] rounded-2xl w-full max-w-lg p-6 border border-[#1E2130] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold">AI Settings</h2>
              <button onClick={() => setShowSettings(false)}>
                <X size={20} className="text-[#4A4D6A]" />
              </button>
            </div>

            <label className="text-sm text-[#4A4D6A] block mb-2">AI Provider</label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as ProviderID)}
              className="w-full bg-[#13152A] border border-[#1E2130] rounded-xl p-3 text-sm text-white mb-4 focus:outline-none focus:border-[#6C63FF]"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            <label className="text-sm text-[#4A4D6A] block mb-2">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-[#13152A] border border-[#1E2130] rounded-xl p-3 text-sm text-white mb-4 focus:outline-none focus:border-[#6C63FF]"
            >
              {selectedProvider.models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            <label className="text-sm text-[#4A4D6A] block mb-2">
              API Key{" "}
              <a href={selectedProvider.docsUrl} target="_blank" className="text-[#6C63FF] ml-1">
                Get one here →
              </a>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={selectedProvider.keyPlaceholder}
              className="w-full bg-[#13152A] border border-[#1E2130] rounded-xl p-3 text-sm text-white mb-2 focus:outline-none focus:border-[#6C63FF]"
            />
            <p className="text-xs text-[#4A4D6A] mb-6">Your key is stored in session only — never saved to any server.</p>

            <button
              onClick={handleSaveSettings}
              className="w-full py-3 rounded-xl font-bold text-white bg-[#6C63FF] hover:bg-[#5A52E0] transition-all flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
