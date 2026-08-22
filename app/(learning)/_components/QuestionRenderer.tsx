"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PublicQuestion } from "@/lib/services/attempt-start.service";

export type ResponseValue = string | string[] | Array<{ left: string; right: string }>;

const inputClass =
  "w-full rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/15 dark:bg-neutral-800";

export function QuestionRenderer({
  question,
  value,
  onChange,
  disabled = false,
}: {
  question: PublicQuestion;
  value: ResponseValue | undefined;
  onChange: (value: ResponseValue) => void;
  /** Locks the question after it's been checked (quiz practice mode) so the
   * student can't edit an answer whose feedback is already shown. */
  disabled?: boolean;
}) {
  switch (question.type) {
    case "mcq":
    case "true_false":
      return (
        <div className="flex flex-col gap-2">
          {question.answers.map((a) => (
            <label key={a.id} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name={question.id}
                checked={value === a.id}
                onChange={() => onChange(a.id)}
                disabled={disabled}
              />
              <span>{a.content}</span>
            </label>
          ))}
        </div>
      );

    case "fill_blank":
      return (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder="اكتب إجابتك"
          disabled={disabled}
        />
      );

    case "essay":
      return (
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className={inputClass}
          placeholder="اكتب إجابتك"
          disabled={disabled}
        />
      );

    case "ordering": {
      const order =
        Array.isArray(value) && value.every((v) => typeof v === "string")
          ? (value as string[])
          : question.answers.map((a) => a.id);
      const byId = new Map(question.answers.map((a) => [a.id, a]));

      const move = (index: number, dir: -1 | 1) => {
        const target = index + dir;
        if (target < 0 || target >= order.length) return;
        const next = [...order];
        [next[index], next[target]] = [next[target], next[index]];
        onChange(next);
      };

      return (
        <ol className="flex flex-col gap-2">
          {order.map((id, index) => (
            <li
              key={id}
              className="flex items-center justify-between rounded-lg border border-black/15 px-3 py-2 text-sm dark:border-white/15"
            >
              <span>
                {index + 1}. {byId.get(id)?.content}
              </span>
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  className="px-2 disabled:opacity-40"
                  aria-label="لأعلى"
                  disabled={disabled}
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  className="px-2 disabled:opacity-40"
                  aria-label="لأسفل"
                  disabled={disabled}
                >
                  ▼
                </button>
              </span>
            </li>
          ))}
        </ol>
      );
    }

    case "matching":
    case "drag_drop": {
      const left = question.answers.filter((a) => a.side === "left");
      const right = question.answers.filter((a) => a.side === "right");
      const pairs = Array.isArray(value) ? (value as Array<{ left: string; right: string }>) : [];
      const pairByLeft = new Map(pairs.map((p) => [p.left, p.right]));

      const setPair = (leftId: string, rightId: string) => {
        onChange([...pairs.filter((p) => p.left !== leftId), { left: leftId, right: rightId }]);
      };

      return (
        <div className="flex flex-col gap-2">
          {left.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3">
              <span className="text-sm">{l.content}</span>
              <Select
                value={pairByLeft.get(l.id) ?? ""}
                onValueChange={(rightId) => setPair(l.id, rightId as string)}
                disabled={disabled}
                items={right.map((r) => ({ label: r.content, value: r.id }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="اختر..." />
                </SelectTrigger>
                <SelectContent>
                  {right.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.content}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      );
    }

    default:
      return null;
  }
}
