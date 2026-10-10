import { Note, User, Order, Transaction, Coupon, Purchase } from "@prisma/client";
import { getPublicCoverUrl } from "@/lib/storage";
import { decimalToNumber } from "@/lib/utils";
import { discountPercent as dp } from "@/lib/pricing";

export function serializeNotePublic(note: Note, owned = false) {
  const price = decimalToNumber(note.price);
  const finalPrice = decimalToNumber(note.finalPrice);
  return {
    id: note.id,
    name: note.name,
    title: note.title,
    description: note.description,
    coverImage: getPublicCoverUrl(note.coverImage),
    price,
    discountType: note.discountType,
    discountValue: decimalToNumber(note.discountValue),
    finalPrice,
    discountPercentage: dp(price, finalPrice),
    hasPdf: !!note.pdfStorageKey,
    hasLink: !!note.notesLink,
    freePreviewPages: note.freePreviewPages ?? 2,
    pdfPageCount: note.pdfPageCount,
    previewAvailable: !!note.pdfStorageKey,
    purchaseCount: note.purchaseCount,
    owned,
    status: note.status,
    createdAt: note.createdAt.toISOString(),
  };
}

export function serializeNoteAdmin(note: Note) {
  return {
    ...serializeNotePublic(note),
    pdfStorageKey: note.pdfStorageKey ? "[stored]" : null,
    notesLink: note.notesLink,
    status: note.status,
  };
}

export function serializeUserAdmin(user: User & { _count?: { purchases?: number; orders?: number } }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    role: user.role,
    profileImage: user.profileImage,
    createdAt: user.createdAt.toISOString(),
    totalPurchases: user._count?.purchases ?? 0,
  };
}

export function serializeTransaction(
  tx: Transaction & {
    order?: Order & { items?: { note: Note }[] };
    user?: User;
  }
) {
  const noteTitle = tx.order?.items?.[0]?.note?.title;
  return {
    id: tx.id,
    transactionId: tx.transactionId,
    orderId: tx.orderId,
    amount: decimalToNumber(tx.amount),
    paymentStatus: tx.paymentStatus,
    paymentMethod: tx.paymentMethod,
    createdAt: tx.createdAt.toISOString(),
    studentName: tx.user?.name,
    studentEmail: tx.user?.email,
    noteTitle,
    order: tx.order
      ? {
          subtotal: decimalToNumber(tx.order.subtotal),
          discount: decimalToNumber(tx.order.discount),
          couponDiscount: decimalToNumber(tx.order.couponDiscount),
          totalAmount: decimalToNumber(tx.order.totalAmount),
          transactionStatus: tx.order.transactionStatus,
        }
      : undefined,
  };
}

export function serializeCoupon(
  coupon: Coupon & {
    couponNotes?: { noteId: string }[];
    couponPhysicalDocuments?: { physicalDocumentId: string }[];
  }
) {
  return {
    id: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: decimalToNumber(coupon.discountValue),
    maxUsers: coupon.maxUsers,
    usedCount: coupon.usedCount,
    validFrom: coupon.validFrom.toISOString(),
    validUntil: coupon.validUntil.toISOString(),
    minPurchaseAmount: decimalToNumber(coupon.minPurchaseAmount),
    maxDiscount: coupon.maxDiscount ? decimalToNumber(coupon.maxDiscount) : null,
    status: coupon.status,
    appliesTo: coupon.appliesTo,
    noteIds: coupon.couponNotes?.map((n) => n.noteId) ?? [],
    physicalDocumentIds:
      coupon.couponPhysicalDocuments?.map((n) => n.physicalDocumentId) ?? [],
  };
}

export function serializePurchase(p: Purchase & { note: Note }) {
  return {
    id: p.id,
    note: serializeNotePublic(p.note, true),
    purchasedPrice: decimalToNumber(p.purchasedPrice),
    purchasedAt: p.purchasedAt.toISOString(),
  };
}
