# LogMate（AI経営ログ）

小規模事業者向けに、日々の経営ログをAIが学習・分析し、経営パートナーとして相談に乗るWebサービスのMVP実装です。詳細な仕様は [docs/spec.md](docs/spec.md) を参照してください。

## 技術スタック

- Next.js 16（App Router） / React 19 / TypeScript / Tailwind CSS v4
- Supabase（Postgres・Auth・Storage）
- AI: OpenAI / Anthropic（BYOK方式。各ユーザーが自身のAPIキーを設定画面で登録）

## セットアップ手順（初回のみ）

アプリを動かすには、以下の手動セットアップが必要です。

### 1. Supabaseプロジェクトを作成

1. [supabase.com](https://supabase.com) でプロジェクトを新規作成
2. Project Settings > API から以下を取得
   - Project URL
   - anon key
   - service_role key

### 2. データベースマイグレーションを実行

Supabase Dashboard > SQL Editor で [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) の内容を実行してください。

これにより以下が作成されます:
- `profiles` / `logs` / `staff` / `staff_logs` / `todos` / `chat_messages` / `reports` / `user_ai_settings` テーブルとRow Level Securityポリシー
- 写真保存用のprivateストレージバケット `log-photos`

実行後、Supabase Dashboard > Storage で `log-photos` バケットがprivateで作成されていることを確認してください。

### 3. Googleログインを有効化（任意だが推奨）

1. [Google Cloud Console](https://console.cloud.google.com) でOAuth 2.0クライアントID（Webアプリケーション）を作成
2. 承認済みリダイレクトURIに `https://<project-ref>.supabase.co/auth/v1/callback` を追加
3. Supabase Dashboard > Authentication > Providers > Google にクライアントID/シークレットを設定して有効化
4. Supabase Dashboard > Authentication > URL Configuration で以下を設定
   - Site URL: `http://localhost:3000`（本番環境では本番URL）
   - Redirect URLs: `http://localhost:3000/auth/callback`（本番環境では本番URLも追加）

### 4. 環境変数を設定

`.env.local.example` を参考に `.env.local` に値を入力してください。

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_ENCRYPTION_KEY=   # `openssl rand -base64 32` で生成
```

`APP_ENCRYPTION_KEY` は、ユーザーが登録するAI APIキーをDBに保存する際の暗号化に使用します。

### 5. 開発サーバーを起動

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) にアクセスすると、未ログイン時は `/login` にリダイレクトされます。サインアップ後、設定画面（`/settings`）でAI providerとAPIキーを登録すると、AIチャット・レポート生成が使えるようになります。

## 実装済み機能（MVP）

- メール/パスワード・Googleログイン認証（Supabase Auth、Row Level Securityでユーザーごとにデータ分離）
- ログ作成・編集（出来事/良かったこと/改善点/気付き/TODO/スタッフメモ/売上/写真添付/音声入力）
- ダッシュボード（今日のログ有無、週次ログ数、直近TODO/気付き、AIからの一言）
- AIチャット（過去ログを参照するRAG-lite方式、ストリーミング応答）
- AIレポート生成（日次/週次/月次、月次には傾向分析を統合）
- スタッフ管理（スタッフ別メモの蓄積とAIによる成長サマリー生成）
- TODO管理（AIによる期限提案、21日以上未完了のハイライト）
- AI provider/APIキー設定（BYOK、AES-256-GCMで暗号化保存）

## 今回のスコープ外・将来拡張

- 通知機能（仕様書§13）: 夜間のリマインドやレポート完成通知には、cronまたはpush通知基盤のデプロイが必要なため、本MVPでは未実装です。将来的にはSupabaseのScheduled Edge FunctionsやVercel Cron等での実装を想定しています。
- その他、仕様書§16に記載のPOSレジ連携・天気データ取得・多店舗管理などの拡張機能。

## AIチャットのRAGについて

Anthropicにはembeddings APIが存在せず、BYOK方式でどちらのproviderでも動作させる必要があるため、ベクター検索は採用していません。代わりに、直近ログ・日付範囲指定・キーワード検索（PostgreSQLの`pg_trgm`拡張による`ILIKE`検索）を組み合わせた軽量なRAG（`src/lib/rag/`）で過去ログを参照しています。
