import { z } from "zod";

export const staffSchema = z.object({
  name: z.string().min(1, "名前を入力してください").max(100),
  memo: z.string().max(1000).optional(),
  strengths: z.string().max(500).optional(),
  weaknesses: z.string().max(500).optional(),
});

export type StaffInput = z.infer<typeof staffSchema>;
