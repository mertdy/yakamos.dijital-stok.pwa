export const SALES_HISTORY_PAGE_SIZE = 25;

export const getPageItems = (pageCount: number, currentPage: number) => {
  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages: Array<number | 'ellipsis'> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(pageCount - 1, currentPage + 1);

  if (start > 2) pages.push('ellipsis');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < pageCount - 1) pages.push('ellipsis');
  pages.push(pageCount);

  return pages;
};
