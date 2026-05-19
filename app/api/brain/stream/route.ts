import { NextRequest, NextResponse } from "next/server";
import { generateScript } from "@/lib/brain";
import type { AIConfig } from "@/lib/brain";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { config, data } = body;

  const aiConfig: AIConfig = {
    provider: config.provider,
    model: config.model,
    apiKey: config.apiKey,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await generateScript(
          aiConfig,
          data.niche,
          data.packaging || { format: "PDF Guide", title: "The Blueprint", description: "", price: "$47", effort: "Medium", deliverable: "Complete guide" },
          data.customerResearch || "",
          (index, title, content) => {
            const chunk = JSON.stringify({ index, title, content }) + "\n";
            controller.enqueue(encoder.encode(chunk));
          }
        );
      } catch (e) {
        console.error("Stream error:", e);
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
