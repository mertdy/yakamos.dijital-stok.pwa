import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, ScanBarcode, Package } from 'lucide-react';
import { useInventoryStore } from '../../inventory/store/useInventoryStore';
import { useSalesStore } from '../store/useSalesStore';
import { useDebounce } from '../../../shared/hooks/useDebounce';
import { useGlobalBarcodeScanner } from '../../../shared/hooks/useGlobalBarcodeScanner';
import { useNavigate } from 'react-router-dom';
import { toast } from '@heroui/react';

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
    addToCart({ 
      inventoryId: item.id, 
      name: item.name, 
      price: item.price, 
      quantity: 1, 
      barcode: item.barcode,
      imageUrl: item.imageUrl 
    });
    setQuery('');
    setIsFocused(false);
  };

  useGlobalBarcodeScanner({
    onScan: (barcode) => {
      setQuery(barcode);
      setIsFocused(true);
      
      // Delay slightly so the user sees the barcode in the search bar
      setTimeout(() => {
        // Items reference might be slightly stale if destructured, but items array is generally stable here
        const item = useInventoryStore.getState().items.find((i: any) => String(i.barcode) === barcode);
        
        if (item) {
          handleSelectProduct(item);
          toast.success(`${item.name} sepete eklendi`);
        } else {
          setIsFocused(false);
          toast(`${barcode} sistemde kayıtlı değil`, {
            variant: 'danger',
            actionProps: {
              children: 'Yeni Ürün Ekle',
              onPress: () => {
                setQuery('');
                navigate(`/inventory/new?barcode=${encodeURIComponent(barcode)}`);
              }
            }
          });
        }
      }, 150);
    }
  });

  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    
    const lowerQuery = debouncedQuery.toLowerCase();
    return items.filter(
      (item: any) =>
        item.name.toLowerCase().includes(lowerQuery) ||
        (item.barcode && String(item.barcode).toLowerCase().includes(lowerQuery)) ||
        (item.sku && String(item.sku).toLowerCase().includes(lowerQuery))
    ).slice(0, 10); // Limit to 10 results
  }, [debouncedQuery, items]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
    <div className="relative flex-shrink-0 z-40" ref={containerRef}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      <input
        type="text"
        placeholder="Ürün veya barkod ara..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        className="w-full bg-white border border-gray-100 rounded-2xl py-3.5 pl-11 pr-14 text-sm focus:ring-2 focus:ring-primary shadow-sm outline-none transition-all"
      />
      <button 
        onClick={onOpenScanner}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
        title="Kameradan Barkod Okut"
      >
        <ScanBarcode size={18} />
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 max-h-[300px] overflow-y-auto overflow-hidden">
          {searchResults.length > 0 ? (
            <div className="flex flex-col py-2">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectProduct(item)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors w-full text-left"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400 overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={20} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{item.name}</p>
                    {item.barcode && <p className="text-xs text-gray-500 truncate">{item.barcode}</p>}
                  </div>
                  <div className="font-bold text-primary whitespace-nowrap">
                    ₺{item.price.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500 text-sm flex flex-col items-center gap-2">
              <p>"{debouncedQuery}" ile eşleşen ürün bulunamadı.</p>
              <button 
                onClick={() => {
                  setQuery('');
                  setIsFocused(false);
                  navigate(`/inventory/new?barcode=${encodeURIComponent(debouncedQuery)}`);
                }}
                className="text-primary hover:underline font-medium mt-1 cursor-pointer"
              >
                Bu ürünü eklemek ister misiniz?
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
