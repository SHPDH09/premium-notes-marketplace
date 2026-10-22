import { getCrmSession } from "@/lib/crm/auth";
import { ContactsManager } from "@/components/crm/contacts-manager";

export default async function CrmContactsPage() {
  const session = await getCrmSession();
  const isAdmin = session?.role === "COMPANY_ADMIN" || session?.memberRole === "COMPANY_ADMIN";

  return <ContactsManager isAdmin={!!isAdmin} />;
}
