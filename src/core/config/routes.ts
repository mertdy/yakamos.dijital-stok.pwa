export const ROUTES = {
  LOGIN: '/giris',
  ONBOARDING: '/kurulum',
  DASHBOARD: '/',
  SALES: '/satis',
  SALES_HISTORY: '/satis-gecmisi',
  COMPANY_SETTINGS: '/sirket-ayarlari',
  ACCOUNT_SETTINGS: '/hesap-ayarlari',
  CHANGELOG: '/yenilikler',
  PRICING_PLANS: '/planlar-ve-fiyatlandirma',
  CATEGORIES: '/kategoriler',
  CUSTOMERS: {
    INDEX: '/musteriler',
    NEW: '/musteriler/yeni',
    EDIT: (id: string) => `/musteriler/duzenle/${id}`,
    EDIT_ROUTE: '/musteriler/duzenle/:id',
    DETAILS: (id: string) => `/musteriler/detay/${id}`,
    DETAILS_ROUTE: '/musteriler/detay/:id'
  },
  INVENTORY: {
    INDEX: '/envanter',
    NEW: '/envanter/yeni',
    NEW_WITH_BARCODE: (barcode: string) =>
      `/envanter/yeni?barcode=${encodeURIComponent(barcode)}`,
    EDIT: (id: string) => `/envanter/duzenle/${id}`,
    EDIT_ROUTE: '/envanter/duzenle/:id',
    PRINT: (id: string) => `/envanter?print=${id}`
  }
} as const;
