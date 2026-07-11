export function parseAiJson<T>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "");

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error("AIの応答をJSONとして解析できませんでした。");
  }
}
