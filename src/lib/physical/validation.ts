const INDIAN_PINCODE = /^[1-9][0-9]{5}$/;
const PHONE = /^[6-9]\d{9}$/;

export function validateIndianPincode(pincode: string): boolean {
  return INDIAN_PINCODE.test(pincode.trim());
}

export function validateIndianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "").slice(-10);
  return PHONE.test(digits);
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}
