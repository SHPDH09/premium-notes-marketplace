import { prisma } from "@/lib/db";
import { sendPlatformEmail, isPlatformEmailConfigured } from "@/lib/email/platform-mailer";
import {
  buildSubscriptionReminderEmail,
  type ReminderDay,
} from "@/lib/placement/subscription-reminder-email";

const REMINDER_DAYS: ReminderDay[] = [3, 2, 1];

/** Calendar days until end date (IST date boundaries). */
export function calendarDaysUntilEnd(endsAt: Date, now = new Date()): number {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const toIstDay = (d: Date) => {
    const ist = new Date(d.getTime() + istOffsetMs);
    return Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  };
  const endDay = toIstDay(endsAt);
  const today = toIstDay(now);
  return Math.round((endDay - today) / (24 * 60 * 60 * 1000));
}

export async function runPlacementSubscriptionReminders(): Promise<{
  scanned: number;
  sent: number;
  skipped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  if (!isPlatformEmailConfigured()) {
    return {
      scanned: 0,
      sent: 0,
      skipped: 0,
      errors: ["Platform SMTP not configured"],
    };
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

  const subscriptions = await prisma.userPlacementSubscription.findMany({
    where: {
      status: "ACTIVE",
      endsAt: { not: null, gt: now, lte: horizon },
      user: { status: "ACTIVE", role: "STUDENT" },
    },
    include: {
      user: true,
      plan: true,
      reminders: true,
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const sub of subscriptions) {
    if (!sub.endsAt) continue;

    const daysLeft = calendarDaysUntilEnd(sub.endsAt, now);
    if (!REMINDER_DAYS.includes(daysLeft as ReminderDay)) {
      skipped += 1;
      continue;
    }

    const daysBeforeEnd = daysLeft as ReminderDay;
    if (sub.reminders.some((r) => r.daysBeforeEnd === daysBeforeEnd)) {
      skipped += 1;
      continue;
    }

    const email = buildSubscriptionReminderEmail({
      studentName: sub.user.name,
      planName: sub.plan.name,
      endsAt: sub.endsAt,
      daysLeft: daysBeforeEnd,
    });

    try {
      await sendPlatformEmail({
        to: sub.user.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });

      await prisma.placementSubscriptionReminder.create({
        data: {
          subscriptionId: sub.id,
          daysBeforeEnd,
        },
      });
      sent += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Send failed";
      errors.push(`${sub.user.email}: ${msg}`);
    }
  }

  return { scanned: subscriptions.length, sent, skipped, errors };
}
