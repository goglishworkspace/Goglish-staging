import "server-only";
import crypto from "node:crypto";
import { PDFDocument, rgb } from "pdf-lib";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatForPdf, embedPdfFonts } from "./pdf-arabic";

function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  return `INV-${year}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

async function buildInvoicePdf(params: {
  studentName: string;
  itemTitle: string;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  invoiceNumber: string;
  issuedAt: Date;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const { arabicFont, latinFont } = await embedPdfFonts(doc);
  const page = doc.addPage([595, 842]); // A4 portrait
  const { width, height } = page.getSize();

  const money = (cents: number) => `${(cents / 100).toFixed(2)} ${params.currency}`;

  page.drawText("Goglish", { x: 50, y: height - 60, size: 24, font: latinFont, color: rgb(0.1, 0.1, 0.18) });
  page.drawText(`Invoice #${params.invoiceNumber}`, { x: 50, y: height - 90, size: 14, font: latinFont });
  page.drawText(`Date: ${params.issuedAt.toISOString().slice(0, 10)}`, {
    x: 50,
    y: height - 110,
    size: 12,
    font: latinFont,
  });

  const shapedName = formatForPdf(params.studentName);
  page.drawText(shapedName, {
    x: width - 50 - shapedName.length * 7,
    y: height - 90,
    size: 14,
    font: arabicFont,
  });

  const shapedTitle = formatForPdf(params.itemTitle);
  page.drawText(shapedTitle, {
    x: width - 50 - shapedTitle.length * 7,
    y: height - 160,
    size: 14,
    font: arabicFont,
  });

  let y = height - 220;
  const line = (label: string, value: string) => {
    page.drawText(label, { x: 50, y, size: 12, font: latinFont });
    page.drawText(value, { x: width - 150, y, size: 12, font: latinFont });
    y -= 24;
  };
  line("Subtotal", money(params.subtotalCents));
  line("Discount", `-${money(params.discountCents)}`);
  line("Tax", money(params.taxCents));
  page.drawLine({
    start: { x: 50, y: y + 10 },
    end: { x: width - 50, y: y + 10 },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 10;
  line("Total", money(params.totalCents));

  return doc.save();
}

/** Generates an invoice PDF after a completed payment. Idempotent: `invoices`
 * has a UNIQUE constraint on order_id, so retried webhook processing just
 * returns the existing invoice. */
export async function generateInvoice(params: {
  userId: string;
  orderId: string;
  studentName: string;
  itemTitle: string;
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
}): Promise<{ invoiceId: string }> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("invoices")
    .select("id")
    .eq("order_id", params.orderId)
    .maybeSingle();
  if (existing) return { invoiceId: existing.id };

  const invoiceNumber = generateInvoiceNumber();
  const issuedAt = new Date();
  const pdfBytes = await buildInvoicePdf({
    studentName: params.studentName,
    itemTitle: params.itemTitle,
    subtotalCents: params.subtotalCents,
    discountCents: params.discountCents,
    taxCents: params.taxCents,
    totalCents: params.totalCents,
    currency: params.currency,
    invoiceNumber,
    issuedAt,
  });

  const storagePath = `${params.userId}/${params.orderId}.pdf`;
  const { error: uploadError } = await admin.storage
    .from("invoices")
    .upload(storagePath, Buffer.from(pdfBytes), { contentType: "application/pdf", upsert: true });
  if (uploadError) throw uploadError;

  const { data: invoice, error: insertError } = await admin
    .from("invoices")
    .insert({
      order_id: params.orderId,
      user_id: params.userId,
      invoice_number: invoiceNumber,
      storage_path: storagePath,
      subtotal_cents: params.subtotalCents,
      discount_cents: params.discountCents,
      tax_cents: params.taxCents,
      total_cents: params.totalCents,
      issued_at: issuedAt.toISOString(),
    })
    .select("id")
    .single();
  if (insertError) throw insertError;

  return { invoiceId: invoice.id };
}
