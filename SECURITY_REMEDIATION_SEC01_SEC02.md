# Goglish Security Remediation Report: SEC-01 & SEC-02

**Status:** Completed & Verified  
**Date:** September 12, 2026  
**Scope:** Remediation strictly limited to **SEC-01** (Protected Video ID Exposure) and **SEC-02** (Exam/Quiz Answer Key Exposure)  

---

## 1. Executive Summary

This remediation eliminates the two critical data exposure vulnerabilities identified in the Goglish security audit:
- **SEC-01:** Direct PostgREST access to protected video identifiers (`youtube_video_id`, `bunny_video_id`) on the `lessons` table by unauthenticated users and unentitled students.
- **SEC-02:** Direct PostgREST access to correct answer flags (`is_correct`) on the `answers` table by enrolled students taking exams or quizzes.

Both vulnerabilities have been resolved using a **defense-in-depth architecture**:
1. **Database Boundary:** Strict PostgreSQL column-level privilege revocation (`REVOKE SELECT ON table FROM anon, authenticated`) followed by selective `GRANT SELECT (safe_columns) TO anon, authenticated`. The PostgreSQL engine now enforces permission denial (`error 42501`) directly at the database layer against PostgREST queries attempting to request these columns.
2. **Application Authorization Layer:** Authorized access to sensitive fields is mediated through Next.js server-side endpoints (`/api/lessons/[id]/playback`, quiz/exam authoring, and post-submission review) which enforce explicit session verification, course purchase entitlement checks (`hasCourseAccess`), or teacher authoring permissions (`can_manage_question_parent`) before fetching data via an isolated server-only admin client.
3. **Zero Regressions:** All 40 test suites (152 total tests) passed with 100% success rate, TypeScript compilation passed with zero errors, and Next.js Turbopack production build succeeded across all 141 routes.

---

## 2. Threat Model for SEC-01 and SEC-02

### SEC-01: Protected Video ID Exposure
* **Threat Actor:** Any anonymous visitor or logged-in student without an active course entitlement or subscription.
* **Attack Vector:** Sending a HTTP `GET` request directly to the Supabase PostgREST API:
  `GET /rest/v1/lessons?select=id,title,youtube_video_id,bunny_video_id`
  with an anon key or student JWT.
* **Impact:** Direct retrieval of unlisted YouTube video IDs and Bunny Stream video IDs without purchasing the course or passing server-side device and dynamic watermarking protections. Allows unauthorized video downloading, pirating, and hotlinking.

### SEC-02: Exam & Quiz Correct Answer Key Exposure
* **Threat Actor:** Any authenticated student enrolled in a course attempting an exam or quiz.
* **Attack Vector:** Sending a HTTP `GET` request directly to the Supabase PostgREST API:
  `GET /rest/v1/answers?select=id,question_id,is_correct`
  using the student's JWT before or while taking an exam.
* **Impact:** Real-time retrieval of the answer key for all questions, allowing automated or manual cheating with 100% accuracy, rendering assessment validity void.

---

## 3. Exact Root Cause Analysis

### SEC-01 Root Cause
Row-Level Security (RLS) on `public.lessons` only governs **which rows** can be viewed (e.g., `status = 'approved'` or published lessons). In PostgreSQL and PostgREST, RLS does not restrict **which columns** are returned if a table-wide `GRANT SELECT ON lessons TO anon, authenticated;` exists. Because table-wide `SELECT` was granted, any user permitted to read a lesson row could request arbitrary columns on that row via PostgREST query parameters (`?select=youtube_video_id`), bypassing the Next.js `/api/lessons/[id]/playback` authorization pipeline.

### SEC-02 Root Cause
While Next.js route handlers (`/api/exams/[id]/questions` and `/api/quizzes/[id]/questions`) carefully stripped `is_correct` from their JSON responses when queried by students, the Supabase PostgREST interface remained exposed to any bearer of a valid student JWT. Because `public.answers` had `GRANT SELECT ON answers TO authenticated;`, the PostgreSQL RLS policy `can_access_question_parent` permitted students to read answer rows for published exams, granting access to every column including `is_correct`.

---

## 4. Defense-in-Depth Architecture Implemented

