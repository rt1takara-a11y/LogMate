import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata = {
  title: "利用規約 | LogMate",
};

export default function TermsPage() {
  return (
    <LegalPage title="利用規約" updated="2026年7月15日">
      <p className="text-muted-foreground">
        本利用規約（以下「本規約」）は、LogMate（以下「本サービス」）の利用条件を定めるものです。本サービスを利用することで、本規約に同意したものとみなされます。
      </p>

      <LegalSection heading="第1条（適用）">
        <p>
          本規約は、本サービスの提供条件および本サービスの利用に関する運営者と利用者との間の権利義務関係を定めることを目的とし、利用者と運営者との間の本サービスの利用に関わる一切の関係に適用されます。
        </p>
      </LegalSection>

      <LegalSection heading="第2条（アカウント）">
        <p>
          利用者は、正確かつ最新の情報を登録するものとします。アカウントの管理は利用者自身の責任で行い、パスワード等の認証情報を第三者に利用させてはなりません。
        </p>
      </LegalSection>

      <LegalSection heading="第3条（AI機能とAPIキー）">
        <p>
          本サービスのAI機能（チャット・レポート・傾向分析等）は、利用者が設定した外部AIプロバイダー（OpenAI、Anthropic、Google等）のAPIを利用します。AI機能を利用した場合、入力されたログ等の情報が当該プロバイダーへ送信されます。
        </p>
        <p>
          APIの利用料金は、利用者と各AIプロバイダーとの契約に基づき、利用者が負担するものとします。
        </p>
      </LegalSection>

      <LegalSection heading="第4条（禁止事項）">
        <p>利用者は、本サービスの利用にあたり、次の行為をしてはなりません。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>法令または公序良俗に違反する行為</li>
          <li>本サービスの運営を妨害する行為</li>
          <li>他者の権利を侵害する情報を登録する行為</li>
          <li>不正アクセスやこれを試みる行為</li>
        </ul>
      </LegalSection>

      <LegalSection heading="第5条（データの取り扱い）">
        <p>
          利用者が入力した情報の取り扱いについては、別途定めるプライバシーポリシーに従います。利用者は、顧客情報等の第三者の個人情報を登録する場合、自らの責任において適法に取得・管理するものとします。
        </p>
      </LegalSection>

      <LegalSection heading="第6条（免責）">
        <p>
          本サービスは、AIによる分析・提案の正確性や有用性を保証しません。利用者は、本サービスの提供する情報を参考情報として利用し、経営判断は自らの責任で行うものとします。
        </p>
        <p>
          運営者は、本サービスの利用により利用者に生じた損害について、運営者の故意または重過失による場合を除き、責任を負いません。
        </p>
      </LegalSection>

      <LegalSection heading="第7条（規約の変更）">
        <p>
          運営者は、必要と判断した場合、利用者に通知することなく本規約を変更できるものとします。変更後の規約は、本サービス上に表示された時点から効力を生じます。
        </p>
      </LegalSection>

      <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
        ※ 本規約はテンプレートです。実際のサービス提供にあたっては、運営形態に合わせて弁護士等の専門家による確認を受けてください。
      </p>
    </LegalPage>
  );
}
