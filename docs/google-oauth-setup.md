# Google ログインの有効化手順

コード側（`signInWithGoogle` とコールバック処理）は実装済みです。実際に動かすには、Google Cloud Console と Supabase での設定が必要です。以下はご自身で行っていただく作業です。

## 前提

- 本番URL: `https://logmate-vert.vercel.app`
- Supabase プロジェクト: `dxrdrxvqazhvrlnrjoqo`

## 1. Google Cloud Console で OAuth クライアントを作成

1. https://console.cloud.google.com/ を開く
2. プロジェクトを作成（または既存のものを選択）
3. 「APIとサービス」→「OAuth 同意画面」を設定
   - User Type: 外部
   - アプリ名・サポートメール等を入力して保存
4. 「APIとサービス」→「認証情報」→「認証情報を作成」→「OAuth クライアント ID」
   - アプリケーションの種類: **ウェブアプリケーション**
   - **承認済みのリダイレクト URI** に以下を追加:
     ```
     https://dxrdrxvqazhvrlnrjoqo.supabase.co/auth/v1/callback
     ```
5. 作成後に表示される **クライアント ID** と **クライアント シークレット** を控える

## 2. Supabase に登録

1. https://supabase.com/dashboard/project/dxrdrxvqazhvrlnrjoqo/auth/providers を開く
2. 「Google」を開いて有効化
3. 手順1で控えた **クライアント ID** と **クライアント シークレット** を貼り付けて保存

## 3. リダイレクト URL の許可

1. https://supabase.com/dashboard/project/dxrdrxvqazhvrlnrjoqo/auth/url-configuration を開く
2. 「Redirect URLs」に以下を追加:
   ```
   https://logmate-vert.vercel.app/auth/callback
   http://localhost:3000/auth/callback
   ```
   （ローカル開発でも使う場合は localhost の方も追加）

## 4. 動作確認

本番URLのログイン画面で「Googleでログイン」を押し、Google アカウントを選択してダッシュボードに遷移すれば成功です。

設定が終わったら教えてください。こちらで実際にログインできるか確認します。
