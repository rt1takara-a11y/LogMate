import OpenAI from "openai";
import type { AiClient, GenerateOptions } from "./types";
import { DEFAULT_MODELS } from "./constants";

function toOpenAiMessages(messages: GenerateOptions["messages"]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

export const openaiClient: AiClient = {
  async generateChatCompletion({ apiKey, model, messages, maxTokens }) {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: model ?? DEFAULT_MODELS.openai,
      messages: toOpenAiMessages(messages),
      max_tokens: maxTokens ?? 1000,
    });
    return response.choices[0]?.message?.content ?? "";
  },

  async *streamChatCompletion({ apiKey, model, messages, maxTokens }) {
    const client = new OpenAI({ apiKey });
    const stream = await client.chat.completions.create({
      model: model ?? DEFAULT_MODELS.openai,
      messages: toOpenAiMessages(messages),
      max_tokens: maxTokens ?? 1000,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  },
};
