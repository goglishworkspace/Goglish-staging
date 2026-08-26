"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  useAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  type AnnouncementGrade,
  type AnnouncementTarget,
} from "@/lib/api/queries/admin-announcements";

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

const GRADE_LABEL: Record<AnnouncementGrade, string> = {
  grade1: "أولى ثانوي",
  grade2: "ثانية ثانوي",
  grade3: "ثالثة ثانوي",
};

const TARGET_LABEL: Record<AnnouncementTarget, string> = {
  all: "كل الطلاب",
  grade: "صف دراسي معين",
};

function CreateAnnouncementDialog() {
  const createAnnouncement = useCreateAnnouncement();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState<AnnouncementTarget>("all");
  const [targetGrade, setTargetGrade] = useState<AnnouncementGrade>("grade1");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("العنوان والمحتوى مطلوبين");
      return;
    }
    createAnnouncement.mutate(
      {
        title: title.trim(),
        body: body.trim(),
        target,
        ...(target === "grade" ? { target_grade: targetGrade } : {}),
      },
      {
        onSuccess: () => {
          toast.success("تم إرسال الإعلان للطلاب");
          setOpen(false);
          setTitle("");
          setBody("");
          setTarget("all");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر إرسال الإعلان")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        إعلان جديد
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إرسال إعلان للطلاب</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="announcement-title">العنوان</Label>
            <Input id="announcement-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="announcement-body">المحتوى</Label>
            <Textarea id="announcement-body" value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="announcement-target">المستهدفون</Label>
            <Select value={target} onValueChange={(value) => setTarget(value as AnnouncementTarget)}>
              <SelectTrigger id="announcement-target">
                <SelectValue>{(value: AnnouncementTarget) => TARGET_LABEL[value]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{TARGET_LABEL.all}</SelectItem>
                <SelectItem value="grade">{TARGET_LABEL.grade}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {target === "grade" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="announcement-grade">الصف</Label>
              <Select value={targetGrade} onValueChange={(value) => setTargetGrade(value as AnnouncementGrade)}>
                <SelectTrigger id="announcement-grade">
                  <SelectValue>{(value: AnnouncementGrade) => GRADE_LABEL[value]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GRADE_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={createAnnouncement.isPending}>
              إرسال
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminAnnouncementsPage() {
  const { data: announcements, isLoading } = useAnnouncements();
  const deleteAnnouncement = useDeleteAnnouncement();

  const onDelete = (id: string) => {
    deleteAnnouncement.mutate(id, {
      onSuccess: () => toast.success("تم حذف الإعلان"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر حذف الإعلان")),
    });
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h2 text-secondary dark:text-white">الإعلانات</h1>
        <CreateAnnouncementDialog />
      </div>

      {isLoading && (
        <div className="flex w-full flex-col gap-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      )}

      {!isLoading && !announcements?.length && (
        <p className="py-8 text-center text-small text-muted-foreground">مفيش إعلانات لسه.</p>
      )}

      {!isLoading && !!announcements?.length && (
        <div className="flex w-full flex-col gap-3">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="w-full">
              <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {announcement.target === "all" ? "كل الطلاب" : GRADE_LABEL[announcement.target_grade!]}
                    </Badge>
                    <p className="font-medium text-foreground">{announcement.title}</p>
                  </div>
                  <p className="text-small text-muted-foreground">{announcement.body}</p>
                  <p className="text-caption text-muted-foreground">
                    {new Date(announcement.created_at).toLocaleString("ar-EG")}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={deleteAnnouncement.isPending}
                  onClick={() => onDelete(announcement.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="حذف الإعلان"
                >
                  <Trash2 className="size-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
