import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { InventoryTable } from '../components/InventoryTable';
import { useInventoryStore } from '../store/useInventoryStore';
import { Plus } from 'lucide-react';
import { Button } from '@heroui/react';

export const InventoryView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loadItems } = useInventoryStore();

  useEffect(() => {
    loadItems();
    
    // Check if we need to auto-open the form with a barcode
    const addBarcode = searchParams.get('add');
    if (addBarcode) {
      // Remove query param from current view and navigate to new form
      searchParams.delete('add');
      setSearchParams(searchParams, { replace: true });
      navigate(`/inventory/new?barcode=${addBarcode}`);
    }
  }, [loadItems, searchParams, setSearchParams, navigate]);

  return (
    <div className="p-4 md:p-6 h-full flex flex-col max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Envanter Yönetimi</h1>
          <p className="text-gray-500 text-sm mt-1">Stoktaki tüm ürünlerinizi listeleyin ve yönetin.</p>
        </div>
        
        <Button 
          onPress={() => navigate('/inventory/new')}
          variant="primary"
          
        ><Plus className="text-xl mr-2" /> Yeni Ürün Ekle
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        <InventoryTable />
      </div>
    </div>
  );
};
