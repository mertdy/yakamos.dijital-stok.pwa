import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { InventoryTable } from '../components/InventoryTable';
import { useInventoryStore } from '../store/useInventoryStore';
import { Plus } from 'lucide-react';
import { Button } from '@heroui/react';
import posthog from 'posthog-js';

import { useAuthStore } from '@/features/auth/store/useAuthStore';

export const InventoryView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loadItems } = useInventoryStore();
  const { activeMembership } = useAuthStore();
  const isOwner = activeMembership?.role === 'OWNER';
  const hasInventoryPermission =
    isOwner || activeMembership?.permissions.includes('MANAGE_INVENTORY');

  useEffect(() => {
    posthog.capture('inventory_viewed', {
      view_source: 'navigation'
    });
    loadItems();

    // Check if we need to auto-open the form with a barcode
    const addBarcode = searchParams.get('add');
    if (addBarcode && hasInventoryPermission) {
      // Remove query param from current view and navigate to new form
      searchParams.delete('add');
      setSearchParams(searchParams, { replace: true });
      navigate(`/inventory/new?barcode=${addBarcode}`);
    }
  }, [
    loadItems,
    searchParams,
    setSearchParams,
    navigate,
    hasInventoryPermission
  ]);

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col p-4 md:p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Envanter Yönetimi
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Stoktaki tüm ürünlerinizi listeleyin ve yönetin.
          </p>
        </div>

        {hasInventoryPermission && (
          <Button onPress={() => navigate('/inventory/new')} variant="primary">
            <Plus className="mr-2 text-xl" /> Yeni Ürün
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <InventoryTable />
      </div>
    </div>
  );
};
