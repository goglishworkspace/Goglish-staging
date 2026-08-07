"use client";

import { use } from "react";
import { SubjectCourses } from "@/components/marketing/SubjectCourses";

export default function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <SubjectCourses subjectId={id} />;
}
