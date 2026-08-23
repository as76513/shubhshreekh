"use client";

import { use } from "react";
import CourseDetail from "@/components/pages/CourseDetail";

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const courseId = Number.parseInt(id, 10) || 1;
  return <CourseDetail courseId={courseId} />;
}
