/** Google Account — create app passwords (requires 2-Step Verification). */
export const GMAIL_APP_PASSWORDS_URL = "https://myaccount.google.com/apppasswords";

export const GMAIL_SECURITY_URL = "https://myaccount.google.com/security";

export const GMAIL_APP_PASSWORD_STEPS = [
  "Turn on 2-Step Verification in your Google Account (Security).",
  "Open App passwords (link below) and sign in if asked.",
  'Choose app: "Mail", device: "Other" → name it "TechLaunchpad Placement".',
  "Copy the 16-character password (no spaces) and paste it here — not your normal Gmail password.",
] as const;
