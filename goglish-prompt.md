# GOGLISH PLATFORM — MASTER PROMPT
# النسخة النهائية المحسّنة — احتفظ بهذا الملف دائماً
# (نسخة 3.0 — Next.js + Supabase)

---

## كيفية استخدام هذا الملف
عند بدء أي محادثة جديدة مع Claude Code، ابدأ بـ:
"اقرأ هذا البرومت كاملاً ثم نفّذ [Phase X]"

---

## 0. ملخص سريع للـ Stack (اقرأه أولاً دايماً)

- **Frontend + Backend:** Next.js (App Router) + TypeScript — لغة واحدة بس، بدون Laravel/PHP.
- **Database + Auth + Storage:** Supabase (خطة **Free** حالياً) — Postgres + Supabase Auth + Supabase Storage + Edge Functions + Row Level Security (RLS).
- **الفيديو:**
  - **Bunny Stream** = المحتوى المدفوع/المحمي (الدروس، الامتحانات المسجلة، الحصص المسجلة) — Signed URLs + Token Auth.
  - **YouTube (Unlisted)** = المعاينات/التريلرات المجانية فقط. ممنوع أي محتوى مدفوع يتحط عليه.
- **الشات الجماعي (General/Subject Community Chat): اتشال نهائياً من المشروع.** بدل منه: نظام **تعليقات على كل درس** يخضع لمراجعة الأدمن قبل الظهور (تفاصيله في Section 11).
- **Caching / Leaderboard:** بدون Redis — عبر Postgres Materialized Views / جداول Cache تتحدّث بـ Supabase Scheduled Edge Functions (pg_cron).
- **لا يوجد:** Docker, Nginx, Supervisor, PHP, Sanctum, Redis كسيرفر منفصل. Deployment على Vercel (أو مشابه) + Supabase Cloud.

---

## 1. Project Overview

**اسم المشروع:** Goglish

**وصف المشروع:** منصة تعليمية لطلاب الثانوية العامة (الصف الأول والثاني والثالث الثانوي)، مع خطط مستقبلية للتوسع لمراحل أصغر.

**الهدف:** مساعدة الطلاب في استبدال الدروس الخصوصية بمنصتنا التفاعلية.

**الفئة المستهدفة:** الطلبة من سن 14 إلى 18 سنة.

**الرؤية المستقبلية:** أول منصة تعليمية تفاعلية متكاملة في مصر.

**المنصات:** Web + Mobile App (مستقبلاً).

**النوع:** منصة خاصة (ليست SaaS).

---

## 2. Core Principles

**1. Simplicity First**
المنصة يجب أن تكون سهلة الاستخدام لجميع مستويات الطلاب. كل إجراء مهم يجب أن يتطلب أقل عدد من الخطوات.

**2. Interactive Learning**
تشجيع الطلاب على المشاركة الفعّالة عبر الاختبارات والتحديات والترتيب والإنجازات والتعليقات على الدروس والحصص المباشرة.

**3. Scalability**
النظام مصمم لدعم مراحل دراسية إضافية ومدرسين ومواد وكورسات وتطبيقات موبايل مستقبلاً بدون تغييرات معمارية كبيرة.

---

## 3. Business Requirements

**المشاكل التي تحلها المنصة:**
- الدروس الخصوصية المكلفة
- الازدحام والمواصلات
- صعوبة الحصول على معلومات

**طرق الدفع:** أونلاين فقط (Instapay, Vodafone Cash, Visa, Mastercard, Paymob, Kasher, Stripe)

**نظام الكورسات:**
- كورسات فردية
- باقات (Bundles)
- اشتراك بريميم يشمل متابعة ولي الأمر

**نظام الاشتراكات:**
- شهري
- ترم
- سنوي
- Premium (يشمل متابعة ولي الأمر)
- Family
- Bundle

**سياسة الوصول للكورسات:**
- الكورسات المشتراة متاحة للأبد بعد الشراء
- الاشتراكات الشهرية تؤثر فقط على المحتوى الجديد والخدمات البريميم
- يُزال وصول الطالب فقط إذا: حُذف الكورس، أو أزالته المنصة، أو لأسباب قانونية

**سياسة الاسترجاع:** مسموح بالاسترجاع وفق الشروط

**نظام الكوبونات:**
- خصم بمبلغ
- كورس مجاني
- Bundle مجاني
- عدد مرات الاستخدام
- تاريخ انتهاء
- حد أدنى للشراء (كورس واحد)

---

## 4. User Roles

