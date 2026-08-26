import { describe, it, expect, afterAll } from "vitest";
import { createUserRegistry } from "./cleanup";
import { createLoggedInStudent, createPublishedLesson } from "./phase2-fixtures";

describe("Wishlist / favorites / recently viewed", () => {
  const registry = createUserRegistry();
  afterAll(() => registry.cleanupAll());

  it("adds and removes a course from the wishlist, scoped per user", async () => {
    const { admin, teacher, courseId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const studentA = await createLoggedInStudent();
    const studentB = await createLoggedInStudent();
    registry.track(studentA.userId);
    registry.track(studentB.userId);

    const add = await studentA.client.post("/api/wishlist/courses", { course_id: courseId });
    expect(add.status).toBe(201);

    const listA = await studentA.client.get<Array<{ course_id: string }>>("/api/wishlist/courses");
    expect(listA.json?.data?.some((row) => row.course_id === courseId)).toBe(true);

    const listB = await studentB.client.get<Array<{ course_id: string }>>("/api/wishlist/courses");
    expect(listB.json?.data?.some((row) => row.course_id === courseId)).toBe(false);

    const remove = await studentA.client.delete(`/api/wishlist/courses?course_id=${courseId}`);
    expect(remove.status).toBe(200);

    const listAfter = await studentA.client.get<Array<{ course_id: string }>>("/api/wishlist/courses");
    expect(listAfter.json?.data?.some((row) => row.course_id === courseId)).toBe(false);
  });

  it("favorites a teacher and records a recently-viewed course", async () => {
    const { admin, teacher, courseId } = await createPublishedLesson();
    registry.track(admin.userId);
    registry.track(teacher.userId);

    const student = await createLoggedInStudent();
    registry.track(student.userId);

    const favTeacher = await student.client.post("/api/wishlist/teachers", {
      teacher_id: teacher.teacherId,
    });
    expect(favTeacher.status).toBe(201);

    const favList = await student.client.get<Array<{ teacher_id: string }>>("/api/wishlist/teachers");
    expect(favList.json?.data?.some((row) => row.teacher_id === teacher.teacherId)).toBe(true);

    const viewed = await student.client.post("/api/recently-viewed", { course_id: courseId });
    expect(viewed.status).toBe(200);

    const recentList = await student.client.get<Array<{ course_id: string }>>("/api/recently-viewed");
    expect(recentList.json?.data?.some((row) => row.course_id === courseId)).toBe(true);
  });
});
