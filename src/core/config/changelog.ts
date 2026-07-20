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
        text: 'Satış, ödeme, arama ve sepet işlemlerini klavye kısayollarıyla daha hızlı yapabilir; profil menüsünden tüm kısayolları görüntüleyebilirsiniz.'
      },
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
        type: 'new',
        text: 'Hızlı ekle alanında kişisel ve şirket ortak menüleri arasında geçiş yapabilirsiniz.'
      },
      {
        type: 'new',
        text: 'Barkod okutarak ürünün satış fiyatını görebilir ve son baktığınız ürünü sepete ekleyebilirsiniz.'
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
        type: 'improved',
        text: 'Yetkili çalışanlar şirketin ortak hızlı ekleme menüsünü düzenleyebilir.'
      },
      {
        type: 'improved',
        text: 'Kamera izni daha önce verildiyse barkod okuyucu doğrudan açılır.'
      },
      {
        type: 'improved',
        text: 'Barkod okutma tekli ve çoklu modları daha kolay seçilebilir hale getirildi.'
      },
      {
        type: 'improved',
        text: 'Fiyatını görüntülediğiniz ürünü inceleyebilir veya tek adet olarak sepete ekleyebilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Tema, hızlı ekleme sekmesi ve barkod okutma modu tercihleriniz hesabınızla hatırlanır.'
      },
      {
        type: 'improved',
        text: 'Giriş ekranında koyu temayı daha rahat kullanabilir ve tema tercihinizi değiştirebilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Giriş ekranındaki uygulama logosu yenilendi.'
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
      },
      {
        type: 'fixed',
        text: 'Hızlı ekle menüsünü açarken oluşan beklenmeyen hata giderildi.'
      },
      {
        type: 'fixed',
        text: 'Barkod okutma modunu değiştirdikten sonra ürünler doğru işleme aktarılır.'
      },
      {
        type: 'fixed',
        text: 'Giriş ekranındaki tema anahtarının çalışması düzeltildi.'
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