| الدور | الصلاحيات |
|---|---|
| **Visitor** | يشوف Preview فقط (فيديو YouTube Unlisted)، وصف الكورس، المدرسين، المواد، التقييمات، عدد الطلاب. لا يشاهد فيديوهات الدروس المحمية |
| **Student** | يشتري كورسات، يعلّق على الدروس (الكومنت لا يظهر إلا بعد موافقة الأدمن)، ممنوع تداول أرقام أو إيميلات أو روابط في الكومنتات |
| **Parent** | يتابع ملف ابنه فقط، لا يملك أي تفاعل اجتماعي على المنصة |
| **Teacher** | يشوف محتواه كاملاً، لا يقدر يحمل منه، يشوف عدد الطلاب المشتركين |
| **Moderator** | صلاحيات Admin كاملة ماعدا حذف أو إيقاف المنصة، ويشمل مراجعة/الموافقة على التعليقات |
| **Support** | وصول لكل شيء |
| **Content Manager** | يضيف ويحذف محتوى فقط، لا يصل لملفات شخصية |
| **Accountant** | يشوف فقط: Payments, Revenue, Refunds, Invoices, Taxes, Financial Reports, Coupons, Subscription Reports. لا يعدّل بيانات مستخدمين |
| **Admin** | كل الصلاحيات بما فيها الموافقة/الرفض على التعليقات |
| **Super Admin** | كل الصلاحيات |

---

## 5. Authentication

**التنفيذ:** Supabase Auth (JWT + Refresh Tokens) كقاعدة، مع جداول وحقول مخصصة إضافية (roles, permissions, devices, national_id) في Postgres وربطها بـ `auth.users` عبر `user_id`.

### Register
- الحقول الإجبارية: الاسم الأول، الاسم الأخير، الإيميل، الرقم القومي، الباسورد، تأكيد الباسورد
- الحقول الاختيارية: رقم التليفون
- التحقق من الرقم القومي:
  - 14 رقم بالضبط، أرقام فقط
  - يُستخرج منه تاريخ الميلاد للتحقق من العمر (14-18 سنة)
  - يُخزَّن مشفراً بـ AES-256 — التنفيذ عبر `pgcrypto` extension في Postgres أو تشفير على مستوى الـ Edge Function قبل الكتابة في الداتابيز
  - لا يظهر في أي API Response
  - لا يُستخدم كـ ID عام داخل النظام
  - يُستخدم نسخة masked منه فقط (4 أرقام + **** + 4 أرقام) في الـ Watermark

### Login
- إيميل + باسورد (عبر Supabase Auth)

### Logout
- يُلغى الـ Token الحالي (Supabase session invalidation)
- يُحدَّث سجل الأجهزة

### Forgot Password
- التأكيد عبر الإيميل (Supabase Auth email flow)

### Reset Password
- رابط يُرسَل للإيميل
- صفحة تغيير الباسورد (باسورد جديد + تأكيد)

### Email Verification
- كود يُرسَل على الإيميل (Supabase Auth email verification)
- الطالب لا يقدر يسجل دخول قبل التحقق

### Phone Verification
- لو الرقم عليه واتساب: رسالة واتساب (عبر مزوّد خارجي يُستدعى من Edge Function)
- لو لا: SMS

### Device Management
**السياسة:**
- الحد الأقصى: جهازان نشطان في نفس الوقت
- تحديد الجهاز بـ: User-Agent + Browser Fingerprint + IP (جدول `devices` مخصص، مش feature جاهزة من Supabase)
- عند محاولة الدخول من جهاز ثالث: رفض الدخول مع رسالة "لقد وصلت للحد الأقصى من الأجهزة"
- الطالب يشوف أجهزته من صفحة الـ Profile ويقدر يزيل جهاز
- الأدمن يقدر يعمل Reset للأجهزة من الداشبورد
- لا يشوف الأجهزة إلا الطالب صاحبها والأدمن (تُفرض عبر RLS Policy)

---

## 6. Course Structure

```
Grade
 └── Subject
      └── Course
           ├── Module
           │    └── Lesson
           │         ├── Video (Bunny Stream)
           │         ├── Resources
           │         ├── Quiz
           │         ├── Homework
           │         └── Comments (بموافقة الأدمن)
           └── Exam
```

### Grade System
- المراحل: أولى ثانوي / ثانية ثانوي / ثالثة ثانوي
- كل طالب يمتلك Grade واحد فقط
- يقدر يغيره من الملف الشخصي
- عند التغيير: رسالة تحذير "جميع الاقتراحات والكورسات ستتغير"

### Subject System
- مثال: رياضيات، لغة عربية، لغة إنجليزية، فيزياء، كيمياء، أحياء
- يُضاف من Admin Dashboard
- كل مادة لها مدرس رئيسي واحد (مع إمكانية فريق مدرسين)

### Teacher Rules
- كل مدرس يقدر ينشئ: عدد لا نهائي من الكورسات والوحدات والدروس
- لا يقدر يحذف طالب
- لا يقدر يرى بيانات الدفع

