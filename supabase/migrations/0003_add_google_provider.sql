-- Allow "google" (Gemini) as a third BYOK AI provider alongside openai/anthropic.

alter table public.user_ai_settings
  drop constraint if exists user_ai_settings_provider_check;

alter table public.user_ai_settings
  add constraint user_ai_settings_provider_check
  check (provider in ('openai', 'anthropic', 'google'));
