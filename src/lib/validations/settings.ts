import { z } from "zod";

export const aiSettingsSchema = z.object({
  provider: z.enum(["openai", "anthropic", "google"]),
  model: z.string().max(100).optional(),
  // Empty/omitted means "keep the currently stored key unchanged".
  apiKey: z
    .union([z.literal(""), z.string().min(10, "APIキーの形式が正しくありません").max(500)])
    .optional(),
});

export type AiSettingsInput = z.infer<typeof aiSettingsSchema>;
