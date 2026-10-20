export type InvoiceKind = "digital" | "physical";

export type InvoiceLineItem = {
  id: string;
  description: string;
  subtitle?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type InvoiceAddress = {
  fullName: string;
  phone?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export type InvoiceDocumentData = {
  kind: InvoiceKind;
  invoiceNumber: string;
  orderId: string;
  orderReference: string;
  issuedAt: string;
  paymentStatus: string;
  paymentMethod: string;
  paymentReference: string | null;
  gatewayOrderId: string | null;
  billTo: {
    name: string;
    email: string;
    phone?: string | null;
  };
  shipTo?: InvoiceAddress | null;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  couponDiscount: number;
  deliveryCharge: number;
  totalAmount: number;
  refundedAmount: number;
  currency: "INR";
  notes?: string | null;
};
