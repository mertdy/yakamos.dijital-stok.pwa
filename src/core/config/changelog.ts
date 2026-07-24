export type ChangelogItemType = 'new' | 'improved' | 'fixed';

export interface ChangelogEntry {
  id: string;
  date: string;
  title: string;
  items: Array<{ type: ChangelogItemType; text: string }>;
}

export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    id: '2026-07-24',
    date: '24 Temmuz 2026',
    title: 'Mobil kullanım iyileştirmeleri',
    items: [
      {
        type: 'new',
        text: 'Mobil uygulamada Anasayfa, Satış, Envanter ve Müşteriler için sade bir alt menü; diğer işlemler için tek bir uygulama menüsü eklendi.'
      },
      {
        type: 'improved',
        text: 'İşletme seçimi, hesap işlemleri, destek, güncelleme ve senkronizasyon durumu mobil menüde daha ferah ve kolay erişilebilir hale getirildi.'
      },
      {
        type: 'improved',
        text: 'Mobil satış ekranı, sepeti öne çıkaran sabit ödeme adımı ile hızlı ekleme ve ödeme seçeneklerini alttan açılan panellere taşıyan POS düzenine kavuştu.'
      },
      {
        type: 'improved',
        text: 'Müşteri seçimi ve bekleyen satışlar, telefonda daha rahat kullanılmak üzere alttan açılan panellerde görüntülenir.'
      },
      {
        type: 'improved',
        text: 'Mobil satış ekranındaki menü düğmesi, uygulamanın işletme ve hesap seçeneklerini içeren ana menüsünü açar.'
      },
      {
        type: 'improved',
        text: 'Mobil uygulama menüsündeki işletme seçici, aktif işletmenin adını gösteren tam genişlikli bir düğme olarak görüntülenir.'
      },
      {
        type: 'improved',
        text: 'Mobil alt bardaki hesap fotoğrafı, tema ve hesap işlemlerini içeren kullanıcı menüsünü açar.'
      },
      {
        type: 'improved',
        text: 'Mobil satış başlığı, uygulamanın diğer sayfalarıyla uyumlu boşluk ve yüzey düzenine kavuştu.'
      },
      {
        type: 'improved',
        text: 'Mobil üst başlıktaki uzun işletme adları tek satırda kısaltılarak daha düzenli görüntülenir.'
      },
      {
        type: 'improved',
        text: 'Kayıt ekranında Google ile hızlı kayıt öne çıkarılır; e-posta ile kayıt formu yalnızca seçtiğinizde açılır.'
      },
      {
        type: 'improved',
        text: 'Giriş ekranındaki uygulama simgesi daha sade ve temiz bir görünümle görüntülenir.'
      }
    ]
  },
  {
    id: '2026-07-23',
    date: '23 Temmuz 2026',
    title: 'Kullanım iyileştirmeleri',
    items: [
      {
        type: 'new',
        text: 'Platform destek yöneticisi, seçilen kullanıcının yetkilerini geçici olarak yansıtan süreli destek oturumu açabilir; işlemler destek yöneticisi olarak kaydedilir.'
      },
      {
        type: 'new',
        text: 'Başlangıç rehberinde kısa uygulama turu ile satış, envanter filtreleri ve müşteri yönetimi için ayrı başarımlar bulunur.'
      },
      {
        type: 'improved',
        text: 'Başlangıç rehberi ilerlemesi artık işletmeye göre ayrılmadan hesabınız için tek kez kaydedilir.'
      },
      {
        type: 'improved',
        text: 'Sabit başlangıç rehberi kartına, tüm rehberi atlayan hızlı kapatma düğmesi eklendi.'
      },
      {
        type: 'improved',
        text: 'Destek oturumu açarken işletme ve kullanıcı listelerinde arama yapılabilir; tanımlı çalışan adı ve e-posta birlikte görüntülenir.'
      },
      {
        type: 'improved',
        text: 'Başlangıç rehberini gizleme seçeneği, rehberi tamamlama eyleminin yanına taşındı.'
      },
      {
        type: 'improved',
        text: 'Platform yöneticisi başlangıç rehberinin ilerlemesini istediği zaman sıfırlayabilir.'
      },
      {
        type: 'improved',
        text: 'Kısa uygulama turu sayfa başlıklarını ve satış ekranındaki arama alanını hedefleyerek daha rahat takip edilir; sabit rehber kartından bir modül başlatınca kart otomatik küçülür.'
      },
      {
        type: 'improved',
        text: 'Müşteri yönetimi rehberindeki WhatsApp ekstresi adımı doğrudan paylaşım butonunu gösterir.'
      },
      {
        type: 'improved',
        text: 'Başlangıç rehberi başarımları artık satış ya da müşteri kaydı zorunlu olmadan ilgili rehberin tüm adımlarını tamamlayınca işaretlenir.'
      },
      {
        type: 'improved',
        text: 'Tamamlanan başlangıç rehberi modüllerindeki Tekrar göster eylemleri tutarlı yeniden dene ikonu kullanır.'
      },
      {
        type: 'improved',
        text: 'Kısa uygulama turu artık anasayfadan ayrılmadan işletme seçimini, tüm navigasyon bağlantılarını tek adımda, senkronizasyon durumunu ve profil menüsünü tanıtır.'
      },
      {
        type: 'improved',
        text: 'İlk satış rehberi ürün arama, kameradan barkod okutma, ödeme, müşteri seçimi, hızlı ekle, sepeti bekletme ve sıfırlama adımlarını açıklar.'
      },
      {
        type: 'improved',
        text: 'Satış ekranı daha hızlı açılır; kamera ve fiş yazdırma özellikleri uygulama kullanıma hazır olduktan sonra çevrim dışı kullanım için arka planda hazırlanır.'
      },
      {
        type: 'improved',
        text: 'Envanter rehberi yeni ürün eklemeyi ve listedeki ürünün düzenleme, etiket bastırma, silme eylemlerini ayrı adımlarda anlatır.'
      },
      {
        type: 'improved',
        text: 'Başlangıç rehberindeki kullanılmayan eski hedefler ve aksiyonlar temizlendi.'
      },
      {
        type: 'fixed',
        text: 'Ödeme kartındaki satışla ilişkisiz geçici fatura numarası kaldırıldı.'
      },
      {
        type: 'fixed',
        text: 'Fiş ve tahsilat makbuzlarında sabit uygulama adı yerine işletmenizin fiş başlığı veya adı gösterilir.'
      },
      {
        type: 'fixed',
        text: 'Satış rehberi açılırken satış ekranı ve ilk hedef alan hazırlandıktan sonra tur başlatılır; ilk adım artık atlanmaz.'
      },
      {
        type: 'fixed',
        text: 'Sabit başlangıç rehberi kartındaki açma-kapatma düğmesi başlığın sağ üstünde hizalanır.'
      }
    ]
  },
  {
    id: '2026-07-22',
    date: '22 Temmuz 2026',
    title: 'Kullanım iyileştirmeleri',
    items: [
      {
        type: 'new',
        text: 'İşletme sahibi ve çalışanlar, yetkilerine uygun başlangıç rehberiyle arayüzü tanıyabilir, ilk ürünü hazırlayabilir ve ilk gerçek satışını takip edebilir.'
      },
      {
        type: 'improved',
        text: 'Başlangıç rehberindeki yönlendirme metinleri Türkçeleştirildi ve rehber kartı daha okunaklı hale getirildi.'
      },
      {
        type: 'improved',
        text: 'Başlangıç rehberi artık Envanter ve Satış ekranlarında ürün ekleme, sepet, ödeme yöntemi ve gerçek satış tamamlama adımlarını gösteriyor.'
      },
      {
        type: 'improved',
        text: 'Başlangıç rehberinin son adımında, satış yapmadan da turu Bitir seçeneğiyle kapatabilirsiniz.'
      },
      {
        type: 'fixed',
        text: 'Destek kaydı açıklama alanında başlığı ve yazı alanını daha düzenli görebilirsiniz.'
      },
      {
        type: 'fixed',
        text: 'Google ile giriş penceresini kapattığınızda artık gereksiz hata uyarısı görmezsiniz.'
      }
    ]
  },
  {
    id: '2026-07-21',
    date: '21 Temmuz 2026',
    title: 'Kampanyalar ve kullanım iyileştirmeleri',
    items: [
      {
        type: 'new',
        text: 'Kampanyalar sayfasından ödeme, ürün, kategori ve sepet koşullarına göre otomatik indirim veya ek ücret kuralları oluşturabilirsiniz.'
      },
      {
        type: 'new',
        text: 'Satış sırasında uygulanan fiyat kurallarını ve toplam tutara etkilerini görebilirsiniz.'
      },
      {
        type: 'new',
        text: 'Profil menüsünden uygulama güncellemelerini istediğiniz zaman kontrol edebilirsiniz.'
      },
      {
        type: 'new',
        text: 'Seçtiğiniz envanter ürünlerinin kategori, birim, vergi, fiyat ve stok ayarlarını toplu olarak güncelleyebilirsiniz.'
      },
      {
        type: 'new',
        text: 'Veri dışa aktarmada kampanyaları, ortak hızlı ekle menüsünü ve ekstre paylaşım kayıtlarını seçebilir; işlem tarih aralığını ve kayıt özetini görebilirsiniz.'
      },
      {
        type: 'new',
        text: 'Kategori aramasını tek dokunuşla temizleyebilirsiniz.'
      },
      {
        type: 'new',
        text: 'Şirket ayarlarından işletme verilerinizi tek ZIP paketiyle boş bir hedef işletmeye güvenle aktarabilirsiniz.'
      },
      {
        type: 'new',
        text: 'Profil menüsündeki Destek alanından hata, destek isteği veya önerinizi açıklama, isteğe bağlı ekran görüntüsü ve teknik kayıtlarla iletebilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Yetkili kullanıcılar otomatik fiyat kuralını gerekçe ekleyerek yalnızca ilgili satış için kaldırabilir.'
      },
      {
        type: 'improved',
        text: 'Veri dışa aktarmada ayrı dosyaları ZIP içinde veya tüm verileri tek dosyada almayı daha açık şekilde seçebilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Fiyat kuralı hedef ürünlerini ürün adı veya barkodla daha hızlı arayıp seçebilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Kampanya yönetimi için çalışanlara Kampanyaları Yönet yetkisi verebilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Fiyat kurallarını zaman sınırı olmadan veya belirli tarih, saat ve günlerde uygulanacak şekilde ayarlayabilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Yeni fiyat kuralı ekranı geniş ürün listelerinde daha hızlı açılır.'
      },
      {
        type: 'improved',
        text: 'Hızlı ekle menüsünü düzenlerken ürün aramasını sabit tutup iki listeyi ayrı ayrı kaydırabilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Hızlı ekle menüsü yüklenirken ürünler hazır olana kadar yükleme durumunu görebilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Koyu temada form alanlarının çerçevelerini daha belirgin görebilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Kategorilerdeki ürünleri daha kompakt bir liste halinde görüntüleyebilirsiniz.'
      },
      {
        type: 'improved',
        text: 'Kategori ürün listesindeki ürünler artık ada göre alfabetik sıralanır.'
      },
      {
        type: 'improved',
        text: 'Envanter açıldığında son güncellenen ürünler listenin başında görünür.'
      },
      {
        type: 'improved',
        text: 'Çalışan davetinde seçtiğiniz hazır ünvana uygun yetkiler otomatik olarak belirlenir.'
      },
      {
        type: 'fixed',
        text: 'Fiyat kuralı hedef ürün seçimlerinin ve koyu temadaki görünümünün tutarlılığı iyileştirildi.'
      },
      {
        type: 'fixed',
        text: 'Barkod cihazıyla art arda ürün okuturken satışın yanlışlıkla tamamlanması engellendi.'
      },
      {
        type: 'fixed',
        text: 'Koyu temada bekleyen davetiyelerin bilgi ve yetki etiketleri daha okunaklı hale getirildi.'
      },
      {
        type: 'fixed',
        text: 'Yeni fiyat kuralında hedef kategorilerin yüklenmesi ve görüntülenmesi daha güvenilir hale getirildi.'
      },
      {
        type: 'fixed',
        text: 'Kategori ürün listesini açtığınızda tüm kategorilere yeniden kaydırarak ulaşabilirsiniz.'
      },
      {
        type: 'fixed',
        text: 'Telefon numarası alanının köşeleri ve yazı hizası daha tutarlı hale getirildi.'
      },
      {
        type: 'fixed',
        text: 'Envanter, müşteri ve satış geçmişi aramalarını temizlediğinizde sonuçlar ve bağlantıdaki arama bilgisi birlikte sıfırlanır.'
      }
    ]
  },
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
        text: 'Envanterde filtrelediğiniz tüm ürünleri, sayfalama dışındaki kayıtlar dahil, tek işlemle seçebilirsiniz.'
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