```
+-------------------------------------------------------------------------------+
|                             CLIENT / BROWSER                                  |
+-------------------------------------------------------------------------------+
        |                                                       |
        | [1] Direct PostgREST Attack                           | [2] Authorized API Request
        |     (anon or student JWT)                             |     (Cookie Session)
        v                                                       v
+-----------------------------+               +---------------------------------+
|      Supabase PostgREST     |               |       Next.js Server API        |
|                             |               |                                 |
|  Querying:                  |               |  - /api/lessons/[id]/playback   |
|   - lessons.youtube_video_id|               |  - /api/quizzes/[id]/questions  |
|   - answers.is_correct      |               |  - /api/exam-attempts/[id]      |
+-----------------------------+               +---------------------------------+
        |                                                       |
        | Column Privileges Check                               | 1. Authenticate Session
        |                                                       | 2. Check Course Entitlement /
        v                                                       |    Authoring Permission
+-----------------------------+                                 v
|      PostgreSQL Engine      |               +---------------------------------+
|                             |               |   Admin Client (Server-Only)    |
|  ERROR: 42501               |               |                                 |
|  permission denied for      |               |  Retrieves protected fields     |
|  table lessons / answers    |               |  server-side only               |
+-----------------------------+               +---------------------------------+
        |                                                       |
        v                                                       v
   HTTP 401/403                                        Filtered / Watermarked
  ACCESS DENIED                                          Authorized Response
```

1. **Database Layer:** The database itself denies read access to sensitive columns (`youtube_video_id`, `bunny_video_id`, `is_correct`) for all roles except `postgres`, `service_role`, and database superusers.
2. **Application Authorization Layer:** Server endpoints authenticate the user, verify entitlement or role, and only then query the protected columns using the secure `createAdminClient()`.
3. **Payload Sanitization:** No endpoint ever sends raw answer keys to students during active attempts. Watermarking metadata is dynamically computed and combined with video playback parameters server-side.

---

## 5. Database Changes Made

### Migration File
`supabase/migrations/20260912140000_secure_video_ids_and_exam_answers.sql`

```sql
-- 1. SEC-01: Revoke whole-table SELECT and grant only safe public columns on lessons
REVOKE SELECT ON public.lessons FROM anon, authenticated;

GRANT SELECT (
  id,
  module_id,
  title,
  description,
  order_index,
  teacher_id,
  bunny_video_duration_seconds,
  youtube_preview_video_id,
  is_preview,
  status,
  submitted_at,
  rejection_reason,
  created_by,
  reviewed_by,
  reviewed_at,
  deleted_at,
  created_at,
  updated_at,
  deletion_requested_at,
  deletion_requested_by
) ON public.lessons TO anon, authenticated;

-- Preserve write privileges for authenticated staff/teachers
GRANT INSERT, UPDATE, DELETE ON public.lessons TO authenticated;

-- 2. SEC-02: Revoke whole-table SELECT and grant only safe public columns on answers
REVOKE SELECT ON public.answers FROM anon, authenticated;

GRANT SELECT (
  id,
  question_id,
  content,
  order_index,
  side,
  match_group,
  created_at
) ON public.answers TO authenticated;

-- Preserve write privileges for authenticated staff/teachers
GRANT INSERT, UPDATE, DELETE ON public.answers TO authenticated;

-- 3. Notify PostgREST to immediately refresh its schema cache
NOTIFY pgrst, 'reload schema';
```

---

## 6. Application Code Changes Made