**Teacher Content Workflow (مهم):**
```
المدرس يرفع المحتوى → Status: DRAFT
         ↓
Admin / Content Manager يراجع
         ↓
موافق → PUBLISHED (يظهر للطلاب)
رفض   → REJECTED (مع سبب يُرسَل للمدرس)
```

### Teacher Collaboration
- الكورس يمكن تدريسه بواسطة مدرس واحد أو فريق مدرسين
- كل مدرس يُسنَد له دروس أو وحدات معينة
- الطالب يشتري الكورس مرة واحدة بغض النظر عن عدد المدرسين

---

## 7. Video System

### مزوّدو الفيديو
- **Bunny Stream** — لكل المحتوى المدفوع/المحمي (دروس، امتحانات مسجلة، حصص مسجلة). هو مصدر الحماية الحقيقي.
- **YouTube (Unlisted)** — للمعاينات/التريلرات المجانية فقط. ممنوع منعاً باتاً رفع أي درس مدفوع عليه، لأنه بلا Signed URLs ولا Session Expiry ولا Watermark ديناميكي.

### الحماية الحقيقية (الأساس)
- Streaming فقط عبر HLS (لا تحميل ملف واحد مباشر)
- **Signed URLs / Token Authentication من Bunny** — تنتهي بعد 15 دقيقة، تتجدد تلقائياً مع الجلسة النشطة، تُلغى فوراً عند الـ Logout
- **Domain/Referrer Restriction من Bunny** — تشغيل الفيديو مسموح فقط من دومين المنصة، حتى لو اتسرب الرابط
- **Dynamic Watermark Overlay** — طبقة منفصلة (HTML/CSS/Canvas) فوق الـ Video Player، تعرض: أول 4 أرقام + **** + آخر 4 أرقام من الرقم القومي + لوجو المنصة، وتتغيّر موضعها كل 30 ثانية في زوايا عشوائية. (ملحوظة: الـ Watermark overlay منفصل عن ملف الفيديو نفسه، مش burned-in وقت الترميز، وده الأسلوب العملي المستخدم في أغلب منصات التعليم)
- Session Token + Token Expiration مربوطة بجلسة الطالب
- Progress Tracking + Resume (متابعة من حيث توقفت) + Playback Speed + Quality Selection + Captions + Notes + Bookmarks

### طبقة الحماية الإضافية (Deterrents — رادع وليس حماية حقيقية)
هذه الإجراءات بتتنفذ على مستوى الـ Frontend وهدفها تصعيب النسخ على المستخدم العادي، لكنها **مش بديل عن الحماية الحقيقية أعلاه** — أي مستخدم متمرّس يقدر يتخطاها (تسجيل الشاشة مثلاً بيفوّتها تماماً):
- تعطيل الكليك اليمين (Right Click) داخل صفحات مشاهدة الفيديو
- منع فتح Developer Tools بقدر الإمكان (رصد فتح `F12` / `Ctrl+Shift+I` / `Ctrl+U` وعمل redirect أو blur للمحتوى)
- رصد تغيّر أبعاد النافذة اللي بيدل على فتح الـ DevTools (`devtools-detect`) وإيقاف تشغيل الفيديو تلقائياً لو اتفتح
- منع تحديد النص (`user-select: none`) وسحب الصور داخل صفحة الدرس
- تعطيل اختصارات لقطة الشاشة الأساسية على مستوى المتصفح (بقدر الإمكان فقط — لا يوجد حل يمنعها 100% من المتصفح)

**Video Storage Abstraction:**
الكود يُبنى خلف Interface واحد (`VideoProvider`) بحيث يدعم حالياً Bunny Stream + YouTube، ويسهل إضافة مزوّد تاني مستقبلاً (Cloudflare Stream, S3) بدون تغيير Application Logic.

---

## 8. Assessment System

### Quiz
- أنواع الأسئلة: MCQ, True/False, Matching, Essay, Ordering, Fill Blank, Drag & Drop
- المحاولات: قابلة للضبط لكل Quiz (من 1 إلى غير محدود)
- Timer: اختياري، يبدأ عند فتح الـ Quiz
- Auto Submit عند انتهاء الوقت
- أسئلة عشوائية + إجابات عشوائية
- Passing Score قابل للضبط
- لا درجات سالبة
- عرض النتيجة فوراً
- XP يُمنح تلقائياً (عبر Supabase Edge Function بعد التسليم)

### Exam
- محاولة واحدة فقط (غير قابلة للتغيير، لا استثناءات)
- الطالب يقدر يرجع للسؤال السابق
- Timer اختياري (يُضبَط عند الإنشاء)
- Auto Submit عند انتهاء الوقت
- يبدأ الوقت عند فتح الامتحان
- لا يخرج ويرجع (الامتحان يُعتبر مُسلَّم)
- لا درجات سالبة
- أسئلة عشوائية
- عرض الحل بعد موعد محدد فقط
- Certificates عند الاجتياز

