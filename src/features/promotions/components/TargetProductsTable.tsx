import { memo, useCallback, useMemo, useState } from 'react';
import {
  Checkbox,
  Label,
  SearchField,
  Table,
  TableLayout,
  Virtualizer
} from '@heroui/react';
import type { InventoryItem } from '@/features/inventory';
import { normalizeSearchText } from '@/shared/utils/searchText';

interface TargetProductsTableProps {
  products: InventoryItem[];
  selectedProductIds: string[];
  onSelectedProductIdsChange: (ids: string[]) => void;
}

const INITIAL_PRODUCT_LIMIT = 200;

export const TargetProductsTable = memo(function TargetProductsTable({
  products,
  selectedProductIds,
  onSelectedProductIdsChange
}: TargetProductsTableProps) {
  const [query, setQuery] = useState('');
  const normalizedQuery = normalizeSearchText(query.trim());
  const selectedProductIdSet = useMemo(
    () => new Set(selectedProductIds),
    [selectedProductIds]
  );
  const selectedKeys = useMemo(
    () => new Set(selectedProductIds),
    [selectedProductIds]
  );
  const displayedProducts = useMemo(() => {
    if (normalizedQuery) {
      return products.filter(
        product =>
          normalizeSearchText(product.name).includes(normalizedQuery) ||
          normalizeSearchText(product.barcode ?? '').includes(normalizedQuery)
      );
    }

    const selectedProducts = [];
    const unselectedProducts = [];
    for (const product of products) {
      if (selectedProductIdSet.has(product.id)) selectedProducts.push(product);
      else unselectedProducts.push(product);
    }

    return [
      ...selectedProducts,
      ...unselectedProducts.slice(
        0,
        Math.max(0, INITIAL_PRODUCT_LIMIT - selectedProducts.length)
      )
    ];
  }, [normalizedQuery, products, selectedProductIdSet]);
  const isInitialListLimited =
    !normalizedQuery && displayedProducts.length < products.length;

  const handleSelectionChange = useCallback(
    (keys: Set<React.Key> | 'all') => {
      const visibleIds = new Set(displayedProducts.map(product => product.id));
      const preservedIds = selectedProductIds.filter(id => !visibleIds.has(id));
      const nextVisibleIds =
        keys === 'all'
          ? displayedProducts.map(product => product.id)
          : [...keys].map(String);
      onSelectedProductIdsChange([
        ...new Set([...preservedIds, ...nextVisibleIds])
      ]);
    },
    [displayedProducts, onSelectedProductIdsChange, selectedProductIds]
  );

  return (
    <div className="space-y-3">
      <SearchField
        value={query}
        onChange={setQuery}
        variant="secondary"
        fullWidth>
        <Label className="sr-only">Hedef ürün ara</Label>
        <SearchField.Group className="bg-white dark:!bg-slate-800">
          <SearchField.SearchIcon className="bg-transparent" />
          <SearchField.Input
            className="bg-transparent dark:!bg-transparent"
            placeholder="Ürün adı veya barkod ile ara..."
          />
          <SearchField.ClearButton className="bg-transparent" />
        </SearchField.Group>
      </SearchField>

      <div className="overflow-hidden rounded-2xl border border-gray-100">
        <Virtualizer layout={TableLayout} layoutOptions={{ rowHeight: 52 }}>
          <Table variant="secondary">
            <Table.ScrollContainer className="h-64">
              <Table.Content
                aria-label="Hedef ürünler"
                selectionMode="multiple"
                selectionBehavior="toggle"
                selectedKeys={selectedKeys}
                onSelectionChange={handleSelectionChange}>
                <Table.Header className="sticky top-0 z-10 bg-gray-50 dark:!bg-slate-800">
                  <Table.Column
                    aria-label="Ürün seçimi"
                    defaultWidth={52}
                    minWidth={52}>
                    <span aria-hidden="true">&nbsp;</span>
                  </Table.Column>
                  <Table.Column defaultWidth="1fr" isRowHeader>
                    Ürün
                  </Table.Column>
                  <Table.Column defaultWidth={190} minWidth={150}>
                    Barkod
                  </Table.Column>
                </Table.Header>
                <Table.Body
                  items={displayedProducts}
                  renderEmptyState={() => (
                    <span className="block py-8 text-center text-sm text-gray-500">
                      Aramanızla eşleşen ürün bulunamadı.
                    </span>
                  )}>
                  {product => (
                    <Table.Row id={product.id}>
                      <Table.Cell>
                        <Checkbox
                          slot="selection"
                          aria-label={`${product.name} ürününü hedefe ekle`}>
                          <Checkbox.Content className="p-1">
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                          </Checkbox.Content>
                        </Checkbox>
                      </Table.Cell>
                      <Table.Cell className="font-medium text-gray-900">
                        {product.name}
                      </Table.Cell>
                      <Table.Cell className="font-mono text-xs text-gray-500">
                        {product.barcode || '—'}
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </Virtualizer>
      </div>

      <p className="text-xs text-gray-500">
        {selectedProductIds.length} ürün hedefe eklendi. Aramayı temizleseniz de
        seçimleriniz korunur.
        {isInitialListLimited &&
          ` Performans için ilk ${INITIAL_PRODUCT_LIMIT} ürün gösteriliyor; diğer ürünleri arayabilirsiniz.`}
      </p>
    </div>
  );
});
