import { GoogleGenAI } from "@google/genai";
import type { AiClient, GenerateOptions } from "./types";
import { DEFAULT_MODELS } from "./constants";

function splitSystemAndContents(messages: GenerateOptions["messages"]) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  return { system, contents };
}

export const googleClient: AiClient = {
  async generateChatCompletion({ apiKey, model, messages, maxTokens }) {
    const client = new GoogleGenAI({ apiKey });
    const { system, contents } = splitSystemAndContents(messages);

    const response = await client.models.generateContent({
      model: model ?? DEFAULT_MODELS.google,
      contents,
      config: {
        systemInstruction: system || undefined,
        maxOutputTokens: maxTokens ?? 1000,
      },
    });

    return response.text ?? "";
  },

  async *streamChatCompletion({ apiKey, model, messages, maxTokens }) {
    const client = new GoogleGenAI({ apiKey });
    const { system, contents } = splitSystemAndContents(messages);

    const stream = await client.models.generateContentStream({
      model: model ?? DEFAULT_MODELS.google,
      contents,
      config: {
        systemInstruction: system || undefined,
        maxOutputTokens: maxTokens ?? 1000,
      },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) yield text;
    }
  },
};