### Homework
- ليس واجباً تقليدياً
- تدريب صغير أو اختبار قصير بعد الدرس مباشرة

---

## 9. Payment System

### طرق الدفع
Instapay, Vodafone Cash, Visa, Mastercard, Paymob, Kasher, Stripe

### Payment State Machine (مهم)
```
PENDING → PROCESSING → COMPLETED
                     → FAILED → RETRYING (3 مرات، exponential backoff)
                                        → COMPLETED
                                        → CANCELLED
```

### قواعد
- Idempotency Key مطلوب لكل طلب دفع
- Webhook Handler عبر Supabase Edge Function + Retry Logic (3 محاولات مع exponential backoff)
- لو فشل الـ Webhook: **Scheduled Edge Function (pg_cron)** تشتغل كل ساعة للمطابقة (Reconciliation)
- عند نجاح الدفع: الكورس يظهر فوراً + فاتورة تُولَّد + إشعار يُرسَل + ولي الأمر يُخطَر (إن كان Premium)
- Refund: يُعالَج من الأدمن
- Taxes: محسوبة ومُدرجة في الفاتورة

---

## 10. Gamification

- XP (نقاط خبرة)
- Coins
- Levels
- Badges
- Daily Streak
- Weekly Challenge
- Achievements
- Certificates

### Leaderboards (لوحتان مستقلتان)
1. **Subject Leaderboard:** ترتيب الطلاب داخل كل مادة على حدة
2. **Global Leaderboard:** ترتيب جميع الطلاب على المنصة بإجمالي XP والإنجازات

**التنفيذ:** بدون Redis — جدول Cache (`leaderboard_cache`) في Postgres يتحدّث كل 5 دقائق عبر Supabase Scheduled Edge Function، والقراءة تكون من الجدول المُخزَّن مباشرة (مش Live Query كل مرة).

---

## 11. Lesson Comments System (بدل الشات الجماعي)

**⚠️ لا يوجد شات جماعي على المنصة (لا General Community ولا Subject Community).** بدل منه نظام تعليقات لكل درس، كل تعليق يخضع لمراجعة قبل ما يظهر.

### آلية العمل
```
الطالب يكتب تعليق تحت الدرس → Status: PENDING
         ↓
Auto-Filter أولي (نفس فلتر الكلمات الممنوعة تحت)
         ↓
   رفض تلقائي فوري            تمرير للمراجعة اليدوية
   (لو فيه رقم/إيميل/رابط/سب)         ↓
                              Admin / Moderator يراجع
                                       ↓
                        موافق → APPROVED (يظهر تحت الدرس للجميع)
                        رفض   → REJECTED (يختفي، ممكن سبب اختياري يوصل للطالب)
```

### قواعد التعليقات
- التعليق مربوط بدرس واحد فقط (Lesson-scoped)، مفيش تعليق عام على مستوى المنصة
- الطالب يقدر يشوف حالة تعليقه الخاص بيه بس (Pending / Approved / Rejected) — التعليقات المعلّقة أو المرفوضة لا تظهر لباقي الطلاب أبداً
- مسموح بالردود (Replies) على تعليق موافَق عليه، وكل رد بيخضع لنفس مسار المراجعة
- الطالب يقدر يحذف تعليقه الخاص في أي وقت (حتى لو Approved)
- أي شخص يقدر يبلّغ (Report) عن تعليق ظاهر
- الأدمن/الموديريتور يقدروا يحذفوا أي تعليق حتى لو كان Approved من قبل
- المدرس يظهر بشارة "مدرس موثّق" لو علّق (تعليقات المدرس تمر بنفس المراجعة، لكن الأولوية أعلى في قائمة المراجعة)

### Auto-Filter (نفس القواعد القديمة، بس مطبّقة على التعليقات دلوقت)
عند اكتشاف رقم تليفون، إيميل، رابط، أو كلمات بذيئة داخل التعليق:
```
التحذير الأول  → التعليق يُرفض تلقائياً + إشعار تحذير أصفر للطالب
التحذير الثاني → إيقاف الطالب عن كتابة تعليقات جديدة لمدة 24 ساعة
التحذير الثالث → حظر دائم من كتابة التعليقات (يقدر يقرأ بس)
```
- حظر التعليقات ≠ حظر المنصة (إجراءان منفصلان)
- الأدمن يقدر يعمل Ban يدوي من كتابة التعليقات من خارج نظام التحذيرات

### مرفقات
تعليقات نصية فقط في المرحلة الحالية (بدون صور/ملفات/رسائل صوتية).

