import React, { useState } from 'react';
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable, getSortedRowModel, type SortingState } from '@tanstack/react-table';
import { useInventoryStore, type InventoryItem } from '../store/useInventoryStore';
import { Edit, Trash2, Package, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { Button } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { useGlobalBarcodeScanner } from '../../../shared/hooks/useGlobalBarcodeScanner';
import { toast } from '@heroui/react';
import { useConfirm } from '../../../shared/contexts/ConfirmDialogContext';

export const InventoryTable: React.FC = () => {
  const { items, deleteItem } = useInventoryStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const navigate = useNavigate();
  const { confirm } = useConfirm();

  useGlobalBarcodeScanner({
    onScan: (barcode) => {
      const item = useInventoryStore.getState().items.find((i) => String(i.barcode) === barcode);
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

  const columnHelper = createColumnHelper<InventoryItem>();

  const columns = [
    columnHelper.accessor('name', {
      header: 'Ürün Adı',
      cell: info => <span className="font-medium text-gray-900">{info.getValue()}</span>,
    }),
    columnHelper.accessor('barcode', {
      header: 'Barkod',
      cell: info => <span className="text-gray-500">{info.getValue() || '-'}</span>,
    }),
    columnHelper.accessor('stock', {
      header: 'Stok',
      cell: info => {
        const val = info.getValue();
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-bold ${val < 10 ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'}`}>
            {val}
          </span>
        );
      },
    }),
    columnHelper.accessor('price', {
      header: 'Fiyat',
      cell: info => <span>₺{info.getValue().toFixed(2)}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'İşlemler',
      cell: props => (
        <div className="flex gap-2">
          <Button 
            variant="tertiary"
            isIconOnly
            onPress={() => navigate(`/inventory/edit/${props.row.original.id}`)} 
            aria-label="Düzenle"
          >
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
            aria-label="Sil"
          >
            <Trash2 className="text-lg" />
          </Button>
        </div>
      )
    }),
  ];

  const filteredItems = React.useMemo(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(globalFilter.toLowerCase()) || 
      (item.barcode && item.barcode.includes(globalFilter))
    );
  }, [items, globalFilter]);

  const table = useReactTable({
    data: filteredItems,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 bg-white rounded-[28px] shadow-sm border-none">
        <Package className="text-6xl mb-4 opacity-30" />
        <p className="text-lg font-medium text-gray-700">Envanterde hiç ürün yok.</p>
        <p className="text-sm mt-1">Sağ üstteki butondan yeni ürün ekleyebilirsiniz.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[28px] shadow-sm border-none overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Ürün adı veya barkod ile ara..." 
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-primary outline-none"
          />
        </div>
      </div>
      <div className="overflow-x-auto flex-1">
      <table className="w-full text-left border-collapse min-w-[600px]">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className="bg-gray-50 border-b border-gray-200">
              {headerGroup.headers.map(header => (
                <th 
                  key={header.id} 
                  className="px-6 py-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-2">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: <ArrowUp className="text-xs" />,
                      desc: <ArrowDown className="text-xs" />,
                    }[header.column.getIsSorted() as string] ?? null}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-6 py-4 text-sm">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};
