import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  Button,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Tooltip,
  toast
} from '@heroui/react';
import {
  ChevronDown,
  FolderPlus,
  Package,
  Pencil,
  Power,
  Search,
  Trash2
} from 'lucide-react';
import { ROUTES } from '@/core/config/routes';
import { useInventoryStore } from '../store/useInventoryStore';
import {
  useCategoryStore,
  type ProductCategory
} from '../store/useCategoryStore';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { normalizeSearchText } from '@/shared/utils/searchText';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export const CategoryManagementView = () => {
  const {
    categories,
    isLoading,
    loadCategories,
    addCategory,
    updateCategory,
    setCategoryActive,
    deleteCategory
  } = useCategoryStore();
  const { items } = useInventoryStore();
  const activeCompanyId = useAuthStore(state => state.profile?.activeCompanyId);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [expandedProductCategoryIds, setExpandedProductCategoryIds] = useState<
    Set<string>
  >(() => new Set());
  const [categoryToDelete, setCategoryToDelete] =
    useState<ProductCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (activeCompanyId) loadCategories();
  }, [activeCompanyId, loadCategories]);

  const roots = useMemo(
    () =>
      categories.filter(
        category =>
          !category.parentId &&
          normalizeSearchText(category.name).includes(
            normalizeSearchText(debouncedQuery)
          )
      ),
    [categories, debouncedQuery]
  );

  const productsByCategory = useMemo(() => {
    const grouped = new Map<string, typeof items>();

    items.forEach(item => {
      if (!item.categoryId) return;
      grouped.set(item.categoryId, [
        ...(grouped.get(item.categoryId) ?? []),
        item
      ]);
    });

    grouped.forEach(products => {
      products.sort((first, second) =>
        first.name.localeCompare(second.name, 'tr-TR', {
          sensitivity: 'base'
        })
      );
    });

    return grouped;
  }, [items]);

  const openCreate = (parent: string | null = null) => {
    setEditing(null);
    setName('');
    setParentId(parent);
    setModalOpen(true);
  };

  const openEdit = (category: ProductCategory) => {
    setEditing(category);
    setName(category.name);
    setParentId(category.parentId);
    setModalOpen(true);
  };

  const toggleCategoryProducts = (categoryId: string) => {
    setExpandedProductCategoryIds(current => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const save = async () => {
    try {
      if (editing) await updateCategory(editing.id, { name, parentId });
      else await addCategory({ name, parentId });
      setModalOpen(false);
      toast.success('Kategori kaydedildi');
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : 'Kategori kaydedilemedi'
      );
    }
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);
    try {
      await deleteCategory(categoryToDelete.id);
      setExpandedProductCategoryIds(current => {
        const next = new Set(current);
        next.delete(categoryToDelete.id);
        return next;
      });
      setCategoryToDelete(null);
      toast.success('Kategori silindi');
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : 'Kategori silinemedi'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const row = (category: ProductCategory, nested = false) => {
    const products = productsByCategory.get(category.id) ?? [];
    const count = products.length;
    const childCount = categories.filter(
      child => child.parentId === category.id
    ).length;
    const canDelete = count === 0 && childCount === 0;
    const isProductsExpanded = expandedProductCategoryIds.has(category.id);
    return (
      <div
        key={category.id}
        className={`border-t border-gray-100 ${nested ? 'ml-7 bg-gray-50/50' : ''}`}>
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-900">
              {nested && '└ '}
              {category.name}
            </p>
            <p className="text-xs text-gray-500">
              {count} ürün{category.isActive ? '' : ' · Pasif'}
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onPress={() => toggleCategoryProducts(category.id)}
            isDisabled={count === 0}
            aria-expanded={isProductsExpanded}
            aria-label={`${category.name} kategorisindeki ürünleri ${isProductsExpanded ? 'gizle' : 'göster'}`}>
            <Package size={16} />
            {count ? `${count} ürünü gör` : 'Ürün yok'}
            {count > 0 && (
              <ChevronDown
                size={16}
                className={`transition-transform ${isProductsExpanded ? 'rotate-180' : ''}`}
              />
            )}
          </Button>
          <Tooltip>
            <Tooltip.Trigger>
              <Button
                size="sm"
                variant="tertiary"
                isIconOnly
                onPress={() => openEdit(category)}
                aria-label="Kategoriyi düzenle">
                <Pencil size={16} />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content showArrow>
              <Tooltip.Arrow />
              Kategoriyi düzenle
            </Tooltip.Content>
          </Tooltip>
          {!nested && (
            <Tooltip>
              <Tooltip.Trigger>
                <Button
                  size="sm"
                  variant="tertiary"
                  isIconOnly
                  onPress={() => openCreate(category.id)}
                  aria-label="Alt kategori ekle">
                  <FolderPlus size={16} />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content showArrow>
                <Tooltip.Arrow />
                Alt kategori ekle
              </Tooltip.Content>
            </Tooltip>
          )}
          <Tooltip>
            <Tooltip.Trigger>
              <Button
                size="sm"
                variant="tertiary"
                isIconOnly
                onPress={() =>
                  void setCategoryActive(category.id, !category.isActive)
                }
                aria-label="Kategori durumunu değiştir">
                <Power size={16} />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content showArrow>
              <Tooltip.Arrow />
              {category.isActive
                ? 'Kategoriyi pasifleştir'
                : 'Kategoriyi etkinleştir'}
            </Tooltip.Content>
          </Tooltip>
          {canDelete && (
            <Tooltip>
              <Tooltip.Trigger>
                <Button
                  size="sm"
                  variant="tertiary"
                  isIconOnly
                  className="text-danger"
                  onPress={() => setCategoryToDelete(category)}
                  aria-label="Kategoriyi sil">
                  <Trash2 size={16} />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content showArrow>
                <Tooltip.Arrow />
                Kategoriyi sil
              </Tooltip.Content>
            </Tooltip>
          )}
        </div>
        {isProductsExpanded && (
          <div className="bg-primary/[0.03] border-t border-gray-100 px-4 py-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
              <Package size={17} className="text-primary" />
              Bu kategorideki ürünler
            </div>
            <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 bg-white">
              {products.map(product => (
                <Button
                  key={product.id}
                  variant="ghost"
                  onPress={() => navigate(ROUTES.INVENTORY.EDIT(product.id))}
                  className="h-auto min-h-0 w-full justify-start rounded-none px-4 py-3 text-left hover:bg-gray-50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-gray-800">
                      {product.name}
                    </span>
                  </span>
                  <span className="ml-4 shrink-0 text-xs font-normal text-gray-500">
                    Stok: {product.stock} {product.unit ?? 'adet'}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col p-4 md:p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Kategori Yönetimi
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Ürünlerinizi gruplandırın ve daha kolay bulun.
          </p>
        </div>
        <Button variant="primary" onPress={() => openCreate()}>
          <FolderPlus className="mr-2 text-xl" /> Kategori Ekle
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50/50 p-4">
          <div className="relative w-full max-w-xl">
            <Search
              className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <Input
              type="text"
              fullWidth
              className="pl-10"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Kategori ara..."
            />
          </div>
        </div>

        <div
          data-testid="category-list"
          className="min-h-0 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="animate-pulse divide-y divide-gray-100">
              {Array.from({ length: 5 }, (_, index) => (
                <div
                  key={index}
                  data-testid="category-loading-skeleton"
                  className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-36 rounded bg-gray-200" />
                    <div className="h-3 w-16 rounded bg-gray-100" />
                  </div>
                  <div className="h-8 w-24 rounded bg-gray-100" />
                  <div className="h-8 w-8 rounded bg-gray-100" />
                  <div className="h-8 w-8 rounded bg-gray-100" />
                </div>
              ))}
            </div>
          ) : roots.length ? (
            roots.map(root => (
              <div key={root.id}>
                {row(root)}
                {categories
                  .filter(child => child.parentId === root.id)
                  .map(child => row(child, true))}
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-sm text-gray-500">
              Henüz kategori yok. İçecekler veya Temizlik gibi ilk kategorinizi
              ekleyin.
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={modalOpen} onOpenChange={setModalOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl outline-none">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading className="text-xl">
                  {editing ? 'Kategori Düzenle' : 'Yeni Kategori'}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="category-name">Kategori adı</Label>
                  <Input
                    id="category-name"
                    fullWidth
                    value={name}
                    onChange={event => setName(event.target.value)}
                    autoFocus
                  />
                </div>
                <Select
                  fullWidth
                  placeholder="Ana kategori"
                  selectedKey={parentId ?? 'root'}
                  onSelectionChange={value =>
                    setParentId(
                      value && value !== 'root' ? String(value) : null
                    )
                  }>
                  <Label>Üst kategori</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item id="root">Ana kategori</ListBox.Item>
                      {categories
                        .filter(
                          category =>
                            !category.parentId &&
                            category.id !== editing?.id &&
                            category.isActive
                        )
                        .map(category => (
                          <ListBox.Item key={category.id} id={category.id}>
                            {category.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </Modal.Body>
              <Modal.Footer className="flex gap-3 pt-4">
                <Button variant="ghost" onPress={() => setModalOpen(false)}>
                  İptal
                </Button>
                <Button
                  variant="primary"
                  onPress={() => void save()}
                  isDisabled={!name.trim()}>
                  Kaydet
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
      <AlertDialog.Backdrop
        isOpen={Boolean(categoryToDelete)}
        onOpenChange={isOpen => {
          if (!isOpen && !isDeleting) setCategoryToDelete(null);
        }}>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="w-full max-w-md rounded-2xl bg-white shadow-xl outline-none">
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Kategori silinsin mi?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <span className="font-semibold text-gray-800">
                {categoryToDelete?.name}
              </span>{' '}
              kategorisine bağlı ürün veya alt kategori bulunmuyor. Silme işlemi
              geri alınamaz.
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button
                variant="ghost"
                onPress={() => setCategoryToDelete(null)}
                isDisabled={isDeleting}>
                Vazgeç
              </Button>
              <Button
                variant="danger"
                onPress={() => void confirmDelete()}
                isPending={isDeleting}>
                Kategoriyi Sil
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </div>
  );
};