---

## 12. Notification System

- Email
- SMS
- Push (Web)
- In-App
- WhatsApp

يُرسَل تنبيه للطالب أيضاً عند: الموافقة على تعليقه أو رفضه.

---

## 13. Parent Portal

### ما يشوفه ولي الأمر (خاص بابنه فقط)
- نسبة إنهاء الكورس
- مدة المشاهدة
- الدرجات
- الواجبات
- الحضور/الغياب
- آخر دخول
- ترتيب الابن
- التنبيهات
- الاشتراك الحالي
- الامتحانات القادمة
- الحصص المباشرة القادمة
- نتائج الـ Quiz

### ما لا يملكه ولي الأمر
- لا تعليقات ولا أي تفاعل اجتماعي على المنصة
- لا وصول لبيانات أي طالب آخر

---

## 14. Live Classes

### Workflow
```
Admin ينشئ الجلسة
 → يختار المدرس والمادة والتاريخ والوقت
 → يُرسَل إشعار للطلاب
 → الطلاب ينضمون
 → يُسجَّل الحضور تلقائياً
 → يُسجَّل الفيديو (اختياري) → يُرفع على Bunny Stream
 → Replay متاح داخل الكورس
```

### مميزات
- Live Q&A أثناء الجلسة نفسها فقط (مربوط بالجلسة، مش شات دائم — بيقفل مع انتهاء الجلسة)
- Attendance Tracking
- Recording + Replay
- Reminder قبل الجلسة
- Calendar Integration

---

## 15. Admin Dashboard

### الصفحات والأقسام
Users, Teachers, Students, Subjects, Grades, Courses, Lessons, Videos, Comments Moderation Queue, Payments, Orders, Coupons, Ads, Statistics, Reports, Logs, Settings, Backups, Permissions, Roles

### Academic Calendar
- يحتوي: Semester, Month, Week, Lessons Release, Live Sessions, Quizzes, Exams, Announcements
- نشر تلقائي للمحتوى وفق التقويم

### Admin Actions
Delete User, Ban User, Suspend Teacher, Refund Payment, Reset Password, Delete Course, Delete Lesson, Restore Backup, Assign Role, Reset Devices, Approve/Reject Comment, Ban User from Commenting

---

## 16. Admin Settings (تفصيلي)

General, Branding (Logo, Favicon, Theme), Homepage Content, Email Settings, SMS Settings, WhatsApp Settings, Payment Gateways, Storage Providers (Supabase Storage), **Bunny Stream Configuration**, **YouTube API Configuration** (للمعاينات فقط), Maintenance Mode, SEO Settings, AI Settings, Live Class Settings, **Comments Moderation Settings** (الفلتر، عدد التحذيرات، مدة الحظر المؤقت)، Exam Settings, Leaderboard Settings, Notification Settings

---

## 17. Media Library

يشمل: Images, Videos (روابط Bunny/YouTube), PDFs, Audio Files, ZIP Files, Certificates, Banners, Teacher Photos — التخزين عبر Supabase Storage

كل ملف له: Preview, Rename, Replace, Delete, Storage Usage, Upload Date, Uploaded By

---

## 18. Search

- Teacher Search
- Course Search
- Student Search (للأدمن فقط)

---

## 19. Wishlist / Favorites

- Save Course
- Favorite Teacher
- Continue Watching
- Recently Viewed

---

## 20. Reviews & Ratings

بعد إنهاء الكورس:
- Rate Course (نجوم)
- Rate Teacher (نجوم)
- Write Review
- Like Review
- Report Review

---

## 21. Student Dashboard

### Student Journey
```
Dashboard
 → Continue Learning
 → Today's Recommended Lesson
 → Upcoming Live Session
 → Upcoming Quiz / Exam
 → Latest Notifications
 → Current Ranking + XP
 → Achievements
 → Continue Course
```

### Dashboard Widgets (14 widget)
Continue Learning, Latest Lesson, Upcoming Live Session, Upcoming Quiz, Upcoming Exam, Weekly Progress, Course Progress, Total XP, Current Rank, Badges, Certificates, Recent Notifications, Continue Watching, Recommended Courses

---

## 22. Security

### CSRF, XSS, SQL Injection, Rate Limiting

**Rate Limiting** (تُنفَّذ عبر Next.js Middleware / Edge Function + جدول عدّاد في Postgres، أو Upstash Rate Limit على خطة مجانية):
| Endpoint | الحد |
|---|---|
| Login | 5 محاولات / 15 دقيقة / IP |
| Register | 3 طلبات / ساعة / IP |
| Video Stream | 1 بث نشط / جهاز |
| API عام | 60 طلب / دقيقة / مستخدم |
| Payment | 3 محاولات / 10 دقائق / مستخدم |
| Lesson Comment | 10 تعليقات / ساعة / مستخدم |

