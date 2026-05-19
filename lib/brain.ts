import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import type { ProviderID } from "./providers";

export interface AIConfig {
  provider: ProviderID;
  model: string;
  apiKey: string;
}

export interface NicheCandidate {
  rank: number;
  category: string;
  sub: string;
  score: number;
  headline: string;
  description: string;
  whyItSells: string;
  customerProfile: string;
  pain: number;
  demand: number;
  speed: number;
  avgRevenuePerSale: string;
  provenFormats: string[];
  winner: boolean;
}

export interface PackagingOption {
  id: number;
  format: string;
  title: string;
  description: string;
  price: string;
  effort: string;
  deliverable: string;
}

export interface ScriptSection {
  title: string;
  content: string;
}

export interface BrandData {
  productTitle: string;
  productSubtitle: string;
  methodName: string;
  tagline: string;
  targetAudience: string;
  transformation: string;
  format: string;
  price: string;
  wordCount: number;
  chapters: number;
  tools: number;
  palette: {
    primary: string;
    accent: string;
    tint: string;
    muted: string;
  };
  coverIcon: string;
}

export interface CalendarDay {
  day: number;
  title: string;
  task: string;
}

export interface CalendarPhase {
  name: string;
  colour: string;
  days: CalendarDay[];
}

export interface CalendarData {
  phases: CalendarPhase[];
}

function getModel(config: AIConfig) {
  switch (config.provider) {
    case "anthropic":
      return createAnthropic({ apiKey: config.apiKey })(config.model);
    case "openai":
      return createOpenAI({ apiKey: config.apiKey })(config.model);
    case "google":
      return createGoogleGenerativeAI({ apiKey: config.apiKey })(config.model);
    case "groq":
      return createGroq({ apiKey: config.apiKey })(config.model);
    default:
      return createAnthropic({ apiKey: config.apiKey })(config.model);
  }
}

async function callAI(
  config: AIConfig,
  system: string,
  prompt: string,
  maxTokens = 4000
): Promise<string> {
  const { text } = await generateText({
    model: getModel(config),
    system,
    prompt,
    maxTokens,
  });
  return text;
}

function parseJSON(text: string): unknown {
  const clean = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
  // Find first [ or { and last ] or }
  const firstBracket = Math.min(
    clean.indexOf("[") === -1 ? 99999 : clean.indexOf("["),
    clean.indexOf("{") === -1 ? 99999 : clean.indexOf("{")
  );
  const lastBracket = Math.max(
    clean.lastIndexOf("]"),
    clean.lastIndexOf("}")
  );
  if (firstBracket === 99999 || lastBracket === -1) throw new Error("No JSON found");
  return JSON.parse(clean.slice(firstBracket, lastBracket + 1));
}

// ============================================================
// ENGINE 1 — NICHE GENERATOR (generates in 2 batches of 10)
// ============================================================

export async function generateNiches(
  config: AIConfig,
  topic: string
): Promise<NicheCandidate[]> {
  const system = `You are the Blue-X-Print AI niche intelligence engine. You identify profitable digital product niches based on real purchase data from Whop, Gumroad, Etsy, Stan Store, and Teachable. Respond in pure JSON array only. No markdown. No explanation. Just the raw JSON array.`;

  const makePrompt = (batch: number) => `${
    topic
      ? `Generate ${batch === 1 ? "the first 10" : "10 more different"} high-opportunity digital product niches for the topic area: "${topic}".`
      : `Generate ${batch === 1 ? "10" : "10 more different"} high-opportunity digital product niches across all categories.`
  }

Return ONLY a JSON array of exactly 10 objects. Each object:
{
  "rank": ${batch === 1 ? "1-10" : "11-20"},
  "category": "BUSINESS|HEALTH|CAREER|FINANCE|EDUCATION|MARKETING|PRODUCTIVITY|PARENTING|HOME|FITNESS",
  "sub": "2-3 word sub-niche",
  "score": 7.0-9.9,
  "headline": "Helping [specific audience] [outcome] by [method]",
  "description": "2 sentences on what it does and why it works",
  "whyItSells": "1 sentence market signal with real numbers",
  "customerProfile": "1 sentence exact person description",
  "pain": 1-10,
  "demand": 1-10,
  "speed": 1-10,
  "avgRevenuePerSale": "$XX-$XXX",
  "provenFormats": ["Format1", "Format2"],
  "winner": ${batch === 1 ? "true for highest scored, false for rest" : "false"}
}`;

  try {
    const [batch1Text, batch2Text] = await Promise.all([
      callAI(config, system, makePrompt(1), 3000),
      callAI(config, system, makePrompt(2), 3000),
    ]);

    const batch1 = parseJSON(batch1Text) as NicheCandidate[];
    const batch2 = parseJSON(batch2Text) as NicheCandidate[];

    const combined = [...batch1, ...batch2].map((n, i) => ({
      ...n,
      rank: i + 1,
      winner: i === 0,
    }));

    return combined.sort((a, b) => b.score - a.score);
  } catch (e) {
    console.error("Niche generation failed:", e);
    return getFallbackNiches(topic);
  }
}

