import "server-only";

const MAGIC_BYTE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
};

/**
 * `file.type` is client-supplied and trivially spoofed (e.g. an .html file
 * renamed with an image MIME type), so it's not trustworthy on its own for
 * anything security-sensitive - this confirms the file's actual bytes match
 * what it claims to be.
 */
export async function verifyFileMagicBytes(buffer: Buffer, mime: string): Promise<boolean> {
  const sigs = MAGIC_BYTE_SIGNATURES[mime];
  if (!sigs) return false;
  return sigs.some((sig) => sig.every((b, i) => buffer[i] === b));
}

/** Only the types above have a known signature - callers should skip (not
 * reject) other otherwise-allowed types that aren't covered here. */
export function hasMagicByteSignature(mime: string): boolean {
  return mime in MAGIC_BYTE_SIGNATURES;
}
