"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  customerSchema,
  customerNoteSchema,
  type CustomerInput,
  type CustomerNoteInput,
} from "@/lib/validations/customer";

export type CustomerActionState = { error: string | null; customerId?: string };

export async function createCustomer(
  input: CustomerInput,
): Promise<CustomerActionState> {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力内容を確認してください。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です。" };

  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      profile_notes: parsed.data.profileNotes || null,
      visit_pattern: parsed.data.visitPattern || null,
    })
    .select("id")
    .single();

  if (error || !customer) {
    return { error: "顧客の登録に失敗しました。" };
  }

  revalidatePath("/customers");
  return { error: null, customerId: customer.id };
}

export async function addCustomerNote(
  input: CustomerNoteInput,
): Promise<{ error: string | null }> {
  const parsed = customerNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力内容を確認してください。" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインが必要です。" };

  const { error: noteError } = await supabase.from("customer_notes").insert({
    user_id: user.id,
    customer_id: parsed.data.customerId,
    visit_date: parsed.data.visitDate,
    note: parsed.data.note,
  });

  if (noteError) {
    return { error: "メモの保存に失敗しました。" };
  }

  await supabase
    .from("customers")
    .update({ last_visit_date: parsed.data.visitDate })
    .eq("id", parsed.data.customerId)
    .or(`last_visit_date.is.null,last_visit_date.lt.${parsed.data.visitDate}`);

  revalidatePath(`/customers/${parsed.data.customerId}`);
  return { error: null };
}
