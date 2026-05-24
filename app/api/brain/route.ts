import { NextRequest, NextResponse } from "next/server";
import {
  generateNiches,
  researchCustomer,
  generatePackaging,
  generateScript,
  generateBrand,
  generateCalendar,
  callAI,
} from "@/lib/brain";
import type { AIConfig } from "@/lib/brain";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, config, data } = body;

    if (!config?.provider || !config?.model || !config?.apiKey) {
      return NextResponse.json(
        { error: "Missing AI config" },
        { status: 400 }
      );
    }

    const aiConfig: AIConfig = {
      provider: config.provider,
      model: config.model,
      apiKey: config.apiKey,
    };

    switch (action) {
      case "niches": {
        const niches = await generateNiches(aiConfig, data?.topic || "");
        return NextResponse.json({ niches });
      }

      case "customer": {
        if (!data?.niche) return NextResponse.json({ error: "Missing niche" }, { status: 400 });
        const research = await researchCustomer(aiConfig, data.niche);
        return NextResponse.json({ research });
      }

      case "packaging": {
        if (!data?.niche) return NextResponse.json({ error: "Missing niche" }, { status: 400 });
        const options = await generatePackaging(aiConfig, data.niche, data.customerResearch || "");
        return NextResponse.json({ options });
      }

      case "script": {
        if (!data?.niche || !data?.packaging) return NextResponse.json({ error: "Missing niche or packaging" }, { status: 400 });
        const sections: { title: string; content: string }[] = [];
        await generateScript(
          aiConfig,
          data.niche,
          data.packaging,
          data.customerResearch || "",
          (index, title, content) => { sections.push({ title, content }); }
        );
        return NextResponse.json({ sections });
      }

      case "brand": {
        if (!data?.niche || !data?.packaging || !data?.script) return NextResponse.json({ error: "Missing data" }, { status: 400 });
        const brand = await generateBrand(aiConfig, data.niche, data.packaging, data.script);
        return NextResponse.json({ brand });
      }

      case "calendar": {
        if (!data?.niche || !data?.brand) return NextResponse.json({ error: "Missing data" }, { status: 400 });
        const calendar = await generateCalendar(aiConfig, data.niche, data.brand);
        return NextResponse.json({ calendar });
      }

      case "ebookSummary": {
        if (!data?.brand || !data?.niche) return NextResponse.json({ error: "Missing data" }, { status: 400 });
        const summaryPrompt = `Create an eBook summary for: "${data.brand.productTitle}" targeting "${data.niche.headline}". Return ONLY JSON: { "title": "string", "subtitle": "string", "priceRange": "$47-$97", "about": "3 sentence overview of the ebook", "whatYouLearn": ["item1","item2","item3","item4","item5","item6"] }`;
        const summaryText = await callAI(aiConfig, "You are a digital product expert. Respond in pure JSON only. No markdown.", summaryPrompt, 800);
        const cleanS = summaryText.replace(/\`\`\`json|\`\`\`/g, "").trim();
        const summary = JSON.parse(cleanS.slice(cleanS.indexOf("{"), cleanS.lastIndexOf("}") + 1));
        return NextResponse.json({ summary });
      }

      case "ebookTOC": {
        if (!data?.brand || !data?.niche) return NextResponse.json({ error: "Missing data" }, { status: 400 });
        const tocPrompt = `Create a table of contents for eBook: "${data.brand.productTitle}" on topic: "${data.niche.headline}". Return ONLY a JSON array of 8 objects: [{"title": "Chapter Title", "type": "introduction|chapter|conclusion|bonus"}]. First must be Introduction, last must be Conclusion.`;
        const tocText = await callAI(aiConfig, "You are a digital product expert. Respond in pure JSON array only. No markdown. No explanation.", tocPrompt, 600);
        let toc = [];
        try {
          const cleanT = tocText.replace(/```json|```/g, "").trim();
          const start = cleanT.indexOf("[");
          const end = cleanT.lastIndexOf("]");
          if (start !== -1 && end !== -1) {
            toc = JSON.parse(cleanT.slice(start, end + 1));
          }
        } catch (parseErr) {
          console.error("TOC parse error:", parseErr, "Raw:", tocText.slice(0, 200));
          toc = [];
        }
        return NextResponse.json({ toc });
      }

      case "ebookChapter": {
        if (!data?.brand || !data?.niche || !data?.chapterTitle) return NextResponse.json({ error: "Missing data" }, { status: 400 });
        const chapterType = data.chapterType || "chapter";
        const chapterIndex = data.chapterIndex ?? 0;
        const totalChapters = data.totalChapters || 8;
        const isIntro = chapterType === "introduction";
        const isConclusion = chapterType === "conclusion";
        const isBonus = chapterType === "bonus";

        const chapPrompt = isIntro
          ? `Write the Introduction chapter for the eBook: "${data.brand.productTitle}" targeting "${data.niche.headline}".
Structure it exactly like this:
## Hook
A compelling 2-3 sentence hook that speaks directly to the reader pain.
## What This eBook Will Do For You
2-3 paragraphs explaining the transformation and what they will learn.
## How To Use This eBook
1 paragraph on how to get the most out of it.
## Let us Begin
1 short motivating closing paragraph.
Write 350-450 words total. Be specific, warm, and direct.`
          : isConclusion
          ? `Write the Conclusion chapter for the eBook: "${data.brand.productTitle}" targeting "${data.niche.headline}".
Structure it exactly like this:
## You Have Come A Long Way
1-2 paragraphs recapping the journey and what they have learned.
## Your Next 30 Days
3-5 specific action steps as a numbered list.
## Final Words
1 powerful closing paragraph that motivates and inspires.
Write 300-400 words total. Be motivating and specific.`
          : isBonus
          ? `Write the Bonus chapter "${data.chapterTitle}" for the eBook: "${data.brand.productTitle}" targeting "${data.niche.headline}".
Structure it exactly like this:
## Why This Bonus Matters
1 paragraph on why this extra content is valuable.
## The Bonus Content
3-4 paragraphs of specific, actionable bonus content.
## Quick Reference Checklist
5-7 checkbox items as a checklist.
Write 350-450 words total. Make it feel like a valuable extra.`
          : `Write chapter ${chapterIndex + 1} of ${totalChapters}: "${data.chapterTitle}" for the eBook: "${data.brand.productTitle}" targeting "${data.niche.headline}".
Structure it exactly like this:
## Opening
1-2 paragraphs introducing this chapter core idea with a real-world scenario.
## The Core Concept
2-3 paragraphs explaining the main concept clearly and specifically.
## Key Insights
- Insight 1 (specific and actionable)
- Insight 2 (specific and actionable)
- Insight 3 (specific and actionable)
- Insight 4 (specific and actionable)
## Action Items
1. Specific task 1
2. Specific task 2
3. Specific task 3
## Chapter Summary
1 paragraph summarising the key takeaway and bridging to the next chapter.
Write 400-500 words total. Be specific, practical, and avoid fluff.`;

        const chapText = await callAI(
          aiConfig,
          "You are a world-class digital product writer creating a premium eBook. Write in second person (you/your). Be specific, practical, and engaging. No fluff. No meta-commentary. Just the chapter content.",
          chapPrompt,
          1200
        );
        return NextResponse.json({ content: chapText });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Brain API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
