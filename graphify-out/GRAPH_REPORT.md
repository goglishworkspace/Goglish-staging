# Graph Report - .  (2026-07-25)

## Corpus Check
- 393 files · ~80,975 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1188 nodes · 3815 edges · 83 communities (59 shown, 24 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 295,949 input · 0 output

## Community Hubs (Navigation)
- Test Suite & Fixtures
- REST API Routes (CRUD & Admin)
- Payments & Billing System
- Authentication & National ID Verification
- Achievements, Reports & Parent Portal
- Content Management Validation Schemas
- Product Spec & Architecture Docs
- Scoring & Gamification Engine
- Comment Moderation & Rate Limiting
- Resource CRUD Routes
- RBAC & Backup Admin
- TypeScript Config
- Exam & Quiz Attempt Runner
- Live Classes
- Video Playback & Watermarking
- Admin Dashboard & Financial Reports
- Dev Tooling Dependencies
- Lesson & Live Class Access
- Core NPM Dependencies
- Question & Challenge Schemas
- Admin User Management
- Pricing & Coupon Engine
- Media Library
- Course & Teacher Assignment
- Content Review Workflow
- Grades Management
- Subjects Management
- Notification Channels
- User Ban Management
- Exams Management
- Lessons Management
- Platform Settings
- Login & Device Fingerprinting
- Question Authoring
- NPM Scripts
- Calendar Events
- Test Harness Setup
- Teacher Suspension
- Announcements
- Parent-Child Linking
- Coupon Update
- Course Bundle Schemas
- Module Schemas
- Quiz Schemas
- Teacher Schemas
- User Soft Delete
- Notification Preferences
- Review Likes
- Teacher Self-Service Profile
- Root App Layout
- Design & RTL Spec
- Arabic Text Reshaping Types
- Package Metadata
- Notification Preference Schema
- SEO Schema
- ESLint Config
- Next Config
- React DOM Dependency
- React Hook Form Dependency
- Server-Only Dependency
- Zod Dependency
- React DOM Types
- PostCSS Config
- Error Pages Spec
- Future Features Spec
- Media Library Spec
- Reviews & Ratings Spec
- Search Spec
- Testing Spec
- Wishlist Spec
- UI Icon Asset (file.svg)
- UI Icon Asset (globe.svg)
- UI Icon Asset (next.svg)
- UI Icon Asset (vercel.svg)
- UI Icon Asset (window.svg)

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 324 edges
2. `apiSuccess` - 321 edges
3. `apiError` - 319 edges
4. `createAdminClient()` - 159 edges
5. `zodErrorsToApiErrors()` - 147 edges
6. `userHasAnyRole()` - 129 edges
7. `createUserRegistry()` - 35 edges
8. `logAudit()` - 31 edges
9. `createLoggedInStudent()` - 31 edges
10. `createTestClient()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `ForgotPasswordPage()` --calls--> `postJson()`  [EXTRACTED]
  app/(auth)/forgot-password/page.tsx → lib/api/client-fetch.ts
- `LoginPage()` --calls--> `postJson()`  [EXTRACTED]
  app/(auth)/login/page.tsx → lib/api/client-fetch.ts
- `RegisterPage()` --calls--> `postJson()`  [EXTRACTED]
  app/(auth)/register/page.tsx → lib/api/client-fetch.ts
- `VerifyEmailPage()` --calls--> `createClient()`  [EXTRACTED]
  app/(auth)/verify-email/page.tsx → lib/supabase/client.ts
- `VerifyPhonePage()` --calls--> `postJson()`  [EXTRACTED]
  app/(auth)/verify-phone/page.tsx → lib/api/client-fetch.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Layered Video Protection (Bunny + Watermark + Interface + Deterrents)** — goglish_prompt_bunny_stream, goglish_prompt_dynamic_watermark, goglish_prompt_video_provider_interface, goglish_prompt_client_side_deterrents [EXTRACTED 0.90]
- **Lesson Comment Moderation Workflow** — goglish_prompt_lesson_comments_system, goglish_prompt_comments_moderation_rules, goglish_prompt_admin_dashboard, goglish_prompt_notification_system, goglish_prompt_security_rate_limiting [EXTRACTED 0.85]
- **Postgres-Only Caching Pattern (no Redis)** — goglish_prompt_leaderboard_caching, goglish_prompt_caching_strategy, goglish_prompt_database [EXTRACTED 0.85]

## Communities (83 total, 24 thin omitted)

### Community 0 - "Test Suite & Fixtures"
Cohesion: 0.07
Nodes (56): GET(), bodySchema, POST(), SECRET_ENV_VAR, GET(), GET(), GET(), sitemap() (+48 more)

### Community 1 - "REST API Routes (CRUD & Admin)"
Cohesion: 0.06
Nodes (59): GET(), VIEW_ROLES, GET(), VIEW_ROLES, GET(), MANAGE_ROLES, PATCH(), DELETE() (+51 more)

### Community 2 - "Payments & Billing System"
Cohesion: 0.06
Nodes (41): POST(), POST(), POST(), POST(), REFUND_ROLES, getPaymentProvider(), isPaymentProviderName(), providers (+33 more)

### Community 3 - "Authentication & National ID Verification"
Cohesion: 0.09
Nodes (38): NATIONAL_ID_ERROR_MESSAGES, POST(), POST(), AuthCard(), Field(), FormMessage(), SubmitButton(), ForgotPasswordPage() (+30 more)

### Community 4 - "Achievements, Reports & Parent Portal"
Cohesion: 0.08
Nodes (33): GET(), VIEW_ROLES, GET(), GET(), GET(), GET(), POST(), GET() (+25 more)

### Community 5 - "Content Management Validation Schemas"
Cohesion: 0.07
Nodes (32): POST(), POST(), POST(), GET(), MANAGE_ROLES, POST(), GET(), POST() (+24 more)

### Community 6 - "Product Spec & Architecture Docs"
Cohesion: 0.06
Nodes (45): Next.js Breaking Changes Warning, CLAUDE.md Project Instructions, Admin Dashboard, Admin Settings, API Standards (Zod validation, JWT, RLS+Edge Function checks), Assessment System (Quiz/Exam/Homework), Authentication (Supabase Auth JWT+Refresh), Bunny Stream (Protected Paid Video) (+37 more)

### Community 7 - "Scoring & Gamification Engine"
Cohesion: 0.08
Nodes (30): GET(), POST(), POST(), GET(), ParentColumn, ResponseTable, scoreAndPersistResponses(), runGamificationHooks() (+22 more)

### Community 8 - "Comment Moderation & Rate Limiting"
Cohesion: 0.08
Nodes (31): POST(), POST(), REVIEW_ROLES, COMMENT_RATE_LIMIT, GET(), POST(), CommentFilterResult, filterCommentContent() (+23 more)

### Community 9 - "Resource CRUD Routes"
Cohesion: 0.09
Nodes (24): GET(), MANAGE_ROLES, POST(), GET(), GET(), MANAGE_ROLES, POST(), DELETE() (+16 more)

### Community 10 - "RBAC & Backup Admin"
Cohesion: 0.10
Nodes (25): MANAGE_ROLES, POST(), GET(), MANAGE_ROLES, POST(), DELETE(), MANAGE_ROLES, POST() (+17 more)

### Community 11 - "TypeScript Config"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, **/*.mts, .next/dev/dev/types/**/*.ts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts (+21 more)

### Community 12 - "Exam & Quiz Attempt Runner"
Cohesion: 0.14
Nodes (17): POST(), POST(), QuestionRenderer(), ResponseValue, ExamRunner(), RunnerState, StartData, SubmitResult (+9 more)

### Community 13 - "Live Classes"
Cohesion: 0.12
Nodes (20): POST(), POST(), POST(), GET(), MANAGE_ROLES, POST(), getUsersWithCourseAccess(), createLiveClass() (+12 more)

### Community 14 - "Video Playback & Watermarking"
Cohesion: 0.13
Nodes (11): LessonPlayer(), VideoDeterrents(), POSITIONS, WatermarkOverlay(), LessonPlaybackResult, BunnyVideoProvider, providers, SignedPlaybackUrl (+3 more)

### Community 15 - "Admin Dashboard & Financial Reports"
Cohesion: 0.12
Nodes (18): GET(), VIEW_ROLES, GET(), VIEW_ROLES, GET(), VIEW_ROLES, GET(), REVIEW_ROLES (+10 more)

### Community 16 - "Dev Tooling Dependencies"
Cohesion: 0.09
Nodes (23): dotenv, eslint, eslint-config-next, devDependencies, dotenv, eslint, eslint-config-next, tailwindcss (+15 more)

### Community 17 - "Lesson & Live Class Access"
Cohesion: 0.17
Nodes (14): GET(), POST(), GET(), POST(), GET(), MANAGE_ROLES, PATCH(), LessonPage() (+6 more)

### Community 18 - "Core NPM Dependencies"
Cohesion: 0.10
Nodes (21): arabic-persian-reshaper, @embedpdf/fonts-arabic, @hookform/resolvers, next, dependencies, arabic-persian-reshaper, @embedpdf/fonts-arabic, @hookform/resolvers (+13 more)

### Community 19 - "Question & Challenge Schemas"
Cohesion: 0.09
Nodes (17): CreateBadgeInput, createBadgeSchema, UpdateBadgeInput, updateBadgeSchema, base, CreateQuestionInput, dragDropSchema, essaySchema (+9 more)

### Community 20 - "Admin User Management"
Cohesion: 0.17
Nodes (14): POST(), MANAGE_ROLES, POST(), MANAGE_ROLES, POST(), DELETE(), MANAGE_ROLES, POST() (+6 more)

### Community 21 - "Pricing & Coupon Engine"
Cohesion: 0.17
Nodes (14): POST(), POST(), calculateOrderPricing(), CouponError, getTaxRatePercent(), isItemAvailable(), ITEM_TABLE, OrderItemType (+6 more)

### Community 22 - "Media Library"
Cohesion: 0.18
Nodes (13): DELETE(), MANAGE_ROLES, PATCH(), GET(), MANAGE_ROLES, POST(), deleteMediaFile(), listMediaFiles() (+5 more)

### Community 23 - "Course & Teacher Assignment"
Cohesion: 0.15
Nodes (12): GET(), MANAGE_ROLES, POST(), GET(), POST(), AssignCourseTeacherInput, assignCourseTeacherSchema, CreateCourseInput (+4 more)

### Community 24 - "Content Review Workflow"
Cohesion: 0.23
Nodes (9): POST(), REVIEW_ROLES, POST(), REVIEW_ROLES, reviewContent(), ReviewDecision, WorkflowTable, ReviewContentInput (+1 more)

### Community 25 - "Grades Management"
Cohesion: 0.16
Nodes (11): DELETE(), MANAGE_ROLES, PATCH(), GET(), MANAGE_ROLES, POST(), CreateGradeInput, createGradeSchema (+3 more)

### Community 26 - "Subjects Management"
Cohesion: 0.16
Nodes (11): DELETE(), MANAGE_ROLES, PATCH(), GET(), MANAGE_ROLES, POST(), CreateSubjectInput, createSubjectSchema (+3 more)

### Community 27 - "Notification Channels"
Cohesion: 0.32
Nodes (6): InAppNotificationChannel, channels, StubNotificationChannel, NotificationChannel, NotificationChannelName, NotificationPayload

### Community 28 - "User Ban Management"
Cohesion: 0.19
Nodes (11): DELETE(), MANAGE_ROLES, POST(), banUser(), unbanUser(), AssignRoleInput, assignRoleSchema, BanUserInput (+3 more)

### Community 29 - "Exams Management"
Cohesion: 0.20
Nodes (9): DELETE(), GET(), PATCH(), GET(), POST(), CreateExamInput, createExamSchema, UpdateExamInput (+1 more)

### Community 30 - "Lessons Management"
Cohesion: 0.20
Nodes (9): DELETE(), GET(), PATCH(), GET(), POST(), CreateLessonInput, createLessonSchema, UpdateLessonInput (+1 more)

### Community 31 - "Platform Settings"
Cohesion: 0.27
Nodes (8): GET(), MANAGE_ROLES, PATCH(), VIEW_ROLES, getSettings(), updateSettings(), UpdateSettingsInput, updateSettingsSchema

### Community 32 - "Login & Device Fingerprinting"
Cohesion: 0.47
Nodes (7): POST(), POST(), computeDeviceFingerprint(), DeviceLimitResult, enforceDeviceLimit(), getOrCreateDeviceId(), touchDevice()

### Community 33 - "Question Authoring"
Cohesion: 0.31
Nodes (7): GET(), POST(), GET(), POST(), AnswerInsert, buildAnswerRows(), createQuestionSchema

### Community 34 - "NPM Scripts"
Cohesion: 0.20
Nodes (10): scripts, build, db:reset, db:start, db:stop, dev, lint, start (+2 more)

### Community 35 - "Calendar Events"
Cohesion: 0.25
Nodes (7): DELETE(), MANAGE_ROLES, PATCH(), CreateCalendarEventInput, createCalendarEventSchema, UpdateCalendarEventInput, updateCalendarEventSchema

### Community 36 - "Test Harness Setup"
Cohesion: 0.39
Nodes (7): globalSetup(), killProcessTree(), killWhatIsListeningOn(), waitForUrl(), PHONE_CODE_LOG_PATH, resetPhoneCodeLog(), waitForPhoneCode()

### Community 37 - "Teacher Suspension"
Cohesion: 0.38
Nodes (6): DELETE(), MANAGE_ROLES, POST(), reactivateTeacher(), suspendTeacher(), TeacherNotFoundError

### Community 38 - "Announcements"
Cohesion: 0.33
Nodes (5): GET(), MANAGE_ROLES, POST(), CreateAnnouncementInput, createAnnouncementSchema

### Community 39 - "Parent-Child Linking"
Cohesion: 0.40
Nodes (4): MANAGE_ROLES, POST(), CreateParentLinkInput, createParentLinkSchema

### Community 40 - "Coupon Update"
Cohesion: 0.40
Nodes (4): DELETE(), MANAGE_ROLES, PATCH(), updateCouponSchema

### Community 41 - "Course Bundle Schemas"
Cohesion: 0.40
Nodes (4): CreateBundleInput, createBundleSchema, UpdateBundleInput, updateBundleSchema

### Community 42 - "Module Schemas"
Cohesion: 0.40
Nodes (4): CreateModuleInput, createModuleSchema, UpdateModuleInput, updateModuleSchema

### Community 43 - "Quiz Schemas"
Cohesion: 0.40
Nodes (4): CreateQuizInput, createQuizSchema, UpdateQuizInput, updateQuizSchema

### Community 44 - "Teacher Schemas"
Cohesion: 0.40
Nodes (4): CreateTeacherInput, createTeacherSchema, UpdateTeacherProfileInput, updateTeacherProfileSchema

### Community 45 - "User Soft Delete"
Cohesion: 0.67
Nodes (3): DELETE(), MANAGE_ROLES, softDeleteUser()

### Community 46 - "Notification Preferences"
Cohesion: 0.50
Nodes (3): CHANNELS, GET(), PATCH()

### Community 47 - "Review Likes"
Cohesion: 0.83
Nodes (3): DELETE(), POST(), toggleReviewLike()

### Community 48 - "Teacher Self-Service Profile"
Cohesion: 0.83
Nodes (3): GET(), getOwnTeacher(), PATCH()

### Community 50 - "Design & RTL Spec"
Cohesion: 0.50
Nodes (4): Design System (colors, typography, spacing), Landing Page, Responsive Design Rules (mobile-first Tailwind), RTL Support Rules (Arabic)

### Community 52 - "Package Metadata"
Cohesion: 0.50
Nodes (3): name, private, version

## Knowledge Gaps
- **283 isolated node(s):** `StartData`, `SubmitResult`, `RunnerState`, `POSITIONS`, `StartData` (+278 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createAdminClient()` connect `Test Suite & Fixtures` to `REST API Routes (CRUD & Admin)`, `Payments & Billing System`, `Authentication & National ID Verification`, `Achievements, Reports & Parent Portal`, `Content Management Validation Schemas`, `Scoring & Gamification Engine`, `Comment Moderation & Rate Limiting`, `Resource CRUD Routes`, `RBAC & Backup Admin`, `Live Classes`, `Admin Dashboard & Financial Reports`, `Lesson & Live Class Access`, `Admin User Management`, `Pricing & Coupon Engine`, `Media Library`, `Notification Channels`, `User Ban Management`, `Platform Settings`, `Teacher Suspension`, `User Soft Delete`?**
  _High betweenness centrality (0.169) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Resource CRUD Routes` to `Test Suite & Fixtures`, `REST API Routes (CRUD & Admin)`, `Payments & Billing System`, `Authentication & National ID Verification`, `Achievements, Reports & Parent Portal`, `Content Management Validation Schemas`, `Scoring & Gamification Engine`, `Comment Moderation & Rate Limiting`, `RBAC & Backup Admin`, `Exam & Quiz Attempt Runner`, `Live Classes`, `Admin Dashboard & Financial Reports`, `Lesson & Live Class Access`, `Admin User Management`, `Pricing & Coupon Engine`, `Media Library`, `Course & Teacher Assignment`, `Content Review Workflow`, `Grades Management`, `Subjects Management`, `User Ban Management`, `Exams Management`, `Lessons Management`, `Platform Settings`, `Login & Device Fingerprinting`, `Question Authoring`, `Calendar Events`, `Teacher Suspension`, `Announcements`, `Parent-Child Linking`, `Coupon Update`, `User Soft Delete`, `Notification Preferences`, `Review Likes`, `Teacher Self-Service Profile`?**
  _High betweenness centrality (0.128) - this node is a cross-community bridge._
- **Why does `apiSuccess` connect `REST API Routes (CRUD & Admin)` to `Test Suite & Fixtures`, `Payments & Billing System`, `Authentication & National ID Verification`, `Achievements, Reports & Parent Portal`, `Content Management Validation Schemas`, `Scoring & Gamification Engine`, `Comment Moderation & Rate Limiting`, `Resource CRUD Routes`, `RBAC & Backup Admin`, `Exam & Quiz Attempt Runner`, `Live Classes`, `Admin Dashboard & Financial Reports`, `Lesson & Live Class Access`, `Admin User Management`, `Pricing & Coupon Engine`, `Media Library`, `Course & Teacher Assignment`, `Content Review Workflow`, `Grades Management`, `Subjects Management`, `User Ban Management`, `Exams Management`, `Lessons Management`, `Platform Settings`, `Login & Device Fingerprinting`, `Question Authoring`, `Calendar Events`, `Teacher Suspension`, `Announcements`, `Parent-Child Linking`, `Coupon Update`, `User Soft Delete`, `Notification Preferences`, `Review Likes`, `Teacher Self-Service Profile`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **What connects `StartData`, `SubmitResult`, `RunnerState` to the rest of the system?**
  _283 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Test Suite & Fixtures` be split into smaller, more focused modules?**
  _Cohesion score 0.07016491754122939 - nodes in this community are weakly interconnected._
- **Should `REST API Routes (CRUD & Admin)` be split into smaller, more focused modules?**
  _Cohesion score 0.05934065934065934 - nodes in this community are weakly interconnected._
- **Should `Payments & Billing System` be split into smaller, more focused modules?**
  _Cohesion score 0.059076682316118935 - nodes in this community are weakly interconnected._