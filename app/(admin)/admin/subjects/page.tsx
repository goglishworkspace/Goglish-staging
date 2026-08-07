"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useGrades } from "@/lib/api/queries/grades";
import { useSubjects, useCreateSubject, useDeleteSubject, type Subject } from "@/lib/api/queries/subjects";
import { useTeachers, getTeacherProfile } from "@/lib/api/queries/teachers";
import { slugify } from "@/lib/utils";

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

function DeleteSubjectRow({ subject, onDone }: { subject: Subject; onDone: () => void }) {
  const deleteSubject = useDeleteSubject();

  const onConfirmDelete = () => {
    deleteSubject.mutate(subject.id, {
      onSuccess: () => {
        toast.success("تم حذف المادة");
        onDone();
      },
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر حذف المادة")),
    });
  };

  return (
    <TableRow>
      <TableCell colSpan={3}>
        <div className="flex w-full flex-col gap-2 rounded-lg bg-destructive/10 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-small text-foreground">
            متأكد إنك عايز تحذف مادة &quot;{subject.name}&quot;؟ كل الكورسات اللي تحت المادة دي هتتحذف كمان.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onDone}>
              إلغاء
            </Button>
            <Button variant="destructive" disabled={deleteSubject.isPending} onClick={onConfirmDelete}>
              تأكيد الحذف
            </Button>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

function CreateSubjectDialog() {
  const { data: grades } = useGrades();
  const { data: teachers } = useTeachers();
  const createSubject = useCreateSubject();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [teacherId, setTeacherId] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !gradeId) {
      toast.error("اسم المادة والصف الدراسي مطلوبين");
      return;
    }
    createSubject.mutate(
      {
        name: name.trim(),
        grade_id: gradeId,
        slug: slugify(name),
        primary_teacher_id: teacherId || undefined,
      },
      {
        onSuccess: () => {
          toast.success("تم إنشاء المادة");
          setOpen(false);
          setName("");
          setGradeId("");
          setTeacherId("");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر إنشاء المادة")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        إضافة مادة
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة مادة جديدة</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject-name">اسم المادة</Label>
            <Input id="subject-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject-grade">الصف الدراسي</Label>
            <select
              id="subject-grade"
              value={gradeId}
              onChange={(e) => setGradeId(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="">اختر صف</option>
              {grades?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject-teacher">المدرس الأساسي (اختياري)</Label>
            <select
              id="subject-teacher"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              <option value="">بدون تحديد</option>
              {teachers?.map((t) => (
                <option key={t.id} value={t.id}>
                  {getTeacherProfile(t)?.display_name ?? t.id}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createSubject.isPending}>
              إنشاء
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminSubjectsPage() {
  const { data: grades, isLoading: gradesLoading } = useGrades();
  const { data: subjects, isLoading: subjectsLoading } = useSubjects();
  const isLoading = gradesLoading || subjectsLoading;
  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null);

  const gradeName = (gradeId: string) => grades?.find((g) => g.id === gradeId)?.name ?? "-";

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h2 text-secondary dark:text-white">المواد الدراسية</h1>
        <CreateSubjectDialog />
      </div>

      {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}

      {!isLoading && !subjects?.length && (
        <p className="py-8 text-center text-small text-muted-foreground">لسه مفيش مواد دراسية. ابدأ بإضافة أول مادة.</p>
      )}

      {!isLoading && !!subjects?.length && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اسم المادة</TableHead>
              <TableHead>الصف الدراسي</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((subject) =>
              deletingSubjectId === subject.id ? (
                <DeleteSubjectRow key={subject.id} subject={subject} onDone={() => setDeletingSubjectId(null)} />
              ) : (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">{subject.name}</TableCell>
                  <TableCell className="text-muted-foreground">{gradeName(subject.grade_id)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="destructive" onClick={() => setDeletingSubjectId(subject.id)}>
                      حذف
                    </Button>
                  </TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
