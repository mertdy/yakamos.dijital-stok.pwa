import { useCallback, useEffect, useMemo } from 'react';
import { Button, Modal } from '@heroui/react';
import { Compass, PackagePlus, ShoppingCart, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  EVENTS,
  Joyride,
  STATUS,
  type EventData,
  type Step
} from 'react-joyride';
import { useAuthStore } from '@/features/auth';
import { ROUTES } from '@/core/config/routes';
import { useCustomerStore } from '@/features/customers';
import { normalizeWhatsAppPhone } from '@/features/customers/domain/customerStatement';
import { useThemeMode } from '@/shared/hooks/useThemeMode';
import { useOnboardingStore } from '../store/useOnboardingStore';

const findVisibleTarget = (name: string) => () => {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-onboarding="${name}"]`)
  );
  return (
    candidates.find(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }) ?? null
  );
};

export const OnboardingExperience = () => {
  const { user, activeMembership } = useAuthStore();
  const navigate = useNavigate();
  const { isDark } = useThemeMode();
  const customers = useCustomerStore(state => state.customers);
  const {
    loadOnboarding,
    isLoading,
    isWelcomeOpen,
    isTourRunning,
    markWelcomeSeen,
    startTour,
    completeModule,
    stopTour,
    activeModule
  } = useOnboardingStore();

  useEffect(() => {
    void loadOnboarding();
  }, [user?.uid, loadOnboarding]);

  const hasCustomerGuidePermission =
    (activeMembership?.role === 'OWNER' ||
      activeMembership?.permissions.includes('MANAGE_CUSTOMERS')) &&
    (activeMembership?.role === 'OWNER' ||
      activeMembership?.permissions.includes('SHARE_CUSTOMER_STATEMENT'));
  const moveTo = useCallback(
    (path: string) => async () => {
      navigate(path);
      await new Promise<void>(resolve =>
        requestAnimationFrame(() => resolve())
      );
    },
    [navigate]
  );

  const steps = useMemo<Step[]>(() => {
    const quickTourSteps: Step[] = [
      {
        target: findVisibleTarget('company-switcher'),
        title: 'İşletme seçimi',
        content:
          'Birden fazla işletmeye bağlıysanız, çalışmak istediğiniz işletmeyi buradan seçebilirsiniz.',
        placement: 'right'
      },
      {
        target: findVisibleTarget('main-navigation'),
        title: 'Ana navigasyon',
        content:
          'Anasayfa, satış, satış geçmişi, kampanyalar, müşteriler, envanter, kategoriler ve yetkiniz varsa Şirket Ayarları bağlantılarına buradan ulaşabilirsiniz.',
        placement: 'right'
      },
      {
        target: findVisibleTarget('sync-indicator'),
        title: 'Senkronizasyon durumu',
        content:
          'Verilerinizin bulutla eşitlenme durumunu buradan takip edebilirsiniz. Çevrim dışı kullanım hazır olduğunda da burada görünür.',
        placement: 'right'
      },
      {
        target: findVisibleTarget('profile-menu'),
        title: 'Profil menüsü',
        content:
          'Tema, hesap ayarları, destek, güncelleme kontrolü ve rehberi yeniden başlatma seçenekleri burada.',
        placement: 'right'
      }
    ];

    if (activeModule === 'quick-tour') return quickTourSteps;
    if (activeModule === 'sales') {
      return [
        {
          target: findVisibleTarget('sales-search'),
          title: 'Ürünü sepete ekleyin',
          content:
            'Ürün adı veya barkodla arayın; sonuçtan seçtiğiniz ürün sepete eklenir.',
          placement: 'bottom',
          before: moveTo(ROUTES.SALES)
        },
        {
          target: findVisibleTarget('sales-barcode-scanner'),
          title: 'Kameradan barkod okutun',
          content:
            'Kameranızı kullanarak ürün barkodunu okutabilir, ürünü doğrudan sepete ekleyebilirsiniz.',
          placement: 'bottom'
        },
        {
          target: findVisibleTarget('sales-cart'),
          title: 'Sepeti kontrol edin',
          content: 'Ürün adedini değiştirin veya gerekirse sepetten çıkarın.',
          placement: 'right'
        },
        {
          target: findVisibleTarget('sales-payment-methods'),
          title: 'Ödeme yöntemini seçin',
          content:
            'Nakit, kart, QR Kod veya veresiye seçeneklerinden uygun olanı seçin.',
          placement: 'left'
        },
        {
          target: findVisibleTarget('sales-checkout'),
          title: 'Ödemeyi alın',
          content: 'Ödemeyi Al ile satışı tamamlayabilirsiniz.',
          placement: 'left'
        },
        {
          target: findVisibleTarget('sales-customer-select'),
          title: 'Müşteri seçimi',
          content:
            'Veresiye satış yapmak veya müşteri hareketlerini satışla ilişkilendirmek için buradan müşteri seçin.',
          placement: 'left'
        },
        {
          target: findVisibleTarget('sales-quick-add'),
          title: 'Hızlı ekle menüsü',
          content:
            'Sık sattığınız ürünleri bu menüye ekleyerek tek dokunuşla sepete atabilirsiniz.',
          placement: 'left'
        },
        {
          target: findVisibleTarget('sales-hold'),
          title: 'Satışı bekletin',
          content:
            'Mevcut sepeti daha sonra devam etmek üzere beklemeye alabilir, yeni bir satışa geçebilirsiniz.',
          placement: 'left'
        },
        {
          target: findVisibleTarget('sales-reset'),
          title: 'Sepeti sıfırlayın',
          content:
            'Seçili müşteri, indirim, ödeme tercihi ve sepet içeriğini varsayılan satış durumuna döndürür.',
          placement: 'left',
          locale: { last: 'Bitir' }
        }
      ];
    }
    if (activeModule === 'inventory-filters') {
      return [
        {
          target: findVisibleTarget('inventory-filters'),
          title: 'Envanterde arama',
          content: 'Ürün adı veya barkodla listenizi hızla daraltabilirsiniz.',
          placement: 'bottom',
          before: moveTo(ROUTES.INVENTORY.INDEX)
        },
        {
          target: findVisibleTarget('inventory-advanced-filters'),
          title: 'Gelişmiş filtreler',
          content:
            'Kategori, stok, birim, fiyat ve güncelleme tarihine göre ayrıntılı filtreleme yapabilirsiniz.',
          placement: 'bottom'
        },
        {
          target: findVisibleTarget('inventory-new-product'),
          title: 'Yeni ürün ekleyin',
          content:
            'Yeni Ürün ile ürün adı, fiyat, stok, kategori ve barkod bilgilerini kaydedebilirsiniz.',
          placement: 'left'
        },
        {
          target: findVisibleTarget('inventory-edit-item'),
          title: 'Ürünü düzenleyin',
          content:
            'Bu butonla ürünün bilgilerini, stok ve fiyat ayarlarını güncelleyebilirsiniz.',
          placement: 'left'
        },
        {
          target: findVisibleTarget('inventory-print-label'),
          title: 'Etiket bastırın',
          content:
            'Seçtiğiniz ürün için barkod veya raf etiketi hazırlayıp yazdırabilirsiniz.',
          placement: 'left'
        },
        {
          target: findVisibleTarget('inventory-delete-item'),
          title: 'Ürünü silin',
          content:
            'Ürünü envanterden kaldırmadan önce bu butonla silme onayı vermeniz gerekir.',
          placement: 'left',
          locale: { last: 'Bitir' }
        }
      ];
    }
    if (activeModule === 'customers' && hasCustomerGuidePermission) {
      const customerWithWhatsApp = customers.find(customer =>
        Boolean(normalizeWhatsAppPhone(customer.phone))
      );
      const detailTarget = customerWithWhatsApp
        ? [
            {
              target: findVisibleTarget('customer-detail-action'),
              title: 'Müşteri detayları',
              content:
                'Hesap Detayı ile müşterinin hareketlerini açabilir, düzenleme ve WhatsApp ekstresi seçeneklerine ulaşabilirsiniz.',
              placement: 'left' as const,
              after: () =>
                navigate(ROUTES.CUSTOMERS.DETAILS(customerWithWhatsApp.id))
            },
            {
              target: findVisibleTarget('customer-whatsapp-statement'),
              title: 'WhatsApp ekstresi',
              content:
                'Ekstre dönemini seçip müşteriye WhatsApp üzerinden paylaşabilirsiniz.',
              placement: 'bottom' as const
            }
          ]
        : [];
      return [
        {
          target: findVisibleTarget('customer-new'),
          title: 'Yeni müşteri ekleyin',
          content:
            'Yeni Müşteri ile ad, telefon ve veresiye limitini kaydedebilirsiniz.',
          placement: 'bottom',
          before: moveTo(ROUTES.CUSTOMERS.INDEX),
          after: () => navigate(ROUTES.CUSTOMERS.NEW)
        },
        {
          target: findVisibleTarget('customer-form'),
          title: 'Müşteri bilgileri',
          content:
            'Telefon numarası eklemek, daha sonra WhatsApp ekstresi gönderebilmeniz için önemlidir.',
          placement: 'bottom',
          after: () => navigate(ROUTES.CUSTOMERS.INDEX)
        },
        ...detailTarget
      ];
    }
    return [];
  }, [activeModule, customers, hasCustomerGuidePermission, moveTo, navigate]);

  const handleTourEvent = (event: EventData) => {
    if (event.type !== EVENTS.TOUR_END) return;
    if (event.status === STATUS.FINISHED) {
      void completeModule(activeModule ?? 'quick-tour');
      return;
    }
    stopTour();
  };

  const isOwner = activeMembership?.role === 'OWNER';

  return (
    <>
      {!isLoading && (
        <Modal
          isOpen={isWelcomeOpen}
          onOpenChange={open => {
            if (!open) void markWelcomeSeen();
          }}>
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog className="bg-background w-full max-w-lg overflow-hidden rounded-3xl shadow-xl outline-none">
                <Modal.CloseTrigger />
                <Modal.Header className="flex flex-col items-center px-6 pt-8 text-center">
                  <Modal.Icon className="bg-primary/10 text-primary mb-3">
                    <Sparkles />
                  </Modal.Icon>
                  <Modal.Heading className="text-2xl">
                    Dijital Stok’a hoş geldiniz
                  </Modal.Heading>
                  <p className="text-default-500 mt-2 max-w-md text-sm">
                    {isOwner
                      ? 'Kısa turla temel alanları tanıyın; ardından ihtiyacınız olan rehberlere sırayla devam edin.'
                      : 'Günlük iş akışınızda kullanacağınız temel alanları kısa turla keşfedelim.'}
                  </p>
                </Modal.Header>
                <Modal.Body className="space-y-3 px-6 py-5">
                  {[
                    [Compass, 'Arayüzü kısa bir turla tanıyın'],
                    [PackagePlus, 'Envanter ve filtreleri keşfedin'],
                    [ShoppingCart, 'Satış akışını keşfedin']
                  ].map(([Icon, text]) => {
                    const ItemIcon = Icon as typeof Compass;
                    return (
                      <div
                        key={text as string}
                        className="border-default-200 flex items-center gap-3 rounded-2xl border p-3">
                        <span className="bg-primary/10 text-primary rounded-xl p-2">
                          <ItemIcon size={19} />
                        </span>
                        <span className="text-default-800 text-sm font-medium">
                          {text as string}
                        </span>
                      </div>
                    );
                  })}
                </Modal.Body>
                <Modal.Footer className="flex flex-col-reverse gap-2 px-6 pt-4 pb-6 sm:flex-row sm:justify-end">
                  <Button
                    variant="ghost"
                    onPress={() => void markWelcomeSeen()}>
                    Şimdilik atla
                  </Button>
                  <Button variant="primary" onPress={() => void startTour()}>
                    <Sparkles size={17} />
                    Başlayalım
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      )}

      <Joyride
        run={isTourRunning}
        continuous
        scrollToFirstStep
        steps={steps}
        onEvent={handleTourEvent}
        locale={{
          back: 'Geri',
          close: 'Kapat',
          last: 'Tamamla',
          next: 'Sonraki',
          nextWithProgress: 'Sonraki ({current}/{total})',
          open: 'Rehberi aç',
          skip: 'Atla'
        }}
        options={{
          buttons: ['back', 'skip', 'primary'],
          closeButtonAction: 'skip',
          dismissKeyAction: 'next',
          overlayClickAction: false,
          showProgress: true,
          skipBeacon: true,
          targetWaitTimeout: 2500,
          spotlightPadding: 8,
          spotlightRadius: 16,
          backgroundColor: isDark ? '#1f2937' : '#ffffff',
          arrowColor: isDark ? '#1f2937' : '#ffffff',
          textColor: isDark ? '#f3f4f6' : '#111827',
          primaryColor: '#0d7ff2',
          overlayColor: 'rgba(2, 6, 23, 0.68)',
          zIndex: 10000
        }}
      />
    </>
  );
};
