import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "名前を入力してください").max(100),
  profileNotes: z.string().max(1000).optional(),
  visitPattern: z.string().max(200).optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const customerNoteSchema = z.object({
  customerId: z.string().uuid(),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません"),
  note: z.string().min(1, "内容を入力してください").max(1000),
});

export type CustomerNoteInput = z.infer<typeof customerNoteSchema>;
