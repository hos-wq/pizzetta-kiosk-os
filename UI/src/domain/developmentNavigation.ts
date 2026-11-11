import { serviceTaxonomyRelations } from '../fixtures';

export function developmentRoomMenu() {
  return [
    { id: 'room', label: 'ROOM', children: [{ id: 'general', label: 'GENERAL' }, { id: 'amenities', label: 'AMENITIES' }, { id: 'building', label: 'BUILDING' }] },
    { id: 'tenant', label: 'TENANT', children: [{ id: 'personal', label: 'PERSONAL' }, { id: 'contract', label: 'CONTRACT' }, { id: 'finance', label: 'FINANCE' }, { id: 'documents', label: 'DOCUMENTS' }] },
    { id: 'utilities', label: 'UTILITIES', children: [{ id: 'water', label: 'WATER' }, { id: 'electricity', label: 'ELECTRICITY' }, { id: 'internet', label: 'INTERNET' }] },
    { id: 'operations', label: 'OPERATIONS', children: [{ id: 'maintenance', label: 'MAINTENANCE' }, { id: 'housekeeping', label: 'HOUSEKEEPING' }] },
    { id: 'terms', label: 'TERMS', children: [{ id: 'rent', label: 'RENT' }, { id: 'payments', label: 'PAYMENTS' }, { id: 'policies', label: 'POLICIES' }] },
  ];
}

export function personMenu() {
  return [{ id: 'identity', label: 'IDENTITY' }, { id: 'relations', label: 'RELATIONS' }, { id: 'communications', label: 'COMMUNICATIONS' }, { id: 'documents', label: 'DOCUMENTS' }];
}

export function serviceMenu() {
  return Object.entries(serviceTaxonomyRelations).map(([service, relation]) => ({
    id: service,
    label: service,
    children: relation.macros.map((macro) => ({
      id: `${service}-${macro}`,
      label: macro,
      children: relation.categories[macro as keyof typeof relation.categories]?.map((category) => ({
        id: `${service}-${macro}-${category}`,
        label: category,
        children: relation.objects[category as keyof typeof relation.objects]?.map((object) => ({
          id: `${service}-${macro}-${category}-${object}`,
          label: object,
          children: relation.actions[object as keyof typeof relation.actions]?.map((action) => ({ id: `${service}-${macro}-${category}-${object}-${action}`, label: action })),
        })),
      })),
    })),
  }));
}
