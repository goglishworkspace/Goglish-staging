import "server-only";
import crypto from "node:crypto";
import { PDFDocument, rgb } from "pdf-lib";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatForPdf, embedPdfFonts } from "./pdf-arabic";

async function buildCertificatePdf(params: {
  studentName: string;
  examTitle: string;
  scorePercent: number;
  issuedAt: Date;
  certificateNumber: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const { arabicFont, latinFont } = await embedPdfFonts(doc);

  const page = doc.addPage([842, 595]); // A4 landscape
  const { width, height } = page.getSize();

  page.drawRectangle({
    x: 20,
    y: 20,
    width: width - 40,
    height: height - 40,
    borderColor: rgb(0.96, 0.77, 0.09),
    borderWidth: 4,
  });

  page.drawText("Goglish", {
    x: width / 2 - 50,
    y: height - 100,
    size: 28,
    font: latinFont,
    color: rgb(0.1, 0.1, 0.18),
  });
  page.drawText("Certificate of Achievement", {
    x: width / 2 - 150,
    y: height - 150,
    size: 20,
    font: latinFont,
    color: rgb(0.1, 0.1, 0.18),
  });

  const shapedName = formatForPdf(params.studentName);
  page.drawText(shapedName, {
    x: width / 2 - shapedName.length * 7,
    y: height - 230,
    size: 26,
    font: arabicFont,
  });

  const shapedTitle = formatForPdf(`اجتاز بنجاح: ${params.examTitle}`);
  page.drawText(shapedTitle, {
    x: width - 100 - shapedTitle.length * 8,
    y: height - 280,
    size: 14,
    font: arabicFont,
  });

  page.drawText(`Score: ${params.scorePercent}%`, { x: 100, y: height - 310, size: 14, font: latinFont });
  page.drawText(`Date: ${params.issuedAt.toISOString().slice(0, 10)}`, {
    x: 100,
    y: height - 340,
    size: 14,
    font: latinFont,
  });
  page.drawText(`Verification code: ${params.certificateNumber}`, {
    x: 100,
    y: 60,
    size: 10,
    font: latinFont,
    color: rgb(0.4, 0.4, 0.4),
  });

  return doc.save();
}

/** Issues a certificate PDF for a passed exam attempt (Section 8 -
 * "Certificates عند الاجتياز"). Idempotent: attempt_id is UNIQUE on
 * `certificates`, so a re-submit / retry just returns the existing one.
 * The PDF file construction itself is deferred to ensureCertificatePdf() when
 * the certificate is first downloaded, keeping exam submission instantaneous. */
export async function issueCertificateIfEligible(params: {
  userId: string;
  examId: string;
  attemptId: string;
  studentName: string;
  examTitle: string;
  scorePercent: number;
  passed: boolean;
}): Promise<{ certificateId: string } | null> {
  if (!params.passed) return null;

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("certificates")
    .select("id")
    .eq("attempt_id", params.attemptId)
    .maybeSingle();
  if (existing) return { certificateId: existing.id };

  const certificateNumber = crypto.randomUUID().slice(0, 8).toUpperCase();
  const issuedAt = new Date();
  const storagePath = `${params.userId}/${params.attemptId}.pdf`;

  const { data: cert, error: insertError } = await admin
    .from("certificates")
    .insert({
      user_id: params.userId,
      exam_id: params.examId,
      attempt_id: params.attemptId,
      certificate_number: certificateNumber,
      storage_path: storagePath,
      issued_at: issuedAt.toISOString(),
    })
    .select("id")
    .single();
  if (insertError) throw insertError;

  return { certificateId: cert.id };
}

/** Lazily builds and uploads the PDF for a certificate if it hasn't already been created.
 * Called on first download via /api/certificates/[id]/signed-url. */
export async function ensureCertificatePdf(certificateId: string): Promise<string> {
  const admin = createAdminClient();

  const { data: cert, error } = await admin
    .from("certificates")
    .select("id, user_id, exam_id, attempt_id, certificate_number, storage_path, issued_at")
    .eq("id", certificateId)
    .maybeSingle();
  if (error || !cert) throw new Error("الشهادة غير موجودة");

  const folder = cert.user_id;
  const filename = `${cert.attempt_id}.pdf`;

  // Check if file already exists in Storage
  const { data: files } = await admin.storage
    .from("certificates")
    .list(folder, { search: filename });

  const alreadyExists = files?.some((f) => f.name === filename);
  if (alreadyExists) {
    return cert.storage_path;
  }

  // Load attempt, exam, and profile details to assemble the certificate
  const [profileRes, examRes, attemptRes] = await Promise.all([
    admin.from("profiles").select("full_name").eq("id", cert.user_id).maybeSingle(),
    admin.from("exams").select("title").eq("id", cert.exam_id).maybeSingle(),
    admin.from("student_exam_attempts").select("score_percent").eq("id", cert.attempt_id).maybeSingle(),
  ]);

  const studentName = profileRes.data?.full_name ?? "Student";
  const examTitle = examRes.data?.title ?? "Exam";
  const scorePercent = attemptRes.data?.score_percent ?? 100;
  const issuedAt = new Date(cert.issued_at);

  const pdfBytes = await buildCertificatePdf({
    studentName,
    examTitle,
    scorePercent,
    issuedAt,
    certificateNumber: cert.certificate_number,
  });

  const { error: uploadError } = await admin.storage
    .from("certificates")
    .upload(cert.storage_path, Buffer.from(pdfBytes), { contentType: "application/pdf", upsert: true });
  if (uploadError) throw uploadError;

  return cert.storage_path;
}
