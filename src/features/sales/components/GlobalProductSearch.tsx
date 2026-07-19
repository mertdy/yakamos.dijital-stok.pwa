import React, { useState, useEffect, useRef } from 'react';
import { Search, ScanBarcode, Package } from 'lucide-react';
import { useInventoryStore } from '@/features/inventory';
import { useSalesStore } from '../store/useSalesStore';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useGlobalBarcodeScanner } from '@/shared/hooks/useGlobalBarcodeScanner';
import { normalizeSearchText } from '@/shared/utils/searchText';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/core/config/routes';
import { Input, toast } from '@heroui/react';
import posthog from 'posthog-js';
import { playBarcodeFeedback } from '@/shared/utils/barcodeFeedback';

interface Props {
  onOpenScanner: () => void;
}

export const GlobalProductSearch: React.FC<Props> = ({ onOpenScanner }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  const { items } = useInventoryStore();
  const { addToCart } = useSalesStore();
  const navigate = useNavigate();

  const handleSelectProduct = (item: any) => {
    posthog.capture('product_search_result_selected', {
      inventory_id: item.id,
      has_barcode: Boolean(item.barcode),
      query_length: query.trim().length,
      result_position: searchResults.findIndex(result => result.id === item.id),
      selection_source: 'global_product_search'
    });

    addToCart({
      inventoryId: item.id,
      name: item.name,
      price: item.salePrice ?? item.price ?? 0,
      quantity: 1,
      barcode: item.barcode,
      imageUrl: item.imageUrl
    });
    setQuery('');
    setIsFocused(false);
  };

  useGlobalBarcodeScanner({
    onScan: barcode => {
      const item = useInventoryStore
        .getState()
        .items.find((i: any) => String(i.barcode) === barcode);

      if (item) {
        addToCart({
          inventoryId: item.id,
          name: item.name,
          price: item.salePrice ?? item.price ?? 0,
          quantity: 1,
          barcode: item.barcode,
          imageUrl: item.imageUrl
        });
        posthog.capture('barcode_scanner_item_added_to_cart', {
          inventory_id: item.id,
          barcode_length: barcode.length,
          scan_mode: 'keyboard_scanner'
        });
        setQuery('');
        setIsFocused(false);
        playBarcodeFeedback();
        toast.success(`${item.name} sepete eklendi`);
        return;
      }

      setQuery(barcode);
      setIsFocused(false);
      toast(`${barcode} sistemde kayıtlı değil`, {
        variant: 'danger',
        actionProps: {
          children: 'Yeni Ürün Ekle',
          onPress: () => {
            setQuery('');
            navigate(ROUTES.INVENTORY.NEW_WITH_BARCODE(barcode));
          }
        }
      });
    },
    shouldCaptureInput: element =>
      Boolean(containerRef.current?.contains(element))
  });

  const normalizedQuery = normalizeSearchText(debouncedQuery);
  const searchResults = !debouncedQuery.trim()
    ? []
    : items
        .filter(
          (item: any) =>
            normalizeSearchText(item.name).includes(normalizedQuery) ||
            (item.barcode && String(item.barcode).includes(debouncedQuery)) ||
            (item.sku && String(item.sku).includes(debouncedQuery))
        )
        .slice(0, 10);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const showDropdown = isFocused && debouncedQuery.trim().length > 0;

  return (
    <div className="relative z-20 flex-shrink-0" ref={containerRef}>
      <Search
        className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
        size={18}
      />
      <Input
        type="text"
        fullWidth
        placeholder="Ürün veya barkod ara..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        className="pr-14 pl-11"
      />
      <button
        onClick={onOpenScanner}
        className="bg-primary/10 text-primary hover:bg-primary/20 absolute top-1/2 right-2 -translate-y-1/2 rounded-xl p-2 transition-colors"
        title="Kameradan Barkod Okut">
        <ScanBarcode size={18} />
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full right-0 left-0 mt-2 max-h-[300px] overflow-hidden overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-xl">
          {searchResults.length > 0 ? (
            <div className="flex flex-col py-2">
              {searchResults.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSelectProduct(item)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-gray-400">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package size={20} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {item.name}
                    </p>
                    {item.barcode && (
                      <p className="truncate text-xs text-gray-500">
                        {item.barcode}
                      </p>
                    )}
                  </div>
                  <div className="text-primary font-bold whitespace-nowrap">
                    ₺{(item.salePrice ?? item.price ?? 0).toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-gray-500">
              <p>"{debouncedQuery}" ile eşleşen ürün bulunamadı.</p>
              <button
                onClick={() => {
                  setQuery('');
                  setIsFocused(false);
                  navigate(ROUTES.INVENTORY.NEW_WITH_BARCODE(debouncedQuery));
                }}
                className="text-primary mt-1 cursor-pointer font-medium hover:underline">
                Bu ürünü eklemek ister misiniz?
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