### Brute Force Protection
- Password Hashing (يُدار تلقائياً عبر Supabase Auth — bcrypt)
- Audit Logs
- Row Level Security (RLS) على كل جدول حساس في Postgres
- Signed URLs
- Video Protection (Watermark بالرقم القومي + لوجو المنصة + Domain Restriction)
- Client-Side Deterrents (منع الكليك يمين، رصد فتح DevTools) — راجع Section 7 لتفاصيل ليه دي رادع مش حماية كاملة

---

## 23. Soft Delete Policy

**Soft Delete (قابل للاسترجاع):**
Users, Courses, Lessons, Reviews, Lesson Comments

**Hard Delete (دائم بعد 30 يوم):**
بيانات المستخدم المحذوف بعد فترة السماح

---

## 24. Caching Strategy

بدون Redis كسيرفر منفصل — عبر جداول Cache في Postgres تتحدّث بـ Supabase Scheduled Edge Functions، أو Next.js ISR/Static Regeneration للمحتوى شبه الثابت.

| البيانات | مدة الكاش | الآلية |
|---|---|---|
| Course Catalog | ساعة | Next.js ISR |
| Leaderboard | 5 دقائق | جدول `leaderboard_cache` + Scheduled Edge Function |
| Student Dashboard Widgets | دقيقتان | React Query cache على الـ Frontend |
| Teacher Profile | 30 دقيقة | Next.js ISR |
| Landing Page Content | 6 ساعات | Next.js ISR |

---

## 25. Logging

كل العمليات تُسجَّل (جدول `audit_logs` في Postgres):
- من دخل / من حذف / من عدّل / من اشترى / من استرجع فلوس / من رفع فيديو / من غير صلاحية / من وافق أو رفض تعليق

---

## 26. User Flow (كامل)

```
Visitor
 → Register (اسم + إيميل + رقم قومي + باسورد)
 → Verify Email (كود)
 → Verify Phone (واتساب أو SMS)
 → Choose Grade
 → Complete Profile
 → Welcome Tutorial
 → Dashboard
 → Browse Subjects
 → Open Teacher Profile
 → Open Course
 → Purchase (اختر طريقة دفع)
 → Watch Lesson (بـ Watermark عبر Bunny Stream)
 → Comment على الدرس (ينتظر موافقة الأدمن)
 → Take Quiz
 → Homework
 → Exam (مرة واحدة)
 → Certificate
 → Leaderboard
```

---

## 27. Error Pages

401, 403, 404, 419, 429, 500, 503

---

## 28. Landing Page

**Hero:**
- Title: ذاكر صح...وادخل الامتحان وانت واثق 🎓
- Subtitle: شرح واضح، تدريبات ضخمة، امتحانات بتايمر - ومنافسة حقيقية مع زملائك في كل مصر.
- CTA: ابدأ الآن ←

**Teachers Section:** بطاقة لكل مدرس (صورة + نبذة + زر استعراض المادة)

**Honor Board:** أعلى 3 طلاب في مجموع كل المواد

**FAQ**

**Footer:**
| الروابط السريعة | المواد الدراسية | الشركة | تواصل معنا |
|---|---|---|---|
| الرئيسية | رياضيات | من نحن | support@goglish.com |
| المستويات | علوم | شروط الاستخدام | واتساب |
| الأسعار | عربي | سياسة الخصوصية | انستجرام |
| مساعدة | انجليزي | | |

---

## 29. Design System

**Colors:**
- Primary: #F5C518 (أصفر)
- Secondary: #1A1A2E (داكن)
- Text: #333333
- Accent: #FFFFFF

**Typography:**
| النوع | الحجم | الوزن | الاستخدام |
|---|---|---|---|
| H1 | 32px | 700 | عنوان رئيسي |
| H2 | 24px | 600 | عنوان ثانوي |
| H3 | 20px | 600 | عنوان ثالث |
| Body | 16px | 400 | نص عادي |
| Small | 14px | 400 | تفاصيل |
| Caption | 12px | 400 | تسميات صغيرة |

**Spacing:** 4, 8, 12, 16, 24, 32, 48, 64 px

**Border Radius:** 4, 8, 12, 16 px + Pill + Circle

**Modes:** Dark Mode + Light Mode

**Features:** Responsive, Animations, Accessibility (WCAG)

---

## 30. Responsive Design Rules (مهم جداً — لا تتجاهل)

### ⚠️ القاعدة الأساسية
كل صفحة وكل component يجب أن يملأ عرض الشاشة بالكامل على Desktop وMobile بدون أي فراغات جانبية أو محتوى مقطوع.

