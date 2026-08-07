import "server-only";
import fs from "node:fs";
import path from "node:path";
import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { ArabicShaper } from "arabic-persian-reshaper";

// Goglish is Arabic-first, so generated PDFs (certificates, invoices)
// routinely need Arabic text. pdf-lib has no bidi/text-shaping engine of its
// own - it just places glyphs left-to-right - so Arabic needs to be
// pre-shaped (contextual letter forms) and reversed (visual RTL order)
// before drawing, using a font that actually contains presentation-form
// glyphs. @embedpdf/fonts-arabic ships Noto Naskh Arabic as a plain .ttf
// specifically built for this (OFL-1.1, fine for commercial use).
// arabic-persian-reshaper is MIT-licensed - the more commonly-suggested
// `arabic-reshaper` package is GPL-3.0, not appropriate in a proprietary
// codebase.
const ARABIC_FONT_PATH = path.join(
  process.cwd(),
  "node_modules/@embedpdf/fonts-arabic/fonts/NotoNaskhArabic-Regular.ttf",
);

const ARABIC_CHAR_RANGE = /[؀-ۿ]/;

/** Shapes + reverses Arabic text for correct rendering with drawText's naive
 * left-to-right glyph placement. Latin-only strings pass through unchanged.
 * Mixed Arabic/Latin within a single string isn't fully handled (would need
 * real bidi segmentation) - fine as long as callers keep each drawn field
 * either wholly Arabic or wholly Latin, which both certificates and
 * invoices do. */
export function formatForPdf(text: string): string {
  if (!ARABIC_CHAR_RANGE.test(text)) return text;
  return [...ArabicShaper.convertArabic(text)].reverse().join("");
}

let cachedFontBytes: Buffer | null = null;
function getArabicFontBytes(): Buffer {
  if (!cachedFontBytes) cachedFontBytes = fs.readFileSync(ARABIC_FONT_PATH);
  return cachedFontBytes;
}

export async function embedPdfFonts(doc: PDFDocument): Promise<{ arabicFont: PDFFont; latinFont: PDFFont }> {
  doc.registerFontkit(fontkit);
  const arabicFont = await doc.embedFont(getArabicFontBytes());
  const latinFont = await doc.embedFont(StandardFonts.Helvetica);
  return { arabicFont, latinFont };
}
