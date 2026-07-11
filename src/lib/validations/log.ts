import { z } from "zod";

export const logSchema = z.object({
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が不正です"),
  event: z.string().max(2000).optional(),
  goodThings: z.string().max(2000).optional(),
  improvements: z.string().max(2000).optional(),
  insights: z.string().max(2000).optional(),
  sales: z.number().nonnegative().optional().nullable(),
  customerCount: z.number().int().nonnegative().optional().nullable(),
  photoPaths: z.array(z.string()).default([]),
  todos: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
      }),
    )
    .default([]),
  staffNotes: z
    .array(
      z.object({
        staffId: z.string().uuid(),
        goodPoint: z.string().max(1000).optional(),
        improvement: z.string().max(1000).optional(),
        memo: z.string().max(1000).optional(),
      }),
    )
    .default([]),
});

export type LogInput = z.infer<typeof logSchema>;
