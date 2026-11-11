import { describe, expect, it } from 'vitest';
import { createInventoryAsset, createInventoryNode, getInventoryTree, updateInventoryAsset, updateInventoryNode } from '../../apps/worker/src/inventory';
import { inventoryAssetCreateSchema, inventoryNodeCreateSchema } from '../../packages/contracts/src';

const repoFactory = () => {
  const nodes: Record<string, unknown>[] = []; const assets: Record<string, unknown>[] = []; const runs: { sql: string; args: unknown[] }[] = []; const audits: unknown[][] = [];
  const repo = {
    nodes, assets, runs, audits,
    first: async (sql: string, ...args: unknown[]) => {
      if (sql.includes('FROM units')) return { id: 'BR·07' };
      if (sql.includes('FROM inventory_nodes WHERE id=?')) return nodes.find(node => node.id === String(args[0])) ?? null;
      if (sql.includes('FROM inventory_assets WHERE id=?')) return assets.find(asset => asset.id === String(args[0])) ?? null;
      if (sql.includes('inventory_assets a JOIN inventory_nodes')) return { id: String(args[0]), unit_id: 'BR·07' };
      if (sql.includes('SELECT id FROM inventory_nodes WHERE parent_id')) return null;
      if (sql.includes('SELECT a.id FROM inventory_assets')) return null;
      return null;
    },
    all: async (sql: string, ...args: unknown[]) => { if (sql.includes('FROM inventory_nodes WHERE unit_id')) return nodes.filter(node => node.unit_id === args[0]); if (sql.includes('FROM inventory_assets a JOIN')) return assets; if (sql.includes('FROM maintenance_issues')) return []; return []; },
    run: async (sql: string, ...args: unknown[]) => { runs.push({ sql, args }); if (sql.startsWith('INSERT INTO inventory_nodes')) nodes.push({ id: args[0], unit_id: args[1], parent_id: args[2], node_type: args[3], name: args[4], active: 1 }); if (sql.startsWith('INSERT INTO inventory_assets')) assets.push({ id: args[0], node_id: args[1], name: args[2], condition: args[8], status: args[9], retired_at: null }); if (sql.startsWith('UPDATE inventory_assets')) { const asset = assets.find(item => item.id === args[args.length - 1]); if (asset) asset.status = args[7]; } },
    audit: async (...args: unknown[]) => { audits.push(args); },
  };
  return repo;
};

describe('V2.5 inventory tree', () => {
  it('allows minimal nodes and assets with optional metadata', () => {
    expect(inventoryNodeCreateSchema.safeParse({ unit_id: 'BR·07', node_type: 'LOCATION', name: 'Kitchen' }).success).toBe(true);
    expect(inventoryAssetCreateSchema.safeParse({ node_id: 'node-1', name: 'Microwave' }).success).toBe(true);
  });

  it('creates nested nodes and a physical asset owned by the Room', async () => {
    const repo = repoFactory();
    const root = await createInventoryNode(repo as never, { unit_id: 'BR·07', node_type: 'LOCATION', name: 'Kitchen' }, 'owner') as Record<string, unknown>;
    const category = await createInventoryNode(repo as never, { unit_id: 'BR·07', parent_id: root.id, node_type: 'CATEGORY', name: 'Appliances' }, 'owner') as Record<string, unknown>;
    const asset = await createInventoryAsset(repo as never, { node_id: category.id, name: 'Microwave', condition: 'GOOD' }, 'owner') as Record<string, unknown>;
    expect(root.unit_id).toBe('BR·07'); expect(category.parent_id).toBe(root.id); expect(asset.name).toBe('Microwave'); expect(repo.audits).toHaveLength(3);
    const tree = await getInventoryTree(repo as never, 'BR·07'); expect(tree.nodes).toHaveLength(2); expect(tree.assets).toHaveLength(1);
  });

  it('prevents cycles and preserves retirement history', async () => {
    const repo = repoFactory();
    const root = await createInventoryNode(repo as never, { unit_id: 'BR·07', node_type: 'LOCATION', name: 'Bedroom' }, 'owner') as Record<string, unknown>;
    const child = await createInventoryNode(repo as never, { unit_id: 'BR·07', parent_id: root.id, node_type: 'CATEGORY', name: 'Electronics' }, 'owner') as Record<string, unknown>;
    await expect(updateInventoryNode(repo as never, String(root.id), { parent_id: child.id }, 'owner')).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    const asset = await createInventoryAsset(repo as never, { node_id: child.id, name: 'TV', condition: 'FAIR' }, 'owner') as Record<string, unknown>;
    await updateInventoryAsset(repo as never, String(asset.id), { status: 'RETIRED' }, 'owner');
    expect(repo.audits.at(-1)?.[0]).toBe('UPDATE');
  });
});
