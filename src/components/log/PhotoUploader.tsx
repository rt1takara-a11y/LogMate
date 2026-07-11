"use client";

import { useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PHOTO_BUCKET } from "@/lib/supabase/storage";

export function PhotoUploader({
  logDate,
  userId,
  paths,
  onChange,
}: {
  logDate: string;
  userId: string;
  paths: string[];
  onChange: (paths: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);

    const supabase = createClient();
    const uploaded: string[] = [];

    for (const file of Array.from(files)) {
      const safeName = file.name.replace(/[^\w.\-]/g, "_");
      const path = `${userId}/${logDate}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { upsert: false });

      if (uploadError) {
        setError("写真のアップロードに失敗しました。");
        continue;
      }
      uploaded.push(path);
    }

    onChange([...paths, ...uploaded]);
    setUploading(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {paths.map((path) => (
          <div
            key={path}
            className="flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground"
          >
            {path.split("/").pop()}
            <button
              type="button"
              onClick={() => onChange(paths.filter((p) => p !== path))}
              className="text-muted-foreground hover:text-danger"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
        写真を追加
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
