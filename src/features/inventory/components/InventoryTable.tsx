import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { clsx } from 'clsx';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  getSortedRowModel,
  type PaginationState,
  type SortingState
} from '@tanstack/react-table';
import {
  useInventoryStore,
  type InventoryItem
} from '../store/useInventoryStore';
import {
  Edit,
  Trash2,
  Package,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Printer,
  X,
  Copy
} from 'lucide-react';
import {
  Button,
  Checkbox,
  Description,
  Pagination,
  Tooltip,
  toast
} from '@heroui/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '@/core/config/routes';
import { useGlobalBarcodeScanner } from '@/shared/hooks/useGlobalBarcodeScanner';
import { useConfirm } from '@/shared/contexts/ConfirmDialogContext';
import { useAuthStore } from '@/features/auth';
import { createInternalBarcode } from '../domain/labelPrinting';
import { playBarcodeFeedback } from '@/shared/utils/barcodeFeedback';
import { normalizeSearchText } from '@/shared/utils/searchText';
import { copyToClipboard } from '@/shared/utils/clipboard';
import { isLowStock } from '../domain/stockRules';
import { isItemActive, isStockTracked } from '../store/useInventoryStore';
import {
  InventoryFilters,
  type InventoryFilterValues
} from './InventoryFilters';

const LabelPrintModal = lazy(() =>
  import('./LabelPrintModal').then(module => ({
    default: module.LabelPrintModal
  }))
);

interface InventoryTableProps {
  initialPrintItemId?: string | null;
}

const INVENTORY_PAGE_SIZE = 25;
const INVENTORY_FILTER_PARAM_KEYS = [
  'q',
  'category',
  'unit',
  'stockStatus',
  'activeStatus',
  'stockTracking',
  'barcodeStatus',
  'imageStatus',
  'minStock',
  'maxStock',
  'minPrice',
  'maxPrice',
  'updatedAfter',
  'updatedBefore'
] as const;

const numberParam = (value: string | null) =>
  value && !Number.isNaN(Number(value)) ? Number(value) : undefined;

const filtersFromSearchParams = (
  searchParams: URLSearchParams
): InventoryFilterValues => ({
  searchQuery: searchParams.get('q') || undefined,
  categoryId: searchParams.get('category') || undefined,
  unit:
    (searchParams.get('unit') as InventoryFilterValues['unit']) || undefined,
  stockStatus:
    (searchParams.get('stockStatus') as InventoryFilterValues['stockStatus']) ||
    undefined,
  activeStatus:
    (searchParams.get(
      'activeStatus'
    ) as InventoryFilterValues['activeStatus']) || undefined,
  stockTracking:
    (searchParams.get(
      'stockTracking'
    ) as InventoryFilterValues['stockTracking']) || undefined,
  barcodeStatus:
    (searchParams.get(
      'barcodeStatus'
    ) as InventoryFilterValues['barcodeStatus']) || undefined,
  imageStatus:
    (searchParams.get('imageStatus') as InventoryFilterValues['imageStatus']) ||
    undefined,
  minStock: numberParam(searchParams.get('minStock')),
  maxStock: numberParam(searchParams.get('maxStock')),
  minPrice: numberParam(searchParams.get('minPrice')),
  maxPrice: numberParam(searchParams.get('maxPrice')),
  updatedAfter: searchParams.get('updatedAfter') || undefined,
  updatedBefore: searchParams.get('updatedBefore') || undefined
});

