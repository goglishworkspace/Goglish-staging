"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  useCalendarEvents,
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  type CalendarEventType,
} from "@/lib/api/queries/admin-calendar";

function apiErrorMessage(err: unknown, fallback: string) {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

const EVENT_TYPE_LABEL: Record<CalendarEventType, string> = {
  lesson_release: "نشر درس",
  quiz: "اختبار",
  exam: "امتحان",
  announcement: "إعلان",
};

function CreateEventDialog() {
  const createEvent = useCreateCalendarEvent();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<CalendarEventType>("announcement");
  const [scheduledAt, setScheduledAt] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) {
      toast.error("العنوان والتاريخ مطلوبين");
      return;
    }
    createEvent.mutate(
      { title: title.trim(), event_type: eventType, scheduled_at: new Date(scheduledAt).toISOString() },
      {
        onSuccess: () => {
          toast.success("تم إنشاء الحدث");
          setOpen(false);
          setTitle("");
          setScheduledAt("");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "تعذر إنشاء الحدث")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        حدث جديد
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة حدث للتقويم</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-title">العنوان</Label>
            <Input id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-type">النوع</Label>
            <Select value={eventType} onValueChange={(value) => setEventType(value as CalendarEventType)}>
              <SelectTrigger id="event-type">
                <SelectValue>{(value: CalendarEventType) => EVENT_TYPE_LABEL[value]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_TYPE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-date">التاريخ والوقت</Label>
            <Input id="event-date" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createEvent.isPending}>
              إضافة
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminCalendarPage() {
  const { data: events, isLoading } = useCalendarEvents();
  const deleteEvent = useDeleteCalendarEvent();

  const onDelete = (id: string) => {
    deleteEvent.mutate(id, {
      onSuccess: () => toast.success("تم حذف الحدث"),
      onError: (err) => toast.error(apiErrorMessage(err, "تعذر حذف الحدث")),
    });
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h2 text-secondary dark:text-white">التقويم الدراسي</h1>
        <CreateEventDialog />
      </div>

      {isLoading && (
        <div className="flex w-full flex-col gap-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      )}

      {!isLoading && !events?.length && <p className="py-8 text-center text-small text-muted-foreground">مفيش أحداث في التقويم.</p>}

      {!isLoading && !!events?.length && (
        <div className="flex w-full flex-col gap-3">
          {events.map((event) => (
            <Card key={event.id} className="w-full">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{EVENT_TYPE_LABEL[event.event_type]}</Badge>
                  <div>
                    <p className="font-medium text-foreground">{event.title}</p>
                    <p className="text-caption text-muted-foreground">
                      {new Date(event.scheduled_at).toLocaleString("ar-EG")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={deleteEvent.isPending}
                  onClick={() => onDelete(event.id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="حذف الحدث"
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
