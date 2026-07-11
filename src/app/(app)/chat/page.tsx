import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatThread } from "@/components/chat/ChatThread";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: aiSettings }, { data: history }] = await Promise.all([
    supabase
      .from("user_ai_settings")
      .select("provider")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("chat_messages")
      .select("role, content")
      .order("created_at", { ascending: true })
      .limit(50),
  ]);

  if (!aiSettings) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="mb-2 text-xl font-semibold text-foreground">AIチャット</h1>
        <p className="text-sm text-muted-foreground">
          チャットを始める前に、
          <Link href="/settings" className="mx-1 text-primary">
            設定画面
          </Link>
          でAI providerとAPIキーを登録してください。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-2xl flex-col">
      <h1 className="mb-4 text-xl font-semibold text-foreground">AIチャット</h1>
      <ChatThread
        initialMessages={(history ?? []).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }))}
      />
    </div>
  );
}
