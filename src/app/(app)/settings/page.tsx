import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./SettingsForm";
import type { AiProvider } from "@/lib/ai/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: settings } = await supabase
    .from("user_ai_settings")
    .select("provider, model")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">設定</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AIチャット・レポート生成にはご自身のAPIキーを使用します。キーは暗号化して保存され、外部に共有されることはありません。
        </p>
      </div>
      <SettingsForm
        currentProvider={(settings?.provider as AiProvider) ?? null}
        currentModel={settings?.model ?? null}
        hasKeyConfigured={Boolean(settings)}
      />
    </div>
  );
}
