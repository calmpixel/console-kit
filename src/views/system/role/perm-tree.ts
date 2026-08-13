import type { TreeOption } from 'naive-ui';
import type { CatalogPerm } from '@/service/api';

const SCOPE_LABELS: Record<string, string> = {
  platform: '平台'
};

const RESOURCE_LABELS: Record<string, string> = {
  dashboard: '总览',
  logs: '日志',
  role: '角色',
  user: '用户',
  menu: '菜单',
  settings: '设置',
  backup: '备份'
};

function segmentLabel(seg: string, isRoot: boolean): string {
  if (isRoot) return SCOPE_LABELS[seg] || seg;
  return RESOURCE_LABELS[seg] || seg;
}

type TrieNode = {
  segment: string;
  children: Map<string, TrieNode>;
  /** leaf permission when this path is a full code */
  perm?: CatalogPerm;
};

/**
 * Build a checkable Naive tree from dotted permission codes.
 * Group nodes use synthetic keys `g:...`; leaf keys are real permission codes.
 */
export function buildPermissionTree(catalog: CatalogPerm[]): TreeOption[] {
  const root: TrieNode = { segment: '', children: new Map() };

  for (const p of catalog) {
    const parts = p.code.split('.').filter(Boolean);
    if (!parts.length) continue;
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i];
      let next = cur.children.get(seg);
      if (!next) {
        next = { segment: seg, children: new Map() };
        cur.children.set(seg, next);
      }
      cur = next;
      if (i === parts.length - 1) {
        cur.perm = p;
      }
    }
  }

  const toOptions = (node: TrieNode, path: string[]): TreeOption[] => {
    const out: TreeOption[] = [];
    const entries = [...node.children.entries()].sort(([a], [b]) => a.localeCompare(b));
    for (const [seg, child] of entries) {
      const nextPath = [...path, seg];
      const kids = toOptions(child, nextPath);
      if (child.perm && kids.length === 0) {
        out.push({
          key: child.perm.code,
          label: `${child.perm.name} (${child.perm.code})`,
          isLeaf: true
        });
        continue;
      }
      const groupKey = `g:${nextPath.join('.')}`;
      const scopeLabel = segmentLabel(seg, path.length === 0);
      if (child.perm && kids.length > 0) {
        out.push({
          key: groupKey,
          label: scopeLabel,
          children: [
            {
              key: child.perm.code,
              label: `${child.perm.name} (${child.perm.code})`,
              isLeaf: true
            },
            ...kids
          ]
        });
      } else if (kids.length > 0) {
        out.push({
          key: groupKey,
          label: scopeLabel,
          children: kids
        });
      } else if (child.perm) {
        out.push({
          key: child.perm.code,
          label: `${child.perm.name} (${child.perm.code})`,
          isLeaf: true
        });
      }
    }
    return out;
  };

  return toOptions(root, []);
}

/** Keep only real permission codes (drop synthetic group keys). */
export function leafPermissionKeys(keys: Array<string | number>, catalog: CatalogPerm[]): string[] {
  const allowed = new Set(catalog.map(p => p.code));
  return keys.map(String).filter(k => allowed.has(k));
}

export function allPermissionCodes(catalog: CatalogPerm[]): string[] {
  return catalog.map(p => p.code);
}