// ============================================================
// ENGINE 2 — CUSTOMER RESEARCH
// ============================================================

export async function researchCustomer(
  config: AIConfig,
  niche: NicheCandidate
): Promise<string> {
  const system = `You are a market research specialist. Write in plain flowing paragraphs. No headers. No bullet points. No markdown.`;

  const prompt = `Write a 3-paragraph customer research profile for this digital product niche:
"${niche.headline}"

Paragraph 1: Who this exact person is — daily situation, what keeps them stuck, what they have tried
Paragraph 2: What they search for, language they use, emotional state when searching  
Paragraph 3: What they want to feel, what a perfect solution looks like, what makes them buy immediately`;

  try {
    return await callAI(config, system, prompt, 800);
  } catch (e) {
    console.error("Customer research failed:", e);
    return niche.customerProfile;
  }
}

// ============================================================
// ENGINE 3 — PACKAGING OPTIONS
// ============================================================

export async function generatePackaging(
  config: AIConfig,
  niche: NicheCandidate,
  customerResearch: string
): Promise<PackagingOption[]> {
  const system = `You are a digital product strategist. You know what packaging formats sell on Whop, Gumroad, Etsy, and Stan Store. Respond in pure JSON array only. No markdown. No explanation.`;

  const prompt = `Generate 20 packaging options for:
Niche: "${niche.headline}"
Customer: ${customerResearch.slice(0, 200)}

Return ONLY a JSON array of 20 objects:
{
  "id": 1-20,
  "format": "PDF Guide|Notion Template|Mini Course|Checklist|Planner|Toolkit|Swipe File|Email Sequence|Workbook|Masterclass",
  "title": "specific product title",
  "description": "1 sentence what buyer gets",
  "price": "$27|$47|$97|$197|$297",
  "effort": "Low|Medium|High",
  "deliverable": "exactly what buyer receives"
}`;

  try {
    const text = await callAI(config, system, prompt, 3000);
    return parseJSON(text) as PackagingOption[];
  } catch (e) {
    console.error("Packaging failed:", e);
    return getFallbackPackaging(niche);
  }
}

// ============================================================
// ENGINE 4 — SCRIPT WRITER (section by section)
// ============================================================

const SCRIPT_SECTIONS = [
  "The Core Problem — Why This Is Harder Than It Should Be",
  "Why Everything Else Has Failed — The Real Reason",
  "The Blue-X Method — A Completely Different Approach",
  "Step-by-Step Implementation — Exactly What To Do",
  "Results, Timeline, and What to Expect",
];

