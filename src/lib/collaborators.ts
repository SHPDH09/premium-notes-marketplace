import { Collaborator, StudentSpotlight } from "@prisma/client";
import { getPublicCoverUrl } from "@/lib/storage";

export function serializeCollaborator(c: Collaborator) {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    logoImage: getPublicCoverUrl(c.logoImage),
    website: c.website,
    description: c.description,
    status: c.status,
    sortOrder: c.sortOrder,
  };
}

export function serializeSpotlight(s: StudentSpotlight) {
  return {
    id: s.id,
    displayName: s.displayName,
    institute: s.institute,
    headline: s.headline,
    quote: s.quote,
    photo: s.photo?.startsWith("http") ? s.photo : getPublicCoverUrl(s.photo),
    status: s.status,
    sortOrder: s.sortOrder,
    userId: s.userId,
  };
}
