import { describe, expect, it } from 'vitest';
import { CHANGELOG_ENTRIES, type ChangelogItemType } from './changelog';

const itemTypeOrder: Record<ChangelogItemType, number> = {
  new: 0,
  improved: 1,
  fixed: 2
};

describe('CHANGELOG_ENTRIES', () => {
  it('keeps entries unique and ordered from newest to oldest', () => {
    const ids = CHANGELOG_ENTRIES.map(entry => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      [...ids].sort((left, right) => right.localeCompare(left))
    );
  });

  it('orders every entry as new, improved, then fixed', () => {
    for (const entry of CHANGELOG_ENTRIES) {
      const order = entry.items.map(item => itemTypeOrder[item.type]);
      expect(order, `${entry.id} öğe sıralaması`).toEqual(
        [...order].sort((left, right) => left - right)
      );
    }
  });
});
