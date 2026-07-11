"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  useForm,
  useFieldArray,
  Controller,
  type UseFormRegisterReturn,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import type { LogInput } from "@/lib/validations/log";
import { saveLog } from "@/app/(app)/logs/actions";
import { VoiceInputButton } from "./VoiceInputButton";
import { PhotoUploader } from "./PhotoUploader";

type StaffOption = { id: string; name: string };

// Kept as a plain TS type (not zod-inferred) so react-hook-form's generic
// stays free of zod's input/output coercion divergence; the server action
// re-validates the payload against `logSchema` before writing to the DB.
type LogFormValues = {
  logDate: string;
  event: string;
  goodThings: string;
  improvements: string;
  insights: string;
  sales: number | null;
  customerCount: number | null;
  photoPaths: string[];
  todos: { title: string }[];
  staffNotes: {
    staffId: string;
    goodPoint: string;
    improvement: string;
    memo: string;
  }[];
};

export function LogForm({
  userId,
  logDate,
  staffOptions,
  defaultValues,
}: {
  userId: string;
  logDate: string;
  staffOptions: StaffOption[];
  defaultValues?: Partial<LogInput>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { control, register, handleSubmit, setValue, getValues } =
    useForm<LogFormValues>({
      defaultValues: {
        logDate,
        event: "",
        goodThings: "",
        improvements: "",
        insights: "",
        sales: null,
        customerCount: null,
        photoPaths: [],
        todos: [],
        staffNotes: [],
        ...defaultValues,
      },
    });

  const todos = useFieldArray({ control, name: "todos" });
  const staffNotes = useFieldArray({ control, name: "staffNotes" });

  function appendTranscript(field: "event" | "goodThings" | "improvements" | "insights", text: string) {
    const current = getValues(field) ?? "";
    setValue(field, current ? `${current}\n${text}` : text);
  }

  function onSubmit(values: LogFormValues) {
    setSubmitError(null);
    const payload: LogInput = {
      ...values,
      sales: Number.isFinite(values.sales) ? values.sales : null,
      customerCount: Number.isFinite(values.customerCount)
        ? values.customerCount
        : null,
    };
    startTransition(async () => {
      try {
        const result = await saveLog(payload);
        router.push(`/logs/${result.logDate}`);
        router.refresh();
      } catch {
        setSubmitError("保存に失敗しました。もう一度お試しください。");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-24">
      <TextSection
        label="今日の出来事"
        placeholder="例）雨だった、常連客が来た、イベントがあった"
        register={register("event")}
        onVoice={(text) => appendTranscript("event", text)}
      />
      <TextSection
        label="良かったこと"
        placeholder="例）新メニューが人気、客単価が高かった"
        register={register("goodThings")}
        onVoice={(text) => appendTranscript("goodThings", text)}
      />
      <TextSection
        label="改善点・反省"
        placeholder="例）オーダーミス、提供が遅れた"
        register={register("improvements")}
        onVoice={(text) => appendTranscript("improvements", text)}
      />
      <TextSection
        label="気付き"
        placeholder="例）女性客が新商品をよく注文した"
        register={register("insights")}
        onVoice={(text) => appendTranscript("insights", text)}
      />

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">明日やること</h2>
        <div className="space-y-2">
          {todos.fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <input
                {...register(`todos.${index}.title` as const)}
                placeholder="例）ポップ作成"
                className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => todos.remove(index)}
                className="text-muted-foreground hover:text-danger"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => todos.append({ title: "" })}
          className="inline-flex items-center gap-1 text-xs text-primary"
        >
          <Plus size={14} /> TODOを追加
        </button>
      </section>

      {staffOptions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">スタッフメモ</h2>
          <div className="space-y-4">
            {staffNotes.fields.map((field, index) => (
              <div
                key={field.id}
                className="space-y-2 rounded-xl border border-border bg-card p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <select
                    {...register(`staffNotes.${index}.staffId` as const)}
                    className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                  >
                    {staffOptions.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => staffNotes.remove(index)}
                    className="text-muted-foreground hover:text-danger"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <input
                  {...register(`staffNotes.${index}.goodPoint` as const)}
                  placeholder="良かった点"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  {...register(`staffNotes.${index}.improvement` as const)}
                  placeholder="改善点"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  {...register(`staffNotes.${index}.memo` as const)}
                  placeholder="コメント"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              staffNotes.append({
                staffId: staffOptions[0].id,
                goodPoint: "",
                improvement: "",
                memo: "",
              })
            }
            className="inline-flex items-center gap-1 text-xs text-primary"
          >
            <Plus size={14} /> スタッフメモを追加
          </button>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">売上（任意）</h2>
        <div className="flex gap-3">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-muted-foreground">売上</span>
            <input
              type="number"
              step="1"
              {...register("sales", { valueAsNumber: true })}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-muted-foreground">来客数</span>
            <input
              type="number"
              step="1"
              {...register("customerCount", { valueAsNumber: true })}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-foreground outline-none focus:border-primary"
            />
          </label>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-foreground">写真</h2>
        <Controller
          control={control}
          name="photoPaths"
          render={({ field }) => (
            <PhotoUploader
              logDate={logDate}
              userId={userId}
              paths={field.value ?? []}
              onChange={field.onChange}
            />
          )}
        />
      </section>

      {submitError && <p className="text-sm text-danger">{submitError}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="fixed bottom-6 right-6 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg disabled:opacity-60 sm:static sm:w-full"
      >
        {isPending ? "保存中…" : "ログを保存"}
      </button>
    </form>
  );
}

function TextSection({
  label,
  placeholder,
  register,
  onVoice,
}: {
  label: string;
  placeholder: string;
  register: UseFormRegisterReturn;
  onVoice: (text: string) => void;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">{label}</h2>
        <VoiceInputButton onTranscript={onVoice} />
      </div>
      <textarea
        {...register}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
      />
    </section>
  );
}
