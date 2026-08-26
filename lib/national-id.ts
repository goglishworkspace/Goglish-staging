// Pure (no "server-only", no crypto) - safe to import from client components,
// unlike lib/services/national-id.service.ts (which needs Node's crypto for
// encrypt/decrypt and is deliberately server-only). Split out so the
// registration form can reject an invalid/out-of-age-range national ID
// client-side, before supabase.auth.signUp() is ever called.
const MIN_AGE = 13;
const MAX_AGE = 19;

/**
 * Extracts the birth date encoded in an Egyptian national ID.
 * Digit 1 = century (2 -> 1900s, 3 -> 2000s), digits 2-3 = year,
 * digits 4-5 = month, digits 6-7 = day.
 * Returns null if the ID doesn't encode a valid calendar date.
 */
export function extractBirthDateFromNationalId(nationalId: string): Date | null {
  if (!/^\d{14}$/.test(nationalId)) return null;

  const centuryDigit = nationalId[0];
  const century = centuryDigit === "2" ? 1900 : centuryDigit === "3" ? 2000 : null;
  if (century === null) return null;

  const year = century + parseInt(nationalId.slice(1, 3), 10);
  const month = parseInt(nationalId.slice(3, 5), 10);
  const day = parseInt(nationalId.slice(5, 7), 10);

  if (month < 1 || month > 12) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  const isValidDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isValidDate ? date : null;
}

export function calculateAge(birthDate: Date, asOf: Date = new Date()): number {
  let age = asOf.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = asOf.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getUTCDate() < birthDate.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export type NationalIdValidation =
  | { valid: true; birthDate: Date }
  | { valid: false; reason: "invalid_format" | "underage" | "overage" };

/** Validates format + extracts birth date + enforces the 13-19 age window
 * (students must be highschool-aged - Section 5). */
export function validateNationalId(nationalId: string): NationalIdValidation {
  const birthDate = extractBirthDateFromNationalId(nationalId);
  if (!birthDate) return { valid: false, reason: "invalid_format" };

  const age = calculateAge(birthDate);
  if (age < MIN_AGE) return { valid: false, reason: "underage" };
  if (age > MAX_AGE) return { valid: false, reason: "overage" };

  return { valid: true, birthDate };
}

export function nationalIdErrorMessage(reason: "invalid_format" | "underage" | "overage"): string {
  switch (reason) {
    case "invalid_format":
      return "الرقم القومي غير صالح";
    case "underage":
      return `السن لازم يكون ${MIN_AGE} سنة على الأقل`;
    case "overage":
      return `السن لازم يكون ${MAX_AGE} سنة كحد أقصى`;
  }
}
