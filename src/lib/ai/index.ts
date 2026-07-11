import type { AiProvider, GenerateOptions } from "./types";
import { openaiClient } from "./openai";
import { anthropicClient } from "./anthropic";
import { googleClient } from "./google";

const CLIENTS = {
  openai: openaiClient,
  anthropic: anthropicClient,
  google: googleClient,
} as const;

export function generateChatCompletion(
  provider: AiProvider,
  options: GenerateOptions,
): Promise<string> {
  return CLIENTS[provider].generateChatCompletion(options);
}

export function streamChatCompletion(
  provider: AiProvider,
  options: GenerateOptions,
): AsyncGenerator<string> {
  return CLIENTS[provider].streamChatCompletion(options);
}

export { DEFAULT_MODELS } from "./constants";
export type { AiProvider, AiMessage, GenerateOptions } from "./types";
