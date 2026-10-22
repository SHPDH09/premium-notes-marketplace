import { getCrmSession } from "@/lib/crm/auth";
import { InboxWorkspace } from "@/components/crm/inbox-workspace";

export default async function CrmInboxPage() {
  const session = await getCrmSession();
  return <InboxWorkspace memberId={session?.memberId} />;
}