### 1. `lib/services/lesson-playback.service.ts`
* **Change:** Removed `youtube_video_id` from the initial lesson metadata query (which runs with the caller's client).
* **Authorization Check:** The function validates whether the lesson is previewable, ensures `userId` exists, checks course access via `hasCourseAccess(supabase, userId, courseId)`.
* **Privileged Fetch:** Only after `hasAccess === true` is confirmed does the service use `createAdminClient()` to query `youtube_video_id` server-side, decrypt the user's national ID, and build the watermarked playback payload.

### 2. `app/api/quizzes/[id]/questions/route.ts` & `app/api/exams/[id]/questions/route.ts`
* **Change:** Separated the authoring view from student view.
* **Authorization Check:** Evaluates `can_manage_question_parent(supabase, quizId/examId)`.
* **Privileged Fetch:** If `canManage` is true, queries questions and answers (including `is_correct`) using `createAdminClient()`. For students (`canManage === false`), queries only safe columns (`id, type, prompt, points, order_index, answers(id, content, side)`) via the caller's authenticated client.

### 3. `app/api/quiz-attempts/[id]/route.ts` & `app/api/exam-attempts/[id]/route.ts`
* **Change:** When attempts are submitted and `solutionsVisible` is true, correct answers are needed to build the wrong-answer summary (`buildCorrectAnswerSummary`) for student feedback.
* **Authorization Check:** Verifies attempt ownership (`attempt.user_id === user.id`) via caller's client and RLS.
* **Privileged Fetch:** Uses `createAdminClient()` server-side solely to compute the feedback summary; raw answer rows and `is_correct` columns are never leaked to the client.

---

## 7. PostgREST Attack Reproduction and Proof of Remediation

Empirical security verification was executed against the live Supabase PostgREST instance (`http://127.0.0.1:54321/rest/v1`).

### SEC-01 Test Matrix

| Persona | Query Target | Method | Expected Result | Actual HTTP Status | Actual DB Error | Status |
|---|---|---|---|---|---|---|
| **Anon** | `lessons?select=id,youtube_video_id` | PostgREST GET | BLOCKED | **401 Unauthorized** | `42501 permission denied for table lessons` | **REMEDIATED** |
| **Student (Unentitled)** | `lessons?select=id,youtube_video_id` | PostgREST GET | BLOCKED | **403 Forbidden** | `42501 permission denied for table lessons` | **REMEDIATED** |
| **Student (Entitled)** | `lessons?select=id,youtube_video_id` | PostgREST GET | BLOCKED | **403 Forbidden** | `42501 permission denied for table lessons` | **REMEDIATED** |
| **Any User** | `lessons?select=id,title,is_preview` | PostgREST GET | ALLOWED | **200 OK** | None (public columns accessible) | **WORKING** |
| **Student (Unentitled)** | `/api/lessons/[id]/playback` | Next.js API | BLOCKED | **403 Forbidden** | `purchase_required` | **VERIFIED** |
| **Student (Entitled)** | `/api/lessons/[id]/playback` | Next.js API | ALLOWED | **200 OK** | Returns watermarked stream token | **VERIFIED** |

### SEC-02 Test Matrix

| Persona | Query Target | Method | Expected Result | Actual HTTP Status | Actual DB Error | Status |
|---|---|---|---|---|---|---|
| **Student** | `answers?select=id,question_id,is_correct` | PostgREST GET | BLOCKED | **403 Forbidden** | `42501 permission denied for table answers` | **REMEDIATED** |
| **Student** | `answers?select=id,content,side` | PostgREST GET | ALLOWED | **200 OK** | None (safe option columns accessible) | **WORKING** |
| **Student** | `/api/quizzes/[id]/questions` | Next.js API | ALLOWED | **200 OK** | `is_correct` not present in payload | **VERIFIED** |
| **Teacher/Admin** | `/api/quizzes/[id]/questions` | Next.js API | ALLOWED | **200 OK** | Full authoring answer key returned | **VERIFIED** |
| **Student** | Active Attempt Review | Next.js API | ALLOWED | **200 OK** | No answer key exposed while attempt active | **VERIFIED** |
| **Student** | Completed Attempt Review | Next.js API | ALLOWED | **200 OK** | Summaries provided for wrong answers | **VERIFIED** |

---

## 8. Entitlement and Access Control Matrix

| Resource & Operation | Anonymous | Unentitled Student | Entitled Student | Teacher (Author) | Admin |
|---|---|---|---|---|---|
| `lessons` public metadata via PostgREST | Allowed | Allowed | Allowed | Allowed | Allowed |
| `lessons.youtube_video_id` via PostgREST | **Denied (42501)** | **Denied (42501)** | **Denied (42501)** | **Denied (42501)** | **Denied (42501)** |
| Lesson Playback via `/api/.../playback` | Denied (401) | Denied (403) | **Allowed (200)** | **Allowed (200)** | **Allowed (200)** |
| `answers` options (`content`, `side`) via PostgREST | Denied | Allowed | Allowed | Allowed | Allowed |
| `answers.is_correct` via PostgREST | **Denied (42501)** | **Denied (42501)** | **Denied (42501)** | **Denied (42501)** | **Denied (42501)** |
| Quiz/Exam Questions via API (Taking) | Denied | Allowed | Allowed | Allowed | Allowed |
| Quiz/Exam Questions via API (Authoring) | Denied | Denied (403) | Denied (403) | **Allowed (200)** | **Allowed (200)** |

---

## 9. Test Coverage Added or Verified

Targeted and regression test suites executed and verified:
1. `tests/lesson-playback.test.ts` (2 tests) - PASSED
2. `tests/question-visibility.test.ts` (2 tests) - PASSED
3. `tests/exam-attempt.test.ts` (5 tests) - PASSED
4. `tests/quiz-attempt.test.ts` (4 tests) - PASSED
5. `tests/course-access.test.ts` (2 tests) - PASSED
6. `tests/scoring.test.ts` (7 tests) - PASSED
7. `scratch/verify_sec01_sec02.cjs` (Empirical PostgREST privilege attacks) - 6/6 PASSED

---

## 10. Verification of Unaffected Functionality

* **Lesson Preview:** Lessons marked with `is_preview: true` or containing `youtube_preview_video_id` remain viewable by anonymous visitors and unenrolled students.
* **Question Rendering:** Taking an exam or quiz renders all questions, prompts, option contents, matching sides, and point values correctly in the UI.
* **Teacher Course & Question Authoring:** Teachers and administrators can view questions with full answer keys, add new answers, toggle `is_correct`, and edit exam configurations without disruption.
* **Scoring Engine:** Student response grading during quiz checks (`/questions/[id]/check`) and exam submissions (`/submit`) uses internal database RPCs / secure server handlers, functioning normally.

---

## 11. Verification that SEC-03 through SEC-14 Were NOT Modified

In strict adherence to the project instructions, no modifications were made to:
* **SEC-03 / SEC-04:** Daffaa, Paymob, or Fawry payment reconciliation, webhooks, or wallet checkout.
* **SEC-05:** Device concurrency limits and session device tracking.
* **SEC-06:** Upstash Redis rate limiting configurations.
* **SEC-07:** Content Security Policy (CSP) headers in Next.js middleware.
* **SEC-08:** Hard-deletion cron endpoints or cron secret headers.
* **SEC-09:** Search query filtering and parameter sanitization.
* **SEC-10 through SEC-14:** Dependency versions in `package.json`, national ID encryption routines, or certificate signed URL expirations.

`git status` confirms modifications are exclusively within the files responsible for SEC-01 and SEC-02.

---

## 12. Zero-Regression Verification

1. **TypeScript Verification:**
   ```bash
   npx tsc --noEmit
   # Result: Exited 0 (zero errors across entire codebase)
   ```
2. **ESLint Verification:**
   ```bash
   npm run lint
   # Result: Exited 0 (zero lint warnings or errors)
   ```
3. **Full Integration Test Suite:**
   ```bash
   npm run test
   # Test Files: 40 passed (40)
   # Tests:      152 passed (152)
   # Duration:   380.90s
   ```
4. **Turbopack Production Build:**
   ```bash
   npm run build
   # Compiled successfully in 5.6s
   # TypeScript checked in 9.5s
   # 141 static and dynamic routes compiled with zero errors
   ```

---

## 13. Deployment / Migration Notes for Production Supabase

When deploying these changes to staging and production Supabase environments:
1. Apply the migration `supabase/migrations/20260912140000_secure_video_ids_and_exam_answers.sql` via Supabase CLI (`supabase db push`) or through the Supabase Dashboard SQL Editor.
2. Execute `NOTIFY pgrst, 'reload schema';` (included in migration) to ensure the PostgREST daemon refreshes its OpenAPI schema cache immediately.
3. Deploy the Next.js application release containing the updated route handlers and playback service.

---

## 14. Residual Risk Assessment

* **Client-Side Video Extraction Risk:**
  With SEC-01 resolved, raw video IDs cannot be scraped from the API or database. Once a student plays an authorized lesson, video streaming occurs via YouTube embedded iframes with dynamic canvas watermarking (student name, phone, encrypted national ID). While client-side DOM inspection can reveal the loaded iframe's current src during playback, dynamic watermarking ensures any recording can be traced directly to the offending user account.
* **Answer Key Risk:**
  With SEC-02 resolved, correct answers cannot be obtained prior to completion. For wrong answers, minimal textual summaries are provided after submission to facilitate learning without disclosing internal database structure.

---

## 15. Sign-Off

```text
SEC-01: FIXED
SEC-02: FIXED
```
