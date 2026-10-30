// Turkish number plates. Stored without spaces in upper case ("34ABC789") so a search for
// "34 abc 789", "34abc789" or "34 ABC789" finds the same car; shown as "34 ABC 789".
//
// Format: province 01–81, then 1–3 letters, then 2–4 digits (official civilian plates).
// Letters exclude Ç, Ğ, İ, Ö, Ş, Ü; Q, W, X are allowed on newer plates.

const PLATE = /^(0[1-9]|[1-7][0-9]|8[01])([A-Z]{1,3})(\d{2,4})$/;

/** Upper case, Turkish İ/ı folded, everything but letters and digits removed */
export function normalizePlate(input: string) {
  return input
    .replace(/i/g, "I")
    .replace(/ı/g, "I")
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/[^A-Z0-9]/g, "");
}

export function isValidPlate(input: string) {
  return PLATE.test(normalizePlate(input));
}

/** "34ABC789" → "34 ABC 789"; anything that is not a plate comes back as typed */
export function formatPlate(input: string) {
  const match = PLATE.exec(normalizePlate(input));
  return match ? `${match[1]} ${match[2]} ${match[3]}` : input.toLocaleUpperCase("tr-TR");
}
