import Anthropic from "@anthropic-ai/sdk";
import type { AiClient, GenerateOptions } from "./types";
import { DEFAULT_MODELS } from "./constants";

function splitSystemAndMessages(messages: GenerateOptions["messages"]) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const rest = messages
    .filter((m): m is GenerateOptions["messages"][number] & {
      role: "user" | "assistant";
    } => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));
  return { system, messages: rest };
}

export const anthropicClient: AiClient = {
  async generateChatCompletion({ apiKey, model, messages, maxTokens }) {
    const client = new Anthropic({ apiKey });
    const { system, messages: rest } = splitSystemAndMessages(messages);

    const response = await client.messages.create({
      model: model ?? DEFAULT_MODELS.anthropic,
      system: system || undefined,
      messages: rest,
      max_tokens: maxTokens ?? 1000,
    });

    return response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
  },

  async *streamChatCompletion({ apiKey, model, messages, maxTokens }) {
    const client = new Anthropic({ apiKey });
    const { system, messages: rest } = splitSystemAndMessages(messages);

    const stream = client.messages.stream({
      model: model ?? DEFAULT_MODELS.anthropic,
      system: system || undefined,
      messages: rest,
      max_tokens: maxTokens ?? 1000,
    });

    for await (const text of stream) {
      if (text.type === "content_block_delta" && text.delta.type === "text_delta") {
        yield text.delta.text;
      }
    }
  },
};
