export type ChangelogItemType = 'new' | 'improved' | 'fixed';

export interface ChangelogEntry {
  id: string;
  date: string;
  title: string;
  items: Array<{ type: ChangelogItemType; text: string }>;
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    id: '2026-07-20',
    date: '20 Temmuz 2026',
    title: 'Kullanım iyileştirmeleri',
    items: [
      {
        type: 'new',
        text: 'Kategori hiyerarşinizi ve durum bilgilerini Excel veya CSV olarak dışa aktarabilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Müşteri telefon numaralarından arama, SMS, WhatsApp ve kopyalama işlemlerine hızlıca erişebilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Envanter listesi ve ürün formundaki barkodları ile ürün adlarını tek tıkla kopyalayabilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Müşteri ve envanter listelerindeki metinleri kolayca seçip kopyalayabilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Etiket, dışa aktarma ve ekstre seçimleri ile tarih alanları daha erişilebilir hale getirildi.'
      },
      {
        type: 'fixed',
        text: 'Beklenmeyen hata ekranının koyu temadaki okunabilirliği iyileştirildi.'
      }
    ]
  },
  {
    id: '2026-07-19',
    date: '19 Temmuz 2026',
    title: 'Satış ekranı ve kullanım kolaylığı',
    items: [
      { type: 'new', text: 'Koyu tema seçeneği eklendi.' },
      {
        type: 'improved',
        text: 'İçe aktarma önizlemesinde ürün adı ve barkoda göre arama yapabilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Satış tutarı ve sepet düzeni daha okunaklı hale getirildi.'
      },
      {
        type: 'fixed',
        text: 'Barkod cihazıyla okutulan ürünler doğrudan sepete eklenir.'
      }
    ]
  }
];

const CHANGELOG_SEEN_STORAGE_KEY = 'dijital-stok-last-seen-changelog';

export const hasUnseenChangelog = () =>
  localStorage.getItem(CHANGELOG_SEEN_STORAGE_KEY) !== CHANGELOG_ENTRIES[0]?.id;

export const markLatestChangelogSeen = () => {
  const latestId = CHANGELOG_ENTRIES[0]?.id;
  if (latestId) localStorage.setItem(CHANGELOG_SEEN_STORAGE_KEY, latestId);
};
