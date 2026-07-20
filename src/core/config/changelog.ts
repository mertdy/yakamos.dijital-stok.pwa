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
        type: 'new',
        text: 'Barkod okuturken ürünleri toplu olarak gözden geçirip adetlerini düzenledikten sonra sepete aktarabilirsiniz.'
      },
      {
        type: 'new',
        text: 'Barkod kamerasında uygun cihazlarda ön ve arka kamera arasında geçiş yapabilir, flaşı açabilirsiniz.'
      },
      {
        type: 'new',
        text: 'Barkod okutmayı başlatmadan önce kamera erişimini istediğiniz anda açabilirsiniz.'
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
        text: 'Müşteri, envanter ve kategori işlemlerinin ne yaptığını simgelerin üzerinde görebilirsiniz.'
      },
      {
        type: 'improved',
        text: 'İşlem simgelerinin açıklamaları artık daha hızlı görünür.'
      },
      {
        type: 'improved',
        text: 'Satış geçmişinizdeki kayıtları sayfalar halinde daha rahat gezebilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Etiket, dışa aktarma ve ekstre seçimleri ile tarih alanları daha erişilebilir hale getirildi.'
      },
      {
        type: 'improved',
        text: 'Envanterinizi stok, fiyat, kategori, durum ve güncelleme tarihine göre daha ayrıntılı filtreleyebilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Satış ekranında müşteri, indirim, ödeme ve para üstü seçimlerini tek adımda varsayılan hale getirebilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Satışta seçtiğiniz müşteri adı artık daha belirgin gösterilir.'
      },
      {
        type: 'improved',
        text: 'Satış geçmişi ve envanter filtrelerini yan panelden daha rahat düzenleyebilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Satış geçmişi araması ve envanterde seçili ürün işlemleri daha düzenli konumlandırıldı.'
      },
      {
        type: 'improved',
        text: 'Satış geçmişi ve müşteri kayıtlarını hızlı seçimler ile daha ayrıntılı filtreleyebilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Satış geçmişi filtrelerini bağlantı üzerinden paylaşabilir ve aynı seçimlerle tekrar açabilirsiniz.'
      },
      {
        type: 'improved',
        text: 'İçe aktarmada envanter ve müşteri verisi seçimi daha anlaşılır hale getirildi.'
      },
      {
        type: 'fixed',
        text: 'Beklenmeyen hata ekranının koyu temadaki okunabilirliği iyileştirildi.'
      },
      {
        type: 'fixed',
        text: 'İlk kullanımda yeni sürüm bildiriminin gereksiz yere görünmesi önlendi.'
      },
      {
        type: 'fixed',
        text: 'Satışı sıfırladığınızda ödeme yöntemi nakit seçeneğine geri döner.'
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
