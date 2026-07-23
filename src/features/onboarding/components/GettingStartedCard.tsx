import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Label, ProgressBar, toast } from '@heroui/react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  PackagePlus,
  Play,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { useAuthStore } from '@/features/auth';
import { useInventoryStore } from '@/features/inventory';
import { ROUTES } from '@/core/config/routes';
import { useConfirm } from '@/shared/contexts/ConfirmDialogContext';
import { PLATFORM_SUPPORT_ADMIN_EMAIL } from '@/core/config/support';
import {
  getModuleProgress,
  type OnboardingModuleId
} from '../domain/onboardingModules';
import { useOnboardingStore } from '../store/useOnboardingStore';

interface GettingStartedCardProps {
  compact?: boolean;
}

export const GettingStartedCard = ({
  compact = false
}: GettingStartedCardProps) => {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [isCreatingSample, setIsCreatingSample] = useState(false);
  const { user, activeCompany, activeMembership } = useAuthStore();
  const { items, addItem, deleteItem } = useInventoryStore();
  const {
    progress,
    loadedUserId,
    isLoading,
    startModule,
    dismissChecklist,
    resetOnboardingProgress,
    saveExampleProductId
  } = useOnboardingStore();

  const canManageInventory =
    activeMembership?.role === 'OWNER' ||
    activeMembership?.permissions.includes('MANAGE_INVENTORY');
  const isPlatformAdmin = user?.email === PLATFORM_SUPPORT_ADMIN_EMAIL;

  const canManageCustomers =
    activeMembership?.role === 'OWNER' ||
    activeMembership?.permissions.includes('MANAGE_CUSTOMERS');
  const canShareStatement =
    activeMembership?.role === 'OWNER' ||
    activeMembership?.permissions.includes('SHARE_CUSTOMER_STATEMENT');
  const canViewDashboard =
    activeMembership?.role === 'OWNER' ||
    activeMembership?.permissions.includes('VIEW_DASHBOARD');

  if (
    !user ||
    !activeCompany ||
    isLoading ||
    loadedUserId !== user.uid ||
    progress.dismissedAt
  ) {
    return null;
  }

  const moduleDestinations: Partial<Record<OnboardingModuleId, string>> = {
    sales: ROUTES.SALES,
    'inventory-filters': ROUTES.INVENTORY.INDEX,
    customers: ROUTES.CUSTOMERS.INDEX
  };
  const moduleTargets: Partial<Record<OnboardingModuleId, string>> = {
    sales: 'sales-search',
    'inventory-filters': 'inventory-filters',
    customers: 'customer-new'
  };

  const startModuleFromCard = async (moduleId: OnboardingModuleId) => {
    if (compact) setIsExpanded(false);

    const destination = moduleDestinations[moduleId];
    const target = moduleTargets[moduleId];
    if (destination && target) {
      navigate(destination);
      let remainingFrames = 150;
      await new Promise<void>(resolve => {
        const waitForTarget = () => {
          if (
            document.querySelector(`[data-onboarding="${target}"]`) ||
            remainingFrames <= 0
          ) {
            resolve();
            return;
          }
          remainingFrames -= 1;
          requestAnimationFrame(waitForTarget);
        };
        requestAnimationFrame(waitForTarget);
      });
    }

    await startModule(moduleId);
  };

  const createSampleProduct = async () => {
    setIsCreatingSample(true);
    try {
      const existingSample = items.find(
        item => item.id === progress.exampleProductId || item.isDemo
      );
      if (existingSample) {
        await saveExampleProductId(existingSample.id);
        toast.info('Örnek ürün zaten envanterinizde bulunuyor.');
        return;
      }

      const sku = `DEMO-${activeCompany.id.slice(0, 6)}-${Date.now()}`;
      await addItem({
        name: 'Deneme Ürünü',
        stock: 10,
        salePrice: 10,
        costPrice: 5,
        taxRate: 20,
        priceIncludesTax: true,
        unit: 'adet',
        categoryId: null,
        trackStock: true,
        useCompanyLowStockThreshold: true,
        lowStockThreshold: null,
        isActive: true,
        note: 'Başlangıç rehberi örnek ürünü',
        description: 'Uygulamayı keşfetmeniz için oluşturulan örnek ürün.',
        sku,
        isDemo: true,
        createdAt: new Date().toISOString()
      });
      const created = useInventoryStore
        .getState()
        .items.find(item => item.sku === sku);
      if (created) await saveExampleProductId(created.id);
      toast.success('Örnek ürün envantere eklendi.');
    } catch (error) {
      console.error('Sample product could not be created:', error);
      toast.danger('Örnek ürün oluşturulamadı.');
    } finally {
      setIsCreatingSample(false);
    }
  };

  const removeSampleProduct = async () => {
    const sample = items.find(item => item.id === progress.exampleProductId);
    if (!sample) {
      await saveExampleProductId(null);
      return;
    }
    const approved = await confirm({
      title: 'Örnek ürün silinsin mi?',
      description: `${sample.name} envanterden kaldırılacak.`,
      confirmText: 'Ürünü Sil',
      cancelText: 'Vazgeç',
      variant: 'danger',
      status: 'warning'
    });
    if (!approved) return;
    await deleteItem(sample.id);
    await saveExampleProductId(null);
    toast.success('Örnek ürün kaldırıldı.');
  };

  const resetGuide = async () => {
    const approved = await confirm({
      title: 'Rehber sıfırlansın mı?',
      description:
        'Karşılama ekranı ve tur ilerlemeniz sıfırlanacak. Ürünleriniz ve satışlarınız silinmez.',
      confirmText: 'Rehberi Sıfırla',
      cancelText: 'Vazgeç',
      variant: 'danger',
      status: 'warning'
    });
    if (!approved) return;

    await resetOnboardingProgress();
    toast.success('Başlangıç rehberi sıfırlandı.');
  };

  const rows: Array<{
    key: OnboardingModuleId;
    title: string;
    description: string;
    icon: typeof Play;
  }> = [
    {
      key: 'quick-tour',
      title: 'Kısa uygulama turu',
      description: canViewDashboard
        ? 'İşletme seçimi, navigasyon bağlantıları ve profil menüsünü tanıyın.'
        : 'Navigasyon bağlantıları ve profil menüsünü tanıyın.',
      icon: Play
    },
    {
      key: 'sales',
      title: 'İlk satışınızı yapın',
      description:
        'Ürün ekleme, sepet, ödeme yöntemi ve gerçek satış adımlarını izleyin.',
      icon: ShoppingCart
    },
    {
      key: 'inventory-filters',
      title: 'Envanteri filtreleyin',
      description:
        'Arama, hızlı filtreler ve gelişmiş filtreleri kullanmayı öğrenin.',
      icon: PackagePlus
    }
  ];
  if (canManageCustomers && canShareStatement) {
    rows.push({
      key: 'customers',
      title: 'Müşterileri yönetin',
      description:
        'Müşteri ekleme, düzenleme ve WhatsApp ekstresi paylaşımını keşfedin.',
      icon: Users
    });
  }
  const moduleProgress = getModuleProgress(
    progress.completedModules,
    rows.map(row => row.key)
  );

  const content = (
    <Card className="border-primary/25 overflow-hidden border-2 bg-blue-50 shadow-md dark:bg-slate-800">
      <Card.Header className="pb-2">
        <div className="flex w-full items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="bg-primary/10 text-primary mt-0.5 rounded-xl p-2">
              <Sparkles size={20} />
            </span>
            <div>
              <h2 className="text-default-900 font-semibold">
                Başlangıç rehberi
              </h2>
              <p className="text-default-500 mt-0.5 text-sm">
                {moduleProgress.completedCount}/{moduleProgress.totalCount}{' '}
                başarı tamamlandı
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {compact && (
              <>
                <Button
                  isIconOnly
                  variant="ghost"
                  aria-label={
                    isExpanded ? 'Rehberi daralt' : 'Rehberi genişlet'
                  }
                  onPress={() => setIsExpanded(value => !value)}>
                  {isExpanded ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronUp size={18} />
                  )}
                </Button>
                <Button
                  isIconOnly
                  variant="ghost"
                  aria-label="Rehberi kapat"
                  onPress={() => void dismissChecklist()}>
                  <X size={18} />
                </Button>
              </>
            )}
          </div>
        </div>
      </Card.Header>
      <Card.Content className="pt-0">
        <ProgressBar
          value={moduleProgress.completedCount}
          maxValue={moduleProgress.totalCount}>
          <Label className="sr-only">Başlangıç ilerlemesi</Label>
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>

        {isExpanded && (
          <div className="mt-4 space-y-3">
            {rows.map(row => {
              const Icon = row.icon;
              const completed = Boolean(progress.completedModules[row.key]);
              return (
                <div
                  key={row.key}
                  className="border-default-200 bg-background flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center">
                  <span
                    className={
                      completed
                        ? 'bg-success/15 text-success rounded-full p-1.5'
                        : 'bg-default-100 text-default-500 rounded-full p-1.5'
                    }>
                    {completed ? <Check size={17} /> : <Circle size={17} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-default-900 text-sm font-semibold">
                      {row.title}
                    </p>
                    <p className="text-default-500 mt-0.5 text-xs">
                      {row.description}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={completed ? 'ghost' : 'outline'}
                    onPress={() => void startModuleFromCard(row.key)}>
                    {completed ? <RotateCcw size={15} /> : <Icon size={15} />}
                    {completed ? 'Tekrar göster' : 'Başlat'}
                  </Button>
                  {row.key === 'sales' &&
                    canManageInventory &&
                    !items.some(
                      item => item.companyId === activeCompany.id
                    ) && (
                      <Button
                        size="sm"
                        variant="primary"
                        isPending={isCreatingSample}
                        onPress={() => void createSampleProduct()}>
                        <Sparkles size={15} />
                        Örnek ürün ekle
                      </Button>
                    )}
                </div>
              );
            })}

            {moduleProgress.completedCount === moduleProgress.totalCount && (
              <div className="bg-success/10 text-success-700 rounded-2xl p-3 text-sm">
                Başlangıç adımlarını tamamladınız. Artık günlük kullanıma
                hazırsınız.
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              {progress.exampleProductId && canManageInventory && (
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => void removeSampleProduct()}>
                  <Trash2 size={15} />
                  Örnek ürünü sil
                </Button>
              )}
              {isPlatformAdmin && (
                <Button
                  size="sm"
                  variant="ghost"
                  onPress={() => void resetGuide()}>
                  <RotateCcw size={15} />
                  Rehberi sıfırla
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onPress={() => void dismissChecklist()}>
                <X size={15} />
                Rehberi gizle
              </Button>
              {moduleProgress.completedCount === moduleProgress.totalCount && (
                <Button
                  size="sm"
                  variant="primary"
                  onPress={() => void dismissChecklist()}>
                  Rehberi tamamla
                </Button>
              )}
            </div>
          </div>
        )}
      </Card.Content>
    </Card>
  );

  return compact ? (
    <div className="fixed right-3 bottom-20 z-40 w-[min(24rem,calc(100vw-1.5rem))] md:right-5 md:bottom-5">
      {content}
    </div>
  ) : (
    <div className="mb-6">{content}</div>
  );
};
