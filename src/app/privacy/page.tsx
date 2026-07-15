import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata = {
  title: "プライバシーポリシー | LogMate",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="プライバシーポリシー" updated="2026年7月15日">
      <p className="text-muted-foreground">
        本プライバシーポリシーは、LogMate（以下「本サービス」）における利用者情報の取り扱いについて定めるものです。
      </p>

      <LegalSection heading="1. 取得する情報">
        <p>本サービスは、以下の情報を取得・保存します。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>アカウント情報（メールアドレス、屋号・店舗名）</li>
          <li>利用者が入力する経営ログ（出来事、気付き、売上、来客数等）</li>
          <li>スタッフ情報および常連客ノート（氏名、メモ、来店記録等）</li>
          <li>AIプロバイダーのAPIキー（暗号化して保存）</li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. 利用目的">
        <p>取得した情報は、本サービスの提供、AIによる分析・提案の生成、および本サービスの改善のために利用します。</p>
      </LegalSection>

      <LegalSection heading="3. 顧客情報の取り扱いについて（重要）">
        <p>
          「常連客ノート」機能等で利用者が入力する顧客の氏名・好み・会話内容等は、第三者の個人情報にあたります。これらの情報について、利用者は個人情報の取扱事業者としての立場にあり、その取得・利用・管理は利用者自身の責任で適法に行うものとします。
        </p>
        <p>
          必要最小限の情報のみを記録し、目的外の利用や不必要な機微情報の記録は行わないようご注意ください。
        </p>
      </LegalSection>

      <LegalSection heading="4. 外部サービスへの送信">
        <p>
          AI機能を利用した場合、入力されたログ等の情報は、利用者が選択した外部AIプロバイダー（OpenAI、Anthropic、Google等）へ送信され、各社のポリシーに従って処理されます。各プロバイダーのプライバシーポリシーもあわせてご確認ください。
        </p>
        <p>
          本サービスのデータは、インフラ提供事業者（Supabase、Vercel）のサーバー上に保存されます。
        </p>
      </LegalSection>

      <LegalSection heading="5. データの保護">
        <p>
          データはユーザーごとに分離され、行レベルセキュリティ（RLS）により他の利用者からアクセスできないよう管理されます。AIプロバイダーのAPIキーは暗号化して保存されます。
        </p>
      </LegalSection>

      <LegalSection heading="6. データのエクスポートと削除">
        <p>
          利用者は、設定画面からご自身のデータをエクスポート（ダウンロード）できます。また、アカウントを削除することで、保存された情報を削除できます。アカウント削除後、データの復元はできません。
        </p>
      </LegalSection>

      <LegalSection heading="7. お問い合わせ">
        <p>
          本ポリシーに関するお問い合わせは、運営者までご連絡ください。
        </p>
      </LegalSection>

      <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
        ※ 本ポリシーはテンプレートです。実際のサービス提供にあたっては、運営者情報の記載や、弁護士等の専門家による確認を受けてください。
      </p>
    </LegalPage>
  );
}
