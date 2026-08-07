"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { QuestionInput } from "@/lib/api/queries/question-types";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/** Shared between the per-lesson quiz builder and the per-course exam
 * builder - only the parent id (quiz vs exam) differs, which the caller
 * handles via its own useCreateQuizQuestion/useCreateExamQuestion mutation. */
export function QuestionForm({
  nextOrder,
  onSubmit,
  isPending,
  onDone,
}: {
  nextOrder: number;
  onSubmit: (question: QuestionInput) => void;
  isPending: boolean;
  onDone: () => void;
}) {
  const [type, setType] = useState<"mcq" | "true_false">("mcq");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState([
    { content: "", is_correct: true },
    { content: "", is_correct: false },
  ]);
  const [correctAnswer, setCorrectAnswer] = useState(true);

  const setOptionContent = (index: number, content: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, content } : o)));
  };

  const setCorrectOption = (index: number) => {
    setOptions((prev) => prev.map((o, i) => ({ ...o, is_correct: i === index })));
  };

  const addOption = () => setOptions((prev) => [...prev, { content: "", is_correct: false }]);
  const removeOption = (index: number) => setOptions((prev) => prev.filter((_, i) => i !== index));

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    if (type === "mcq") {
      const cleanOptions = options.filter((o) => o.content.trim());
      if (cleanOptions.length < 2 || !cleanOptions.some((o) => o.is_correct)) return;
      onSubmit({ type: "mcq", prompt: prompt.trim(), order_index: nextOrder, options: cleanOptions });
    } else {
      onSubmit({ type: "true_false", prompt: prompt.trim(), order_index: nextOrder, correct_answer: correctAnswer });
    }
  };

  return (
    <form onSubmit={onFormSubmit} className="flex w-full flex-col gap-3 rounded-lg border border-border p-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="question-type">نوع السؤال</Label>
        <select id="question-type" value={type} onChange={(e) => setType(e.target.value as "mcq" | "true_false")} className={SELECT_CLASS}>
          <option value="mcq">اختيار من متعدد</option>
          <option value="true_false">صح / غلط</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="question-prompt">نص السؤال</Label>
        <Textarea id="question-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} />
      </div>

      {type === "mcq" ? (
        <div className="flex flex-col gap-2">
          <Label>الخيارات (اختر الإجابة الصحيحة)</Label>
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="radio"
                name="mcq-correct"
                checked={option.is_correct}
                onChange={() => setCorrectOption(index)}
                aria-label={`الإجابة ${index + 1} صحيحة`}
              />
              <Input
                value={option.content}
                onChange={(e) => setOptionContent(index, e.target.value)}
                placeholder={`خيار ${index + 1}`}
                className="flex-1"
              />
              {options.length > 2 && (
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeOption(index)} aria-label="حذف الخيار">
                  <X className="size-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addOption} className="w-fit">
            <Plus />
            إضافة خيار
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label>الإجابة الصحيحة</Label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="true-false-correct" checked={correctAnswer} onChange={() => setCorrectAnswer(true)} />
              صح
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="true-false-correct" checked={!correctAnswer} onChange={() => setCorrectAnswer(false)} />
              غلط
            </label>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          إلغاء
        </Button>
        <Button type="submit" disabled={isPending}>
          إضافة السؤال
        </Button>
      </div>
    </form>
  );
}
