export type ProviderID = "anthropic" | "openai" | "google" | "groq" | "mistral";

export interface Provider {
  id: ProviderID;
  name: string;
  models: { id: string; name: string }[];
  keyPlaceholder: string;
  docsUrl: string;
}

export const PROVIDERS: Provider[] = [
  {
    id: "anthropic",
    name: "Anthropic Claude",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
      { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
    ],
    keyPlaceholder: "sk-ant-...",
    docsUrl: "https://console.anthropic.com",
  },
  {
    id: "openai",
    name: "OpenAI",
    models: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    ],
    keyPlaceholder: "sk-...",
    docsUrl: "https://platform.openai.com",
  },
  {
    id: "google",
    name: "Google Gemini",
    models: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
    ],
    keyPlaceholder: "AIza...",
    docsUrl: "https://aistudio.google.com",
  },
  {
    id: "groq",
    name: "Groq (Free & Fast)",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
    ],
    keyPlaceholder: "gsk_...",
    docsUrl: "https://console.groq.com",
  },
  {
    id: "mistral",
    name: "Mistral AI",
    models: [
      { id: "mistral-large-latest", name: "Mistral Large" },
      { id: "mistral-small-latest", name: "Mistral Small" },
    ],
    keyPlaceholder: "...",
    docsUrl: "https://console.mistral.ai",
  },
];

export function getProvider(id: ProviderID): Provider {
  return PROVIDERS.find((p) => p.id === id) || PROVIDERS[0];
}
