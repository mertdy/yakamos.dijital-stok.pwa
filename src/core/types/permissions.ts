import type { PermissionKey } from './tenant';

export interface PermissionMeta {
  label: string;
  shortLabel: string;
  description: string;
}

export const PERMISSION_META: Record<PermissionKey, PermissionMeta> = {
  VIEW_DASHBOARD: {
    label: 'Dashboard Görünümü',
    shortLabel: 'Dashboard',
    description:
      'Ciro, kar/zarar grafikleri ve günlük özet istatistiklerini görebilir.'
  },
  MANAGE_INVENTORY: {
    label: 'Envanter Yönetimi',
    shortLabel: 'Envanter',
    description:
      'Yeni ürün ekleyebilir, fiyatları düzenleyebilir ve ürün silebilir.'
  },
  MANAGE_CATEGORIES: {
    label: 'Kategori Yönetimi',
    shortLabel: 'Kategoriler',
    description:
      'Ürün kategorilerini ve alt kategorileri ekleyebilir, düzenleyebilir ve pasife alabilir.'
  },
  MANAGE_CUSTOMERS: {
    label: 'Müşteri Yönetimi',
    shortLabel: 'Müşteriler',
    description:
      'Yeni veresiye müşteri ekleyebilir ve müşteri limitini güncelleyebilir.'
  },
  TAKE_PAYMENT: {
    label: 'Ödeme Alıcı',
    shortLabel: 'Ödemeler',
    description: 'Müşterilerden tahsilat kaydedebilir ve borcu düşürebilir.'
  },
  SHARE_CUSTOMER_STATEMENT: {
    label: 'WhatsApp Ekstresi Paylaş',
    shortLabel: 'Ekstre Paylaşımı',
    description:
      'Müşterilerin hesap ekstrelerini önizleyebilir ve WhatsApp üzerinden paylaşabilir.'
  },
  VIEW_SALES_HISTORY: {
    label: 'Satış Geçmişi',
    shortLabel: 'Satış Geçmişi',
    description: 'Tüm çalışanların geçmiş satış faturalarını görebilir.'
  },
  MANAGE_SALES_HISTORY: {
    label: 'Satış İptali',
    shortLabel: 'Satış İptali',
    description:
      'Geçmiş satış faturalarını iptal edebilir ve stoğu geri yükleyebilir.'
  },
  MANAGE_COMPANY_QUICK_ADD: {
    label: 'Şirket Hızlı Menüsünü Yönet',
    shortLabel: 'Hızlı Menü',
    description:
      'Şirketin ortak hızlı ekleme menüsündeki ürünleri ekleyebilir, çıkarabilir ve sıralayabilir.'
  },
  MANAGE_PROMOTIONS: {
    label: 'Kampanyaları Yönet',
    shortLabel: 'Kampanyalar',
    description:
      'Kampanya ve otomatik fiyat kurallarını oluşturabilir, düzenleyebilir ve satış sırasında gerekçeyle kaldırabilir.'
  }
};

export const AVAILABLE_PERMISSIONS = (
  Object.keys(PERMISSION_META) as PermissionKey[]
).map(key => ({ key, ...PERMISSION_META[key] }));
