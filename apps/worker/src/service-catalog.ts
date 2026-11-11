export type ServiceCatalogSeed = { service_type: 'MAINTENANCE' | 'HOUSEKEEPING'; macro: string; category: string; object: string; actions: string[] };

export const SERVICE_CATALOG_SEED: ServiceCatalogSeed[] = [
  // Maintenance — Ordinary
  ...[
    ['PLUMBING', [['FAUCET',['FIX LEAK','REPAIR','REPLACE']],['SINK',['UNCLOG','RESEAL','REPAIR']],['TOILET',['FIX FLUSH','FIX LEAK','UNCLOG']],['SHOWER',['FIX LEAK','REPLACE HOSE','RESEAL']],['BIDET',['FIX LEAK','REPLACE HOSE']],['DRAIN',['UNCLOG','CLEAN']],['WATER HEATER',['INSPECT','REPAIR','SERVICE']]]],
    ['ELECTRICAL', [['LIGHT',['REPLACE BULB','REPAIR','FIX FLICKERING']],['SOCKET',['REPAIR','REPLACE']],['SWITCH',['REPAIR','REPLACE']],['CIRCUIT',['INSPECT','TROUBLESHOOT']],['WIRING',['REPAIR','SECURE']]]],
    ['AIRCON & APPLIANCES', [['AIRCON',['CLEAN FILTER','SERVICE','REPAIR','FIX LEAK']],['FRIDGE',['INSPECT','REPAIR','DEFROST']],['MICROWAVE',['INSPECT','REPAIR']],['COOKER',['INSPECT','REPAIR']],['REMOTE CONTROL',['REPLACE BATTERY','REPAIR','REPLACE']]]],
    ['FURNITURE & FIXTURES', [['BED',['TIGHTEN','REPAIR']],['WARDROBE',['ADJUST DOOR','REPAIR HINGE']],['TABLE',['TIGHTEN','REPAIR']],['CHAIR',['TIGHTEN','REPAIR']],['CURTAINS',['FIX RAIL','REPLACE HOOK']],['DOOR',['ADJUST','REPAIR LOCK']],['WINDOW',['ADJUST','REPAIR SEAL']]]],
    ['SURFACES & FINISHES', [['WALL',['PATCH CRACK','TOUCH UP PAINT']],['CEILING',['PATCH','REPAIR']],['FLOOR',['REPAIR','RESEAL']],['TILES',['REPLACE DAMAGED TILE','REPAIR GROUT']],['SILICONE',['REMOVE MOLD','RESEAL']]]],
    ['PEST & SAFETY', [['PEST CONTROL',['INSPECT','TREAT']],['SMOKE DETECTOR',['TEST','REPLACE BATTERY']],['DOOR LOCK',['REPAIR','REKEY']],['WATER DAMAGE',['INSPECT','DRY','REPAIR']]]],
  ].flatMap(([macro, objects]) => (objects as [string, string[]][]).map(([object, actions]) => ({ service_type:'MAINTENANCE' as const, macro:'ORDINARY', category:macro as string, object, actions }))),
  // Maintenance — Extraordinary
  ...[
    ['CARPENTRY & FURNITURE', [['BED FRAME',['DESIGN','BUILD','INSTALL']],['TABLE',['DESIGN','BUILD','INSTALL']],['DESK',['DESIGN','BUILD','INSTALL']],['WARDROBE',['DESIGN','BUILD','INSTALL']],['CABINET',['DESIGN','BUILD','INSTALL']],['SHELVING',['DESIGN','BUILD','INSTALL']]]],
    ['WALLS & CEILINGS', [['PARTITION WALL',['BUILD','MODIFY','REMOVE']],['WALL FINISHING',['PLASTER','SKIM COAT','TEXTURE']],['PAINTING',['PRIME','REPAINT','DECORATIVE FINISH']],['WALLPAPER',['INSTALL','REPLACE']],['CEILING',['BUILD','REPLACE','FINISH']],['WALL PANEL',['FABRICATE','INSTALL']]]],
    ['FLOORING & TILING', [['VINYL FLOOR',['PREPARE SUBFLOOR','INSTALL','REPLACE']],['TILE FLOOR',['INSTALL','REPLACE']],['CEMENT FLOOR',['SCREED','POLISH','SEAL']],['BASEBOARD',['FABRICATE','INSTALL']],['WATERPROOFING',['APPLY','RENEW']]]],
    ['KITCHEN & BATHROOM', [['KITCHEN CABINET',['FABRICATE','INSTALL']],['COUNTERTOP',['FABRICATE','INSTALL']],['SINK',['INSTALL','RELOCATE']],['SHOWER ENCLOSURE',['FABRICATE','INSTALL']],['VANITY',['FABRICATE','INSTALL']],['PLUMBING LAYOUT',['MODIFY','RELOCATE']]]],
    ['ELECTRICAL & CLIMATE', [['NEW CIRCUIT',['PLAN','INSTALL']],['SOCKET LOCATION',['ADD','RELOCATE']],['LIGHTING SYSTEM',['DESIGN','INSTALL']],['AC UNIT',['INSTALL','RELOCATE']],['CABLE RACEWAY',['INSTALL','EXTEND']],['VENTILATION',['INSTALL','UPGRADE']]]],
    ['DOORS WINDOWS & BALCONY', [['DOOR',['FABRICATE','INSTALL','REPLACE']],['WINDOW',['INSTALL','REPLACE']],['BALCONY FINISH',['REFINISH','REPLACE']],['GLASS PANEL',['FABRICATE','INSTALL']],['CURTAIN SYSTEM',['INSTALL','UPGRADE']]]],
  ].flatMap(([macro, objects]) => (objects as [string, string[]][]).map(([object, actions]) => ({ service_type:'MAINTENANCE' as const, macro:'EXTRAORDINARY', category:macro as string, object, actions }))),
  // Housekeeping — Regular
  ...[
    ['BED & LINEN', [['BED',['MAKE BED','CHANGE LINEN','REPLACE PILLOWCASES']],['TOWELS',['REPLACE','FOLD','ARRANGE']],['BED RUNNER',['ARRANGE','REMOVE']]]],
    ['BATHROOM', [['TOILET',['CLEAN','SANITIZE']],['SINK',['CLEAN','POLISH']],['SHOWER',['CLEAN GLASS','RINSE','DRY']],['MIRROR',['CLEAN','POLISH']]]],
    ['KITCHEN', [['COUNTERTOP',['CLEAN','SANITIZE']],['SINK',['CLEAN','POLISH']],['FRIDGE',['CLEAN EXTERIOR','CLEAN INTERIOR']],['MICROWAVE',['CLEAN INTERIOR','CLEAN EXTERIOR']]]],
    ['LIVING AREA', [['FLOOR',['SWEEP','MOP']],['DESK',['WIPE','SANITIZE']],['WARDROBE',['DUST','WIPE']],['WINDOW',['CLEAN GLASS','WIPE FRAME']]]],
    ['BALCONY', [['FLOOR',['SWEEP','MOP']],['RAILING',['WIPE','CLEAN GLASS']],['DRAIN',['REMOVE DEBRIS','CLEAN']]]],
    ['FINAL CHECK', [['ROOM',['INSPECT','VENTILATE']],['LIGHTS',['CHECK','TURN OFF']],['AIRCON',['CHECK','TURN OFF']],['DOOR',['LOCK','CHECK']]]],
  ].flatMap(([macro, objects]) => (objects as [string, string[]][]).map(([object, actions]) => ({ service_type:'HOUSEKEEPING' as const, macro:'REGULAR', category:macro as string, object, actions }))),
  // Housekeeping — Deep Cleaning
  ...[
    ['BATHROOM', [['SHOWER GLASS',['REMOVE SCALE','DEEP CLEAN']],['GROUT',['SCRUB','REMOVE MOLD']],['TOILET',['DESCALING','DEEP SANITIZE']],['DRAIN',['DEEP CLEAN','REMOVE BUILDUP']]]],
    ['KITCHEN', [['FRIDGE',['DEFROST','DEEP CLEAN']],['MICROWAVE',['DEGREASE','DEEP CLEAN']],['CABINETS',['EMPTY & CLEAN','DEGREASE']],['COOKER',['DEGREASE','DEEP CLEAN']]]],
    ['FLOORS & SURFACES', [['VINYL FLOOR',['DEEP CLEAN','REMOVE RESIDUE']],['CEMENT FLOOR',['DEEP CLEAN','POLISH']],['WALL',['REMOVE STAINS','WASH']],['CEILING',['REMOVE DUST','CLEAN']]]],
    ['FABRICS & FURNITURE', [['MATTRESS',['VACUUM','SPOT CLEAN','SANITIZE']],['SOFA',['VACUUM','SHAMPOO']],['CURTAINS',['WASH','STEAM']],['UPHOLSTERY',['SHAMPOO','SANITIZE']]]],
    ['WINDOWS & BALCONY', [['WINDOW GLASS',['DEEP CLEAN','REMOVE MINERAL DEPOSITS']],['WINDOW TRACK',['VACUUM','SCRUB']],['BALCONY FLOOR',['SCRUB','REMOVE STAINS']],['RAILING',['DEEP CLEAN','POLISH']]]],
    ['PEST & ODOR', [['ROOM ODOR',['DEODORIZE','TREAT']],['MOLD',['REMOVE','SANITIZE']],['PEST RESIDUE',['REMOVE','SANITIZE']]]],
  ].flatMap(([macro, objects]) => (objects as [string, string[]][]).map(([object, actions]) => ({ service_type:'HOUSEKEEPING' as const, macro:'DEEP CLEANING', category:macro as string, object, actions }))),
];

