"use client";

import { useState } from "react";
import {
  StickyNote,
  MessageCircle,
  FileText,
  Info,
  FileQuestion,
  Sparkles,
} from "lucide-react";
import { NotesPanel } from "./NotesPanel";
import { CommentsSection } from "./CommentsSection";
import { ResourcesPanel } from "./ResourcesPanel";
import { QuizSection } from "./QuizSection";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type TabKey = "notes" | "comments" | "resources" | "overview" | "quiz";

interface LessonTabsProps {
  lessonId: string;
  hasAccess: boolean;
  isLoggedIn: boolean;
  description: string | null;
  focusCommentId?: string;
  hasQuiz?: boolean;
}

export function LessonTabs({
  lessonId,
  hasAccess,
  isLoggedIn,
  description,
  focusCommentId,
  hasQuiz = true,
}: LessonTabsProps) {
  // If user arrived to view a specific comment from notification, default to comments tab
  const [activeTab, setActiveTab] = useState<TabKey>(focusCommentId ? "comments" : "notes");

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Royal Tab Navigation Pills */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-card/75 p-1.5 backdrop-blur-xl shadow-sm">
        {/* Notes Tab (Active Recall & Smart Study Notes) */}
        {isLoggedIn && (
          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all duration-200",
              activeTab === "notes"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
          >
            <StickyNote className="size-4" />
            <span>الملاحظات الذكية</span>
            <span className="hidden sm:inline rounded-full bg-black/15 px-1.5 py-0.2 text-[10px]">
              مفكرتي
            </span>
          </button>
        )}

        {/* Comments / Q&A Tab */}
        <button
          type="button"
          onClick={() => setActiveTab("comments")}
          className={cn(
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all duration-200",
            activeTab === "comments"
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
          )}
        >
          <MessageCircle className="size-4" />
          <span>الأسئلة والمناقشة</span>
        </button>

        {/* Resources / Attachments Tab */}
        {hasAccess && (
          <button
            type="button"
            onClick={() => setActiveTab("resources")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all duration-200",
              activeTab === "resources"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
          >
            <FileText className="size-4" />
            <span>ملفات وملخصات الدرس</span>
          </button>
        )}

        {/* Lesson Quiz Tab if available */}
        {hasAccess && hasQuiz && (
          <button
            type="button"
            onClick={() => setActiveTab("quiz")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all duration-200",
              activeTab === "quiz"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
          >
            <FileQuestion className="size-4 text-amber-500" />
            <span>اختبار الدرس</span>
          </button>
        )}

        {/* Overview Tab */}
        {description && (
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all duration-200",
              activeTab === "overview"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
            )}
          >
            <Info className="size-4" />
            <span>عن الدرس</span>
          </button>
        )}
      </div>

      {/* Tab Content Panel */}
      <Card className="rounded-3xl border border-border/70 bg-card/85 p-5 sm:p-7 backdrop-blur-xl shadow-xl">
        <CardContent className="p-0">
          {activeTab === "notes" && isLoggedIn && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
              <NotesPanel lessonId={lessonId} />
            </div>
          )}

          {activeTab === "comments" && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-5 text-primary" />
                  <h3 className="text-base font-bold text-foreground">
                    قسم الأسئلة والاستفسارات
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  شارك أسئلتك مع المعلم وزملائك الطلاب
                </span>
              </div>
              {isLoggedIn ? (
                <CommentsSection lessonId={lessonId} focusCommentId={focusCommentId} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  يجب تسجيل الدخول أولاً لتتمكن من طرح أسئلتك ومتابعة ردود المعلم.
                </p>
              )}
            </div>
          )}

          {activeTab === "resources" && hasAccess && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="size-5 text-primary" />
                  <h3 className="text-base font-bold text-foreground">
                    الملفات والمذكرات المرفقة
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  ملخصات ونماذج تمارين قابلة للتحميل
                </span>
              </div>
              <ResourcesPanel lessonId={lessonId} />
            </div>
          )}

          {activeTab === "quiz" && hasAccess && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <FileQuestion className="size-5 text-amber-500" />
                  <h3 className="text-base font-bold text-foreground">
                    اختبارات وتقييمات الدرس
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  قياس مدى فهمك واستيعابك لنقاط الدرس
                </span>
              </div>
              <QuizSection lessonId={lessonId} />
            </div>
          )}

          {activeTab === "overview" && description && (
            <div className="flex flex-col gap-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 border-b border-border/50 pb-3">
                <Sparkles className="size-5 text-primary" />
                <h3 className="text-base font-bold text-foreground">وصف ومحاور الدرس</h3>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
