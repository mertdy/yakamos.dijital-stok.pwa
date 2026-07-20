import { describe, expect, it } from 'vitest';
import {
  SALES_HISTORY_PAGE_SIZE,
  getPageItems
} from './salesHistoryPagination';

describe('SalesHistoryList pagination', () => {
  it('shows 25 sales per page', () => {
    expect(SALES_HISTORY_PAGE_SIZE).toBe(25);
  });

  it('keeps the first and last page visible for long page ranges', () => {
    expect(getPageItems(8, 4)).toEqual([1, 'ellipsis', 3, 4, 5, 'ellipsis', 8]);
  });
});
