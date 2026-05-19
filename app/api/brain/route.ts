import { NextRequest, NextResponse } from "next/server";
import {
  generateNiches,
  researchCustomer,
  generatePackaging,
  generateScript,
  generateBrand,
  generateCalendar,
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

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Brain API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
