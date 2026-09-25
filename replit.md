# Logmate

Noah's Nalogの店舗オーナーが、日々の記録を端末内で蓄積し、傾向・判断・方針・マニュアル候補を振り返る経営ログ。

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- 店舗メモ本文と個人情報はサーバーDBへ送らず、ブラウザのIndexedDBにのみ保存する。現段階ではアプリからAIクラウド送信や同期を行わない。
- 自動分析はキーワードとカテゴリのローカル集計であり、AIによる意味理解・予測・方針との一致判定を装わない。
- ブラウザデータ削除や端末変更で記録が失われうるため、JSON書き出し・読み込みと明示的な全削除を提供する。端末内データは暗号化・自動バックアップされない。

## Product

Today、Timeline、Patterns、Decisions、Direction、Manualの6領域と、プライバシー・設定画面。

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
