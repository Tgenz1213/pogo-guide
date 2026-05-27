export function isEmailAdmin(email: string): boolean {
  if (!email) return false;

  const initialAdminsStr = process.env.INITIAL_ADMIN_EMAILS || "";
  const initialAdmins = initialAdminsStr
    .replace(/['"]/g, "") // Strip any accidental quotes
    .split(",")
    .map((e) => e.trim());

  return initialAdmins.includes(email);
}