export async function generateScript(
  config: AIConfig,
  niche: NicheCandidate,
  packaging: PackagingOption,
  customerResearch: string,
  onSection: (index: number, title: string, content: string) => void
): Promise<ScriptSection[]> {
  const system = `You are Blue-X-Print AI, a premium digital product writer. You write specific, concrete, actionable content. No fluff. No filler. Start immediately with value. Write in second person. Respond with the section content only — no headers, no labels.`;

  const results: ScriptSection[] = [];

  for (let i = 0; i < SCRIPT_SECTIONS.length; i++) {
    const title = SCRIPT_SECTIONS[i];
    const prompt = `Write the "${title}" section for:
Product: "${packaging.title}" (${packaging.format})
Niche: ${niche.headline}
Customer: ${customerResearch.slice(0, 150)}

Write 200-250 words. Be specific. Use real numbers and scenarios. No generic advice.`;

    try {
      const content = await callAI(config, system, prompt, 600);
      results.push({ title, content });
      onSection(i, title, content);
    } catch (e) {
      console.error(`Section ${i} failed:`, e);
      const fallback = "Section generation failed — please retry.";
      results.push({ title, content: fallback });
      onSection(i, title, fallback);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  return results;
}

// ============================================================
// ENGINE 5 — BRAND GENERATOR
// ============================================================

export async function generateBrand(
  config: AIConfig,
  niche: NicheCandidate,
  packaging: PackagingOption,
  script: ScriptSection[]
): Promise<BrandData> {
  const system = `You are Blue-X-Print AI brand strategist. You create sharp digital product brands that sell. Respond in pure JSON object only. No markdown. No explanation.`;

  const scriptSummary = script
    .map((s) => `${s.title}: ${s.content.slice(0, 60)}`)
    .join(" | ");

  const prompt = `Create brand for:
Format: ${packaging.format}
Title: "${packaging.title}"
Price: ${packaging.price}
Niche: ${niche.headline}
Script: ${scriptSummary}

Return ONLY a JSON object:
{
  "productTitle": "3-6 bold words",
  "productSubtitle": "5-8 word action subtitle",
  "methodName": "named system inside product",
  "tagline": "one transformation sentence",
  "targetAudience": "2 sentences exact buyer",
  "transformation": "2 sentences before and after",
  "format": "${packaging.format}",
  "price": "${packaging.price}",
  "wordCount": 2000-3500,
  "chapters": 4-7,
  "tools": 3-8,
  "palette": {"primary": "#hex", "accent": "#hex", "tint": "#hex", "muted": "#hex"},
  "coverIcon": "one emoji"
}`;

  try {
    const text = await callAI(config, system, prompt, 800);
    return parseJSON(text) as BrandData;
  } catch (e) {
    console.error("Brand failed:", JSON.stringify(e), String(e));
    return getFallbackBrand(niche, packaging);
  }
}

// ============================================================
// ENGINE 6 — LAUNCH CALENDAR
// ============================================================

export async function generateCalendar(
  config: AIConfig,
  niche: NicheCandidate,
  brand: BrandData
): Promise<CalendarData> {
  const system = `You are a digital product launch strategist. Every task must be specific to this exact product. Respond in pure JSON only. No markdown.`;

  const prompt = `14-day launch calendar for:
"${brand.productTitle}" — ${brand.format} — ${brand.price}
Audience: ${niche.headline}

Return ONLY this JSON:
{
  "phases": [
    {"name": "Phase 1: Foundation", "colour": "#F59E0B", "days": [
      {"day": 1, "title": "title", "task": "specific action"},
      {"day": 2, "title": "title", "task": "specific action"},
      {"day": 3, "title": "title", "task": "specific action"}
    ]},
    {"name": "Phase 2: Value Delivery", "colour": "#3B82F6", "days": [days 4-7]},
    {"name": "Phase 3: Launch", "colour": "#10B981", "days": [days 8-11]},
    {"name": "Phase 4: Scale", "colour": "#8B5CF6", "days": [days 12-14]}
  ]
}`;

  try {
    const text = await callAI(config, system, prompt, 1500);
    return parseJSON(text) as CalendarData;
  } catch (e) {
    console.error("Calendar failed:", e);
    return getFallbackCalendar();
  }
}

// ============================================================
// FALLBACKS
// ============================================================

function getFallbackNiches(topic: string): NicheCandidate[] {
  const base = topic || "digital products";
  return Array.from({ length: 9 }, (_, i) => ({
    rank: i + 1,
    category: ["BUSINESS","PRODUCTIVITY","FINANCE","HEALTH","EDUCATION","MARKETING","CAREER","PARENTING","FITNESS"][i],
    sub: ["digital products","ADHD systems","freelance pricing","sleep habits","online courses","content systems","job search","toddler sleep","home fitness"][i],
    score: parseFloat((9.2 - i * 0.2).toFixed(1)),
    headline: `Helping ${base} enthusiasts solve problem ${i + 1} with a proven system`,
    description: "High demand niche with proven purchase history on major digital product platforms.",
    whyItSells: "Consistent monthly search volume with strong buyer intent signals.",
    customerProfile: "Adult professional aged 25-45 with disposable income and a specific unsolved problem.",
    pain: 9 - Math.floor(i / 3),
    demand: 9 - Math.floor(i / 3),
    speed: 8 - Math.floor(i / 3),
    avgRevenuePerSale: ["$47-$197","$27-$67","$37-$97","$47-$147","$97-$297","$27-$97","$47-$197","$27-$47","$37-$97"][i],
    provenFormats: [["PDF Guide","Mini Course"],["Notion Template","Planner"],["PDF Guide","Swipe File"]][i % 3],
    winner: i === 0,
  }));
}

function getFallbackPackaging(niche: NicheCandidate): PackagingOption[] {
  return [
    { id: 1, format: "PDF Guide", title: `The ${niche.sub} Blueprint`, description: "Complete system from start to result.", price: "$47", effort: "Medium", deliverable: "35-page PDF with frameworks and worksheets" },
    { id: 2, format: "Notion Template", title: `The ${niche.sub} Dashboard`, description: "Ready-to-use Notion workspace.", price: "$27", effort: "Low", deliverable: "Notion template with 5 databases" },
    { id: 3, format: "Mini Course", title: `${niche.sub} in 7 Days`, description: "Video course walking through the system.", price: "$97", effort: "High", deliverable: "7 video lessons plus workbook" },
  ];
}

function getFallbackBrand(niche: NicheCandidate, packaging: PackagingOption): BrandData {
  return {
    productTitle: packaging.title,
    productSubtitle: `For ${niche.sub} who want real results`,
    methodName: "The Blue-X System",
    tagline: "From stuck and overwhelmed to clear and profitable in under a week.",
    targetAudience: niche.customerProfile,
    transformation: "Before: frustrated with no clear path. After: clear system, first revenue, compounding momentum.",
    format: packaging.format,
    price: packaging.price,
    wordCount: 2500,
    chapters: 5,
    tools: 6,
    palette: { primary: "#0F1117", accent: "#6C63FF", tint: "#E8E6FF", muted: "#8B8BA7" },
    coverIcon: "🚀",
  };
}

function getFallbackCalendar(): CalendarData {
  return {
    phases: [
      {
        name: "Phase 1: Foundation", colour: "#F59E0B",
        days: [
          { day: 1, title: "Position", task: "Write your one-sentence product promise and update your bio." },
          { day: 2, title: "Audience", task: "Identify 10 exact buyers and engage with their content today." },
          { day: 3, title: "Community", task: "Join 2 communities where your target buyer already gathers." },
        ],
      },
      {
        name: "Phase 2: Value Delivery", colour: "#3B82F6",
        days: [
          { day: 4, title: "Authority", task: "Post one piece of content showing your method with a real result." },
          { day: 5, title: "Trust", task: "Share behind the scenes of the product you are building." },
          { day: 6, title: "Proof", task: "Collect one testimonial from someone you have helped." },
          { day: 7, title: "Waitlist", task: "Open early access waitlist and announce it everywhere." },
        ],
      },
      {
        name: "Phase 3: Launch", colour: "#10B981",
        days: [
          { day: 8, title: "Announce", task: "Send launch email with product link and early price." },
          { day: 9, title: "Urgency", task: "Post 48-hour countdown — price increases after this." },
          { day: 10, title: "Objections", task: "Address top 3 objections publicly in post or email." },
          { day: 11, title: "Close", task: "Send final email — price increases at midnight." },
        ],
      },
      {
        name: "Phase 4: Scale", colour: "#8B5CF6",
        days: [
          { day: 12, title: "Collect", task: "Email all buyers requesting a one-sentence result testimonial." },
          { day: 13, title: "Upsell", task: "Offer buyers a 30-minute implementation call at fixed fee." },
          { day: 14, title: "Automate", task: "Set up evergreen funnel so new leads see the product automatically." },
        ],
      },
    ],
  };
}