### Breakpoints (Tailwind)
| الاسم | العرض | الجهاز |
|---|---|---|
| `default` | 0px+ | Mobile (ابدأ منه دائماً) |
| `sm` | 640px+ | Mobile كبير |
| `md` | 768px+ | Tablet |
| `lg` | 1024px+ | Laptop |
| `xl` | 1280px+ | Desktop |
| `2xl` | 1536px+ | Wide Screen |

### قواعد CSS إجبارية

**1. الـ Layout الرئيسي:**
```css
/* صح ✅ */
width: 100%;
max-width: 100%;

/* غلط ❌ — بيخلي المحتوى ضيق */
width: 800px;
width: 600px;
```

**2. الـ Container:**
```html
<!-- صح ✅ -->
<div class="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

<!-- غلط ❌ -->
<div style="width: 800px; margin: auto;">
```

**3. الـ Body و html:**
```css
/* لازم يتحط في global CSS */
html, body {
  width: 100%;
  min-height: 100vh;
  overflow-x: hidden;
}
```

**4. الصور:**
```css
/* صح ✅ */
img {
  max-width: 100%;
  height: auto;
}
```

**5. الـ Grid:**
```html
<!-- صح ✅ — يبدأ بعمود واحد على موبايل وبيكبر -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

<!-- غلط ❌ — fixed columns بتكسر الموبايل -->
<div class="grid grid-cols-3 gap-4">
```

**6. الـ Flexbox:**
```html
<!-- صح ✅ -->
<div class="flex flex-col md:flex-row gap-4">

<!-- غلط ❌ — بيخلي العناصر تطلع برا الشاشة -->
<div class="flex flex-row gap-4">
```

**7. النصوص:**
```html
<!-- صح ✅ -->
<h1 class="text-2xl md:text-3xl lg:text-4xl font-bold">

<!-- غلط ❌ -->
<h1 style="font-size: 48px;">
```

### قواعد الـ Layout لكل نوع صفحة

**Sidebar Layout (Dashboard):**
```html
<!-- صح ✅ -->
<div class="flex min-h-screen w-full">
  <!-- Sidebar: hidden على موبايل، ظاهر على desktop -->
  <aside class="hidden lg:flex lg:w-64 lg:flex-shrink-0">
  </aside>
  <!-- Main: يأخذ باقي العرض -->
  <main class="flex-1 min-w-0 overflow-auto">
  </main>
</div>
```

**Full Width Page (Landing):**
```html
<!-- صح ✅ -->
<section class="w-full px-4 sm:px-6 lg:px-8">
  <div class="max-w-7xl mx-auto">
    <!-- المحتوى -->
  </div>
</section>
```

**Cards Grid:**
```html
<!-- صح ✅ -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
```

### Navbar Rules
```html
<!-- صح ✅ -->
<nav class="w-full fixed top-0 left-0 right-0 z-50">
  <div class="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
  </div>
</nav>
```

### Mobile Navigation
- على الموبايل: Bottom Navigation Bar أو Hamburger Menu
- الـ Sidebar يتحول لـ Drawer على الموبايل
- كل زر لازم يكون بحجم لا يقل عن 44x44px (Apple HIG)

### قائمة المراجعة قبل تسليم أي صفحة ✅
- [ ] فتحت على Chrome Desktop (1440px) → محتوى بيملأ الشاشة كاملاً
- [ ] فتحت على Chrome Mobile (375px) → لا overflow أفقي
- [ ] فتحت على Tablet (768px) → Layout مناسب
- [ ] مفيش عنصر بـ fixed width بالـ px في CSS
- [ ] الـ body و html فيهم `width: 100%`
- [ ] الـ images فيها `max-width: 100%`
- [ ] الـ Sidebar بيختفي أو يتحول لـ Drawer على الموبايل

### ⛔ ممنوع منعاً باتاً
```css
/* ممنوع ❌ */
width: 800px;
width: 1200px;
min-width: 900px;
position: absolute; left: 200px; (من غير responsive)

/* استخدم بدلهم ✅ */
width: 100%;
max-width: 80rem; /* = 1280px */
min-width: unset;
```

---

## 31. RTL Support Rules (دعم اللغة العربية)

```html
<!-- في ملف _document.tsx أو layout.tsx -->
<html lang="ar" dir="rtl">
```

```css
/* في global.css */
body {
  direction: rtl;
  text-align: right;
}
```

**Tailwind RTL:**
```html
<!-- استخدم rtl: prefix -->
<div class="mr-4 rtl:ml-4 rtl:mr-0">
<!-- أو استخدم ms- و me- بدل ml- و mr- -->
<div class="ms-4 me-8">
```

**قاعدة:** كل margin/padding جانبي استخدم `ms-` (margin-start) و `me-` (margin-end) بدل `ml-` و `mr-` عشان يتقلب تلقائياً مع RTL.

