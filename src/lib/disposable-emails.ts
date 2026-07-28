/**
 * Small hand-picked blocklist of disposable email domains.
 * Not exhaustive on purpose — we don't want to over-block real users.
 */
const BLOCKED = new Set([
  "yopmail.com",
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "trashmail.com",
  "tempmail.com",
  "temp-mail.org",
  "throwawaymail.com",
  "getnada.com",
  "dispostable.com",
  "mintemail.com",
  "sharklasers.com",
]);

export function isDisposableEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase().trim();
  return BLOCKED.has(domain);
}
