export type AiProvider = "openai" | "anthropic" | "google";

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateOptions {
  apiKey: string;
  model?: string;
  messages: AiMessage[];
  maxTokens?: number;
}

export interface AiClient {
  generateChatCompletion(options: GenerateOptions): Promise<string>;
  streamChatCompletion(options: GenerateOptions): AsyncGenerator<string>;
}