const getPageItems = (pageCount: number, currentPage: number) => {
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

export const InventoryTable: React.FC<InventoryTableProps> = ({
  initialPrintItemId = null
}) => {
  const { items, isLoading, deleteItem, deleteItems, updateItem } =
    useInventoryStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filters, setFilters] = useState<InventoryFilterValues>(() =>
    filtersFromSearchParams(searchParams)
  );
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: INVENTORY_PAGE_SIZE
  });
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [isLabelPrintOpen, setIsLabelPrintOpen] = useState(false);
  const [labelItems, setLabelItems] = useState<InventoryItem[]>([]);
  const handledInitialPrintId = useRef<string | null>(null);
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  const handleFiltersChange = useCallback(
    (nextFilters: InventoryFilterValues) => {
      setFilters(nextFilters);
      setPagination(current => ({ ...current, pageIndex: 0 }));

      const nextSearchParams = new URLSearchParams(searchParams);
      INVENTORY_FILTER_PARAM_KEYS.forEach(key => nextSearchParams.delete(key));
      const filterParams: Record<string, string | undefined> = {
        q: nextFilters.searchQuery,
        category: nextFilters.categoryId,
        unit: nextFilters.unit,
        stockStatus: nextFilters.stockStatus,
        activeStatus: nextFilters.activeStatus,
        stockTracking: nextFilters.stockTracking,
        barcodeStatus: nextFilters.barcodeStatus,
        imageStatus: nextFilters.imageStatus,
        minStock: nextFilters.minStock?.toString(),
        maxStock: nextFilters.maxStock?.toString(),
        minPrice: nextFilters.minPrice?.toString(),
        maxPrice: nextFilters.maxPrice?.toString(),
        updatedAfter: nextFilters.updatedAfter,
        updatedBefore: nextFilters.updatedBefore
      };
      Object.entries(filterParams).forEach(([key, filterValue]) => {
        if (filterValue) nextSearchParams.set(key, filterValue);
      });
      setSearchParams(nextSearchParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  useGlobalBarcodeScanner({
    onScan: barcode => {
      const item = useInventoryStore
        .getState()
        .items.find(i => String(i.barcode) === barcode);
      if (item) {
        playBarcodeFeedback();
        handleFiltersChange({ ...filters, searchQuery: barcode });
        toast.success(`Ürün bulundu: ${item.name}`);
      } else {
        toast(`${barcode} sistemde kayıtlı değil`, {
          variant: 'danger',
          actionProps: {
            children: 'Yeni Ürün Ekle',
            onPress: () => {
              navigate(ROUTES.INVENTORY.NEW_WITH_BARCODE(barcode));
            }
          }
        });
      }
    }
  });

  const { activeMembership, activeCompany } = useAuthStore();
  const isOwner = activeMembership?.role === 'OWNER';
  const hasInventoryPermission =
    isOwner || activeMembership?.permissions.includes('MANAGE_INVENTORY');

  const openLabelPrint = useCallback(
    async (selectedItems: InventoryItem[]) => {
      const itemsWithBarcodes = await Promise.all(
        selectedItems.map(async item => {
          if (item.barcode) return item;
          const barcode = createInternalBarcode(item);
          await updateItem(item.id, { barcode });
          return { ...item, barcode };
        })
      );
      setLabelItems(itemsWithBarcodes);
      setIsLabelPrintOpen(true);
    },
    [updateItem]
  );

  useEffect(() => {
    if (
      !initialPrintItemId ||
      !hasInventoryPermission ||
      handledInitialPrintId.current === initialPrintItemId
    )
      return;
    const item = items.find(candidate => candidate.id === initialPrintItemId);
    if (item) {
      handledInitialPrintId.current = initialPrintItemId;
      void openLabelPrint([item]);
    }
  }, [hasInventoryPermission, initialPrintItemId, items, openLabelPrint]);

  const columnHelper = createColumnHelper<InventoryItem>();

  const columns = useMemo(() => {
    const cols = [];

    if (hasInventoryPermission) {
      cols.push(
        columnHelper.display({
          id: 'selection',
          header: ({ table }) => (
            <Checkbox
              isSelected={table.getIsAllPageRowsSelected()}
              isIndeterminate={
                !table.getIsAllPageRowsSelected() &&
                table.getIsSomePageRowsSelected()
              }
              onChange={(val: boolean) => table.toggleAllPageRowsSelected(val)}
              aria-label="Tümünü seç">
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
              </Checkbox.Content>
            </Checkbox>
          ),
          cell: ({ row }) => (
            <Checkbox
              isSelected={row.getIsSelected()}
              onChange={(val: boolean) => row.toggleSelected(val)}
              aria-label={`${row.original.name} seç`}>
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
              </Checkbox.Content>
            </Checkbox>
          )
        })
      );
    }

    cols.push(
      columnHelper.accessor('name', {
        header: 'Ürün Adı',
        cell: info => (
          <span className="font-medium text-gray-900">{info.getValue()}</span>
        )
      }),
      columnHelper.accessor('barcode', {
        header: 'Barkod',
        cell: info => {
          const barcode = info.getValue();
          return barcode ? (
            <div
              className="flex items-center gap-1 text-gray-500"
              onClick={event => event.stopPropagation()}>
              <span>{barcode}</span>
              <button
                type="button"
                className="hover:text-primary focus-visible:ring-primary/40 inline-flex size-7 items-center justify-center rounded-md bg-transparent text-gray-400 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                aria-label={`${barcode} barkodunu kopyala`}
                onClick={() =>
                  void copyToClipboard(barcode, 'Barkod kopyalandı.')
                }>
                <Copy size={15} />
              </button>
            </div>
          ) : (
            <span className="text-gray-500">-</span>
          );
        }
      }),
      columnHelper.accessor('stock', {
        header: 'Stok',
        cell: info => {
          const val = info.getValue();
          return (
            <span
              className={clsx(
                'rounded-full px-2 py-1 text-xs font-bold',
                val < 10
                  ? 'bg-danger/10 text-danger'
                  : 'bg-success/10 text-success'
              )}>
              {val}
            </span>
          );
        }
      }),
      columnHelper.accessor('price', {
        header: 'Satış Fiyatı',
        cell: info => (
          <span>
            ₺{(info.row.original.salePrice ?? info.getValue() ?? 0).toFixed(2)}
          </span>
        )
      })
    );

    if (hasInventoryPermission) {
      cols.push(
        columnHelper.display({
          id: 'actions',
          header: 'İşlemler',
          cell: props => (
            <div className="flex gap-2">
              <Tooltip>
                <Tooltip.Trigger>
                  <Button
                    variant="tertiary"
                    isIconOnly
                    onPress={() =>
                      navigate(ROUTES.INVENTORY.EDIT(props.row.original.id))
                    }
                    aria-label="Düzenle">
                    <Edit className="text-lg" />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content showArrow>
                  <Tooltip.Arrow />
                  Düzenle
                </Tooltip.Content>
              </Tooltip>
              <Tooltip>
                <Tooltip.Trigger>
                  <Button
                    variant="tertiary"
                    isIconOnly
                    onPress={() => void openLabelPrint([props.row.original])}
                    aria-label="Etiket Bas">
                    <Printer className="text-lg" />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content showArrow>
                  <Tooltip.Arrow />
                  Etiket bas
                </Tooltip.Content>
              </Tooltip>
              <Tooltip>
                <Tooltip.Trigger>
                  <Button
                    variant="ghost"
                    isIconOnly
                    className="text-danger"
                    onPress={async () => {
                      const confirmed = await confirm({
                        title: 'Ürünü Sil',
                        description:
                          'Bu ürünü silmek istediğinize emin misiniz?',
                        confirmText: 'Sil',
                        variant: 'danger'
                      });
                      if (confirmed) {
                        deleteItem(props.row.original.id);
                      }
                    }}
                    aria-label="Sil">
                    <Trash2 className="text-lg" />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content showArrow>
                  <Tooltip.Arrow />
                  Sil
                </Tooltip.Content>
              </Tooltip>
            </div>
          )
        })
      );
    }

    return cols;
  }, [
    hasInventoryPermission,
    columnHelper,
    navigate,
    confirm,
    deleteItem,
    openLabelPrint
  ]);

  const filteredItems = useMemo(() => {
    const searchTerm = filters.searchQuery ?? '';
    const normalizedSearchTerm = normalizeSearchText(searchTerm);

    return items.filter(item => {
      const salePrice = item.salePrice ?? item.price ?? 0;
      const updatedAt = item.updatedAt ? new Date(item.updatedAt) : null;
      const matchesSearch =
        item.name.includes(searchTerm) ||
        normalizeSearchText(item.name).includes(normalizedSearchTerm) ||
        Boolean(item.barcode?.includes(searchTerm));
      const matchesStockStatus =
        !filters.stockStatus ||
        (filters.stockStatus === 'out' &&
          isStockTracked(item) &&
          item.stock === 0) ||
        (filters.stockStatus === 'low' &&
          item.stock > 0 &&
          isLowStock(item, activeCompany)) ||
        (filters.stockStatus === 'available' &&
          isStockTracked(item) &&
          item.stock > 0 &&
          !isLowStock(item, activeCompany)) ||
        (filters.stockStatus === 'negative' &&
          isStockTracked(item) &&
          item.stock < 0);

      return (
        matchesSearch &&
        (!filters.categoryId || item.categoryId === filters.categoryId) &&
        (!filters.unit || item.unit === filters.unit) &&
        matchesStockStatus &&
        (!filters.activeStatus ||
          (filters.activeStatus === 'active'
            ? isItemActive(item)
            : !isItemActive(item))) &&
        (!filters.stockTracking ||
          (filters.stockTracking === 'tracked'
            ? isStockTracked(item)
            : !isStockTracked(item))) &&
        (!filters.barcodeStatus ||
          (filters.barcodeStatus === 'hasBarcode'
            ? Boolean(item.barcode)
            : !item.barcode)) &&
        (!filters.imageStatus ||
          (filters.imageStatus === 'hasImage'
            ? Boolean(item.imageUrl)
            : !item.imageUrl)) &&
        (filters.minStock === undefined || item.stock >= filters.minStock) &&
        (filters.maxStock === undefined || item.stock <= filters.maxStock) &&
        (filters.minPrice === undefined || salePrice >= filters.minPrice) &&
        (filters.maxPrice === undefined || salePrice <= filters.maxPrice) &&
        (!filters.updatedAfter ||
          Boolean(updatedAt && updatedAt >= new Date(filters.updatedAfter))) &&
        (!filters.updatedBefore ||
          Boolean(
            updatedAt &&
            updatedAt <= new Date(`${filters.updatedBefore}T23:59:59`)
          ))
      );
    });
  }, [activeCompany, filters, items]);

  const selectedIds = useMemo(() => {
    return Object.keys(rowSelection).filter(id => rowSelection[id]);
  }, [rowSelection]);

  useEffect(() => {
    const lastPageIndex = Math.max(
      0,
      Math.ceil(filteredItems.length / INVENTORY_PAGE_SIZE) - 1
    );

    setPagination(current =>
      current.pageIndex > lastPageIndex
        ? { ...current, pageIndex: lastPageIndex }
        : current
    );
  }, [filteredItems.length]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: filteredItems,
    columns,
    state: { sorting, pagination, rowSelection },
    onSortingChange: updater => {
      setSorting(current =>
        typeof updater === 'function' ? updater(current) : updater
      );
      setPagination(current => ({ ...current, pageIndex: 0 }));
    },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    getRowId: row => row.id
  });

  const currentPage = pagination.pageIndex + 1;
  const pageCount = table.getPageCount();
  const pageStart = filteredItems.length
    ? pagination.pageIndex * INVENTORY_PAGE_SIZE + 1
    : 0;
  const pageEnd = Math.min(
    (pagination.pageIndex + 1) * INVENTORY_PAGE_SIZE,
    filteredItems.length
  );
  const pageItems = useMemo(
    () => getPageItems(pageCount, currentPage),
    [currentPage, pageCount]
  );

  const isInitialLoading = isLoading && items.length === 0;

  if (items.length === 0 && !isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[28px] border-none bg-white py-24 text-gray-400 shadow-sm">
        <Package className="mb-4 text-6xl opacity-30" />
        <p className="text-lg font-medium text-gray-700">
          Envanterde hiç ürün yok.
        </p>
        <p className="mt-1 text-sm">
          Sağ üstteki butondan yeni ürün ekleyebilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border-none bg-white shadow-sm">
      <InventoryFilters value={filters} onChange={handleFiltersChange} />
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-start gap-3 border-b border-gray-100 bg-gray-50/50 px-4 py-3">
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <Description className="text-sm font-medium text-gray-700">
                {selectedIds.length} ürün seçildi
              </Description>
              <div className="flex items-center gap-1.5">
                <Tooltip delay={0} closeDelay={0}>
                  <Button
                    variant="tertiary"
                    isIconOnly
                    size="sm"
                    onPress={() =>
                      void openLabelPrint(
                        filteredItems.filter(item =>
                          selectedIds.includes(item.id)
                        )
                      )
                    }
                    aria-label="Seçili Ürünlere Etiket Bas">
                    <Printer size={18} />
                  </Button>
                  <Tooltip.Content showArrow>
                    <Tooltip.Arrow />
                    Seçili ürünlere etiket bas
                  </Tooltip.Content>
                </Tooltip>
                <Tooltip delay={0} closeDelay={0}>
                  <Button
                    variant="tertiary"
                    isIconOnly
                    size="sm"
                    onPress={() => {
                      const newSelection: Record<string, boolean> = {};
                      filteredItems.forEach(item => {
                        newSelection[item.id] = true;
                      });
                      setRowSelection(newSelection);
                    }}
                    aria-label="Tümünü Seç">
                    <CheckSquare size={18} />
                  </Button>
                  <Tooltip.Content showArrow>
                    <Tooltip.Arrow />
                    Tümünü Seç ({filteredItems.length})
                  </Tooltip.Content>
                </Tooltip>

                <Tooltip delay={0} closeDelay={0}>
                  <Button
                    variant="ghost"
                    isIconOnly
                    size="sm"
                    onPress={() => setRowSelection({})}
                    aria-label="Seçimi Temizle">
                    <X size={18} />
                  </Button>
                  <Tooltip.Content showArrow>
                    <Tooltip.Arrow />
                    Seçimi Temizle
                  </Tooltip.Content>
                </Tooltip>

                <Tooltip delay={0} closeDelay={0}>
                  <Button
                    variant="ghost"
                    isIconOnly
                    size="sm"
                    className="text-danger"
                    onPress={async () => {
                      const confirmed = await confirm({
                        title: 'Seçili Ürünleri Sil',
                        description: `Seçilen ${selectedIds.length} ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
                        confirmText: 'Sil',
                        variant: 'danger'
                      });
                      if (confirmed) {
                        await deleteItems(selectedIds);
                        setRowSelection({});
                        toast.success(
                          `${selectedIds.length} ürün başarıyla silindi.`
                        );
                      }
                    }}
                    aria-label="Seçimleri Sil">
                    <Trash2 size={18} />
                  </Button>
                  <Tooltip.Content showArrow>
                    <Tooltip.Arrow />
                    Seçimleri Sil
                  </Tooltip.Content>
                </Tooltip>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-left">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr
                key={headerGroup.id}
                className="border-b border-gray-200 bg-gray-50">
                {headerGroup.headers.map(header => {
                  const isSelection = header.column.id === 'selection';
                  return (
                    <th
                      key={header.id}
                      className={clsx(
                        isSelection
                          ? 'w-12 px-4'
                          : 'cursor-pointer px-6 hover:bg-gray-100',
                        'py-4 text-sm font-semibold whitespace-nowrap text-gray-600 transition-colors'
                      )}
                      onClick={
                        isSelection
                          ? undefined
                          : header.column.getToggleSortingHandler()
                      }>
                      <div className="flex items-center gap-2">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {!isSelection &&
                          ({
                            asc: <ArrowUp className="text-xs" />,
                            desc: <ArrowDown className="text-xs" />
                          }[header.column.getIsSorted() as string] ??
                            null)}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isInitialLoading
              ? Array.from({ length: 5 }, (_, rowIndex) => (
                  <tr
                    key={rowIndex}
                    data-testid="inventory-loading-skeleton"
                    className="animate-pulse border-b border-gray-100">
                    {table.getVisibleLeafColumns().map(column => (
                      <td
                        key={column.id}
                        className={clsx(
                          column.id === 'selection' ? 'w-12 px-4' : 'px-6',
                          'py-4'
                        )}>
                        <div
                          className={clsx(
                            'h-4 rounded bg-gray-200',
                            column.id === 'selection'
                              ? 'w-5 bg-gray-100'
                              : column.id === 'name'
                                ? 'w-40'
                                : column.id === 'stock'
                                  ? 'w-12 bg-gray-100'
                                  : column.id === 'actions'
                                    ? 'ml-auto h-8 w-16 bg-gray-100'
                                    : 'w-24'
                          )}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              : table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className={clsx(
                      'border-b border-gray-100 transition-colors select-text hover:bg-gray-50/50',
                      row.getIsSelected() && 'bg-primary-50/20'
                    )}>
                    {row.getVisibleCells().map(cell => {
                      const isSelection = cell.column.id === 'selection';
                      const isAction = cell.column.id === 'actions';
                      return (
                        <td
                          key={cell.id}
                          className={clsx(
                            isSelection ? 'w-12 px-4' : 'px-6',
                            'py-4 text-sm'
                          )}
                          onClick={
                            isSelection || isAction
                              ? event => event.stopPropagation()
                              : undefined
                          }>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {filteredItems.length > INVENTORY_PAGE_SIZE && (
        <div className="border-t border-gray-100 px-4 py-3 sm:px-6">
          <Pagination className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Pagination.Summary>
              {pageStart}–{pageEnd} / {filteredItems.length} ürün
            </Pagination.Summary>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous
                  isDisabled={!table.getCanPreviousPage()}
                  onPress={() => table.previousPage()}>
                  <Pagination.PreviousIcon />
                  <span>Önceki</span>
                </Pagination.Previous>
              </Pagination.Item>
              {pageItems.map((page, index) =>
                page === 'ellipsis' ? (
                  <Pagination.Item key={`ellipsis-${index}`}>
                    <Pagination.Ellipsis />
                  </Pagination.Item>
                ) : (
                  <Pagination.Item key={page}>
                    <Pagination.Link
                      isActive={page === currentPage}
                      onPress={() => table.setPageIndex(page - 1)}>
                      {page}
                    </Pagination.Link>
                  </Pagination.Item>
                )
              )}
              <Pagination.Item>
                <Pagination.Next
                  isDisabled={!table.getCanNextPage()}
                  onPress={() => table.nextPage()}>
                  <span>Sonraki</span>
                  <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
        </div>
      )}
      {isLabelPrintOpen && (
        <Suspense fallback={null}>
          <LabelPrintModal
            isOpen={isLabelPrintOpen}
            items={labelItems}
            onClose={() => setIsLabelPrintOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
};