---

## 32. Tech Stack

**Frontend + Backend (واحد، Full-Stack):**
Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui + React Query + Axios + React Hook Form + Zod

**Backend Logic:**
Next.js API Routes + Supabase Edge Functions (Deno/TypeScript) للمنطق اللي محتاج صلاحيات أعلى من الـ Client (توليد Signed URLs، معالجة Webhooks، إرسال إشعارات، Cron Jobs)

**Database + Auth + Storage:**
Supabase (خطة **Free** حالياً — Postgres + Supabase Auth + Supabase Storage + Realtime + Row Level Security)

**Video:**
Bunny Stream (محمي) + YouTube Unlisted (معاينات فقط)

**Infrastructure:**
Vercel (أو مشابه) لاستضافة Next.js + Supabase Cloud للـ Backend — بدون Docker / Nginx / Supervisor / سيرفر مُدار يدوياً. CI/CD عبر GitHub Actions.

**⚠️ ملاحظة الترقية:** لما المشروع يقرب من الإطلاق الفعلي أو يبدأ فيه اختبار حقيقي بمستخدمين، لازم الترقية من Supabase Free إلى Pro ($25/شهر) — الخطة المجانية بتوقف المشروع تلقائياً بعد أسبوع بدون نشاط ومحدودة بـ 500MB database.

---

## 33. Coding Standards

SOLID, DRY, KISS, Clean Architecture, Service Layer (TypeScript Services للمنطق المشترك), DTO / Zod Schemas للـ Validation, Repository-style data-access functions فوق Supabase Client، Row Level Security كطبقة حماية أساسية مش بديل عن التحقق في الكود

---

## 34. Database

- Fully normalized
- كل العلاقات بـ Foreign Keys + Indexes + Cascade Rules
- Soft Deletes حيث يلزم
- Audit Fields على كل جدول
- UUID كـ Primary Key الافتراضي (متوافق مع Supabase)
- **Row Level Security (RLS) إجباري على كل جدول فيه بيانات حساسة أو خاصة بمستخدم**
- Migrations عبر Supabase CLI (ملفات SQL نسخة مُتحكَّم بها في Git)
- ER Diagram يُولَّد قبل التنفيذ

---

## 35. API Standards

- كل Endpoint له: Request, Response, Status Codes, Validation (Zod)
- Auth: Supabase Auth (JWT) + Refresh Tokens
- Authorization: Row Level Security Policies في Postgres + فحوصات إضافية داخل Edge Functions/API Routes للمنطق المعقد (مش كل الصلاحيات تقدر تتعبر بـ RLS بس)
- Custom Claims في الـ JWT لتحديد الدور (Role) بسرعة بدون استعلام إضافي

---

## 36. Testing

Unit Test, Integration Test (Vitest), API Route Tests, E2E (Playwright)

---

## 37. Reports & Analytics

**Student Reports:** Study Time, Course Progress, Lessons Completed, Quiz/Exam Scores, Attendance, XP History, Ranking History, Login History, Device History

**Teacher Reports:** Student Analytics, Performance Reports

**Financial Reports:** Revenue, Payments, Refunds, Invoices, Taxes, Conversion Rate, Retention

---

## 38. Comments Moderation Rules (Terms of Service)

- ممنوع: تبادل أرقام تليفون، إيميلات، روابط داخل تعليقات الدروس
- ممنوع: الكلمات البذيئة
- المخالفة: رفض تلقائي للتعليق → إيقاف مؤقت (24 ساعة) → حظر دائم من كتابة التعليقات
- كل تعليق (حتى لو نضيف) لازم يمر بموافقة الأدمن/الموديريتور قبل ما يظهر للطلاب الآخرين

---

## 39. Future Features (Version 3)

AI Teacher, AI Chatbot, Question Generator, Essay Correction, Recommendation System, Mobile App, Offline Mode

---

## 40. Success Criteria

✅ الطالب يسجل ويبدأ التعلم خلال 5 دقائق
✅ المنصة تعمل بكفاءة تحت الضغط العالي
✅ الطلاب يكملون الكورسات بفضل الـ Gamification
✅ أولياء الأمور يتابعون تقدم أبنائهم بفاعلية
✅ المدرسون يديرون المحتوى بكفاءة
✅ حماية فيديو حقيقية (Signed URLs + Token + Watermark) وليست شكلية فقط
✅ المنصة جاهزة لتطبيقات الموبايل بدون إعادة تصميم الـ Backend

---

*آخر تحديث للبرومت: النسخة 3.0 — Next.js + Supabase (بدون Laravel)، Bunny Stream + YouTube Unlisted، تعليقات بموافقة الأدمن بدل الشات الجماعي*
