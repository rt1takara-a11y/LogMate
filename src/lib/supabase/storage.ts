import type { SupabaseClient } from "@supabase/supabase-js";

const PHOTO_BUCKET = "log-photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function getSignedPhotoUrls(
  supabase: SupabaseClient,
  paths: string[],
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};

  const results = await Promise.all(
    paths.map(async (path) => {
      const { data } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      return [path, data?.signedUrl ?? null] as const;
    }),
  );

  const entries = results.filter(
    (entry): entry is [string, string] => entry[1] !== null,
  );
  return Object.fromEntries(entries);
}

export { PHOTO_BUCKET };