export const catalogKey = (label: string) => label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const catalogId = (service: string, level: string, parent: string | null, label: string) => `${service.toLowerCase()}-${level.toLowerCase()}-${parent ? `${parent}-` : ''}${catalogKey(label)}`;

export function expandedCatalog() {
  const nodes: Array<{ id:string; service_type:'MAINTENANCE'|'HOUSEKEEPING'; level:'MACRO'|'CATEGORY'|'OBJECT'|'ACTION'; parent_id:string|null; node_key:string; label:string }> = [];
  for (const branch of SERVICE_CATALOG_SEED) {
    const macroKey = catalogKey(branch.macro); const macroId = catalogId(branch.service_type,'MACRO',null,branch.macro);
    const categoryId = catalogId(branch.service_type,'CATEGORY',macroKey,branch.category);
    nodes.push({id:macroId,service_type:branch.service_type,level:'MACRO',parent_id:null,node_key:macroKey,label:branch.macro});
    nodes.push({id:categoryId,service_type:branch.service_type,level:'CATEGORY',parent_id:macroId,node_key:catalogKey(branch.category),label:branch.category});
    const objectId = catalogId(branch.service_type,'OBJECT',`${macroKey}-${catalogKey(branch.category)}`,branch.object);
    nodes.push({id:objectId,service_type:branch.service_type,level:'OBJECT',parent_id:categoryId,node_key:catalogKey(branch.object),label:branch.object});
    for (const action of branch.actions) nodes.push({id:catalogId(branch.service_type,'ACTION',`${macroKey}-${catalogKey(branch.category)}-${catalogKey(branch.object)}`,action),service_type:branch.service_type,level:'ACTION',parent_id:objectId,node_key:catalogKey(action),label:action});
  }
  return nodes.filter((node, index, all) => all.findIndex(other => other.id === node.id) === index);
}
