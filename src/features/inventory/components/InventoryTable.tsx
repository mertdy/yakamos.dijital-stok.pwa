import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
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
  Search,
  CheckSquare,
  X
} from 'lucide-react';
import {
  Button,
  Checkbox,
  Description,
  Input,
  Tooltip,
  toast
} from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { useGlobalBarcodeScanner } from '@/shared/hooks/useGlobalBarcodeScanner';
import { useConfirm } from '@/shared/contexts/ConfirmDialogContext';
import { useAuthStore } from '@/features/auth';

export const InventoryTable: React.FC = () => {
  const { items, deleteItem, deleteItems } = useInventoryStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  useGlobalBarcodeScanner({
    onScan: barcode => {
      const item = useInventoryStore
        .getState()
        .items.find(i => String(i.barcode) === barcode);
      if (item) {
        setGlobalFilter(barcode);
        toast.success(`Ürün bulundu: ${item.name}`);
      } else {
        toast(`${barcode} sistemde kayıtlı değil`, {
          variant: 'danger',
          actionProps: {
            children: 'Yeni Ürün Ekle',
            onPress: () => {
              navigate(`/inventory/new?barcode=${encodeURIComponent(barcode)}`);
            }
          }
        });
      }
    }
  });

  const { activeMembership } = useAuthStore();
  const isOwner = activeMembership?.role === 'OWNER';
  const hasInventoryPermission =
    isOwner || activeMembership?.permissions.includes('MANAGE_INVENTORY');

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
        cell: info => (
          <span className="text-gray-500">{info.getValue() || '-'}</span>
        )
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
        header: 'Fiyat',
        cell: info => <span>₺{info.getValue().toFixed(2)}</span>
      })
    );

    if (hasInventoryPermission) {
      cols.push(
        columnHelper.display({
          id: 'actions',
          header: 'İşlemler',
          cell: props => (
            <div className="flex gap-2">
              <Button
                variant="tertiary"
                isIconOnly
                onPress={() =>
                  navigate(`/inventory/edit/${props.row.original.id}`)
                }
                aria-label="Düzenle">
                <Edit className="text-lg" />
              </Button>
              <Button
                variant="ghost"
                isIconOnly
                className="text-danger"
                onPress={async () => {
                  const confirmed = await confirm({
                    title: 'Ürünü Sil',
                    description: 'Bu ürünü silmek istediğinize emin misiniz?',
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
            </div>
          )
        })
      );
    }

    return cols;
  }, [hasInventoryPermission, columnHelper, navigate, confirm, deleteItem]);

  const filteredItems = useMemo(() => {
    return items.filter(
      item =>
        item.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
        (item.barcode && item.barcode.includes(globalFilter))
    );
  }, [items, globalFilter]);

  const selectedIds = useMemo(() => {
    return Object.keys(rowSelection).filter(id => rowSelection[id]);
  }, [rowSelection]);

  const table = useReactTable({
    data: filteredItems,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    getRowId: row => row.id
  });

  if (items.length === 0) {
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
      <div className="flex flex-col gap-4 border-b border-gray-100 bg-gray-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search
            className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <Input
            type="text"
            fullWidth
            placeholder="Ürün adı veya barkod ile ara..."
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            className="pl-10"
          />
        </div>

        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <Description className="text-sm font-medium text-gray-700">
              {selectedIds.length} ürün seçildi
            </Description>
            <div className="flex items-center gap-1.5">
              <Tooltip delay={0} closeDelay={0}>
                <Tooltip.Trigger>
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
                </Tooltip.Trigger>
                <Tooltip.Content showArrow>
                  <Tooltip.Arrow />
                  Tümünü Seç ({filteredItems.length})
                </Tooltip.Content>
              </Tooltip>

              <Tooltip delay={0} closeDelay={0}>
                <Tooltip.Trigger>
                  <Button
                    variant="ghost"
                    isIconOnly
                    size="sm"
                    onPress={() => setRowSelection({})}
                    aria-label="Seçimi Temizle">
                    <X size={18} />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content showArrow>
                  <Tooltip.Arrow />
                  Seçimi Temizle
                </Tooltip.Content>
              </Tooltip>

              <Tooltip delay={0} closeDelay={0}>
                <Tooltip.Trigger>
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
                </Tooltip.Trigger>
                <Tooltip.Content showArrow>
                  <Tooltip.Arrow />
                  Seçimleri Sil
                </Tooltip.Content>
              </Tooltip>
            </div>
          </div>
        )}
      </div>
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
            {table.getRowModel().rows.map(row => (
              <tr
                key={row.id}
                className={clsx(
                  'border-b border-gray-100 transition-colors hover:bg-gray-50/50',
                  row.getIsSelected() && 'bg-primary-50/20'
                )}>
                {row.getVisibleCells().map(cell => {
                  const isSelection = cell.column.id === 'selection';
                  return (
                    <td
                      key={cell.id}
                      className={clsx(
                        isSelection ? 'w-12 px-4' : 'px-6',
                        'py-4 text-sm'
                      )}>
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
    </div>
  );
};
