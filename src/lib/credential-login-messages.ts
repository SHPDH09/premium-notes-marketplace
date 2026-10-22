export type LoginFailureReason =
  | "MISSING_FIELDS"
  | "INVALID_CREDENTIALS"
  | "ADMIN_PORTAL_REQUIRED"
  | "STUDENT_PORTAL_REQUIRED"
  | "DISABLED"
  | "SERVER_MISCONFIG"
  | "SERVER_ERROR"
  | "CRM_PORTAL_REQUIRED";

export function loginFailureMessage(reason: LoginFailureReason): string {
  switch (reason) {
    case "MISSING_FIELDS":
      return "Enter your email and password.";
    case "INVALID_CREDENTIALS":
      return "Incorrect email or password.";
    case "ADMIN_PORTAL_REQUIRED":
      return "This account is an admin. Use Admin Login at /admin/login.";
    case "STUDENT_PORTAL_REQUIRED":
      return "This account is a student. Use the main Login page.";
    case "CRM_PORTAL_REQUIRED":
      return "Use the WhatsApp CRM login at /crm/login or Super Admin at /super-admin/login.";
    case "DISABLED":
      return "This account is disabled. Contact support.";
    case "SERVER_MISCONFIG":
      return "Login is temporarily unavailable (server config). Contact support.";
    case "SERVER_ERROR":
      return "Something went wrong. Try again or contact support.";
    default:
      return "Login failed.";
  }
}
