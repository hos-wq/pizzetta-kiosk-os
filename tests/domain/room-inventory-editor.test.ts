import { describe, expect, it } from 'vitest';
import { buildCanonicalInventory, normalizeInventoryState } from '../../apps/worker/src/room-inventory';

const nodes = [
  { id:'macro', scope_unit_id:null, parent_id:null, level:'MACRO' as const, name:'Kitchen', is_air_conditioner:0, sort_order:1, active:1 },
  { id:'category', scope_unit_id:null, parent_id:'macro', level:'CATEGORY' as const, name:'Appliances', is_air_conditioner:0, sort_order:1, active:1 },
  { id:'ac', scope_unit_id:null, parent_id:'category', level:'ITEM' as const, name:'Air Conditioner', is_air_conditioner:1, sort_order:1, active:1 },
  { id:'microwave', scope_unit_id:null, parent_id:'category', level:'ITEM' as const, name:'Microwave', is_air_conditioner:0, sort_order:2, active:1 },
];

describe('room inventory editor', () => {
  it('keeps unknown explicit and normalizes absent quantities', () => {
    expect(normalizeInventoryState({ present:'UNKNOWN', quantity:7 }, false)).toEqual({ present:'UNKNOWN', quantity:null, inverter:null, hp:null, item_type:null, screen_inches:null, bed_size:null });
    expect(normalizeInventoryState({ present:'FALSE', quantity:7 }, false)).toEqual({ present:'FALSE', quantity:null, inverter:null, hp:null, item_type:null, screen_inches:null, bed_size:null });
    expect(normalizeInventoryState({ present:'TRUE', quantity:2 }, false)).toEqual({ present:'TRUE', quantity:2, inverter:null, hp:null, item_type:null, screen_inches:null, bed_size:null });
  });

  it('keeps AC-only attributes scoped to the AC item', () => {
    expect(normalizeInventoryState({ present:'TRUE', quantity:1, inverter:'TRUE', hp:1.5 }, true)).toEqual({ present:'TRUE', quantity:1, inverter:'TRUE', hp:1.5, item_type:null, screen_inches:null, bed_size:null });
    expect(normalizeInventoryState({ present:'TRUE', quantity:1, inverter:'TRUE', hp:1.5 }, false).inverter).toBeNull();
  });

  it('produces deterministic hierarchical canonical data with defaults', () => {
    const first = buildCanonicalInventory('BR·07', nodes, [{ catalog_item_id:'ac', present:'TRUE', quantity:1, inverter:'UNKNOWN', hp:null }]);
    const second = buildCanonicalInventory('BR·07', [...nodes].reverse(), [{ catalog_item_id:'ac', present:'TRUE', quantity:1, inverter:'UNKNOWN', hp:null }]);
    expect(first).toEqual(second);
    expect(first.macros[0].categories[0].items).toEqual([
      { id:'ac', name:'Air Conditioner', present:'TRUE', quantity:1, item_type:null, inverter:'UNKNOWN', hp:null },
      { id:'microwave', name:'Microwave', present:'UNKNOWN', quantity:null },
    ]);
  });
});
