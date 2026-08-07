/** Builds a syntactically-valid Egyptian national ID encoding the given age
 * (birthday = Jan 1st of the matching year), for exercising national-id
 * validation without a real ID. Format is documented in
 * lib/services/national-id.service.ts. */
export function buildNationalId(age: number): string {
  const now = new Date();
  const birthYear = now.getUTCFullYear() - age;
  const century = birthYear >= 2000 ? "3" : "2";
  const yy = String(birthYear % 100).padStart(2, "0");
  const governorate = "01";
  const sequence = String(Math.floor(Math.random() * 9999)).padStart(4, "0");
  const checkDigit = String(Math.floor(Math.random() * 10));
  return `${century}${yy}0101${governorate}${sequence}${checkDigit}`;
}

let counter = 0;
export function uniqueEmail(): string {
  counter += 1;
  return `test-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export function validRegisterPayload(overrides: Partial<Record<string, string>> = {}) {
  const password = "Str0ngPass!";
  return {
    first_name: "طالب",
    last_name: "تجريبي",
    email: uniqueEmail(),
    national_id: buildNationalId(16),
    password,
    confirm_password: password,
    ...overrides,
  };
}
