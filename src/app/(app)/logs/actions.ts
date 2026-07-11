"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logSchema, type LogInput } from "@/lib/validations/log";

export async function saveLog(input: LogInput): Promise<{ logDate: string }> {
  const parsed = logSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です。");

  const { data: log, error: logError } = await supabase
    .from("logs")
    .upsert(
      {
        user_id: user.id,
        log_date: parsed.logDate,
        event: parsed.event || null,
        good_things: parsed.goodThings || null,
        improvements: parsed.improvements || null,
        insights: parsed.insights || null,
        sales: parsed.sales ?? null,
        customer_count: parsed.customerCount ?? null,
        photo_paths: parsed.photoPaths,
      },
      { onConflict: "user_id,log_date" },
    )
    .select("id")
    .single();

  if (logError || !log) {
    throw new Error("ログの保存に失敗しました。");
  }

  await supabase.from("todos").delete().eq("log_id", log.id);
  if (parsed.todos.length > 0) {
    await supabase.from("todos").insert(
      parsed.todos.map((todo) => ({
        user_id: user.id,
        log_id: log.id,
        title: todo.title,
      })),
    );
  }

  await supabase.from("staff_logs").delete().eq("log_id", log.id);
  if (parsed.staffNotes.length > 0) {
    await supabase.from("staff_logs").insert(
      parsed.staffNotes.map((note) => ({
        user_id: user.id,
        log_id: log.id,
        staff_id: note.staffId,
        good_point: note.goodPoint || null,
        improvement: note.improvement || null,
        memo: note.memo || null,
      })),
    );
  }

  revalidatePath("/dashboard");
  revalidatePath(`/logs/${parsed.logDate}`);
  return { logDate: parsed.logDate };
}
