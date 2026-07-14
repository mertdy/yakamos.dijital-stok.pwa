# Dijital Stok Ürün ve Pazar Değerlendirme Raporu

Projeyi kod, mevcut dokümantasyon ve Türkiye’deki güncel POS/stok yazılımı pazarıyla birlikte değerlendirdim.

Kısa sonuç: Dijital Stok’un temeli güçlü ve pazarlanabilir. Özellikle offline POS + barkod + veresiye + mobil kullanım birleşimi küçük işletmeler için değerli. Ancak ürün şu anda daha çok “iyi bir satış ve stok takip uygulaması” seviyesinde. Müşterinin mevcut programını bırakıp buna geçmesini sağlayacak kritik satın alma nedenleri henüz eksik: kâr/maliyet, alış–tedarikçi, e-Fatura/e-Arşiv, stok hareketleri/sayım, veri aktarımı ve otomatik veresiye hatırlatma.

## Projenin mevcut yetenekleri

Kodda gerçekten uygulanmış görünen başlıca yetenekler:

- Web, PWA, Android ve iOS hedefleyen yapı
- İnternet kesildiğinde çalışabilen Firestore tabanlı offline mimari
- Barkod okuyucu:
  - Fiziksel barkod okuyucu
  - Web kamerası
  - Mobilde ML Kit
- Barkod bulunamadığında Open Food Facts üzerinden ürün bilgisi getirme
- Hızlı satış ekranı
- Nakit, kart, QR ve veresiye ödeme
- Sepet indirimi
- Bekleyen/askıya alınan satışlar
- Fiş ve tahsilat makbuzu yazdırma
- Ürün ve stok yönetimi
- Müşteri ve veresiye hesabı
- Veresiye limiti
- Tahsilat alma ve müşteri ekstresi
- Satış geçmişi, filtreleme ve satış iptali
- İptalde stok ve müşteri borcunu geri alma
- Ciro, sipariş, ortalama sepet ve borç dashboard’u
- Kritik stok ve en çok satan ürünler
- Çoklu işletme
- Çalışan daveti ve ayrıntılı yetkilendirme
- PostHog ürün analitiği ve mobil Crashlytics altyapısı
- Unit ve E2E test altyapısı

Bu kombinasyon özellikle bakkal, büfe, küçük market, petshop, kuruyemişçi, butik, yedek parçacı ve yerel perakendeci segmentinde anlamlı.

## Pazarda öne çıkan beklentiler

Türkiye’de rakiplerin tekliflerinde tekrar tekrar görülen özellikler şunlar:

- e-Fatura/e-Arşiv
- Cari hesap ve geciken alacak takibi
- Tedarikçi ve alış faturası
- Stok hareketleri ve stok sayımı
- Kâr-zarar, gelir-gider ve gün sonu
- Şube, kasa ve vardiya yönetimi
- Barkod etiketi
- E-ticaret/pazaryeri stok senkronizasyonu

Örneğin Dize/Stok Bulut; alış faturası, stok hareketi, sayım, firmalar, gün sonu, gelir-gider ve çoklu şubeyi birlikte sunuyor. Ticari Bulut ve benzer ön muhasebe ürünleri e-Fatura/e-Arşiv’i doğrudan satış mesajına dönüştürüyor. Pazaryeri tarafında ise stok, sipariş, fiyat, fatura ve kargo senkronizasyonu standart beklenti haline geliyor. [Stok Bulut](https://stokbulut.com/), [Ticari Bulut](https://www.ticaribulut.com/on-muhasebe-programi), [Cari](https://www.cari.com.tr/entegrasyonlar/sanalpos-online-tahsilat-sistemi), [Ticopti](https://www.ticopti.com/)

Dolayısıyla müşteri kazanmak için “daha fazla dashboard grafiği” değil, işletmenin para ve operasyon problemlerini doğrudan çözen özellikler öncelikli olmalı.

# En yüksek müşteri kazanım potansiyeline sahip özellikler

## 1. Maliyet, KDV ve gerçek kâr takibi

Bence birinci öncelik bu olmalı.

Mevcut ürün modelinde yalnızca satış fiyatı ve stok var. Alış maliyeti, KDV, kategori, birim ve kâr marjı bulunmuyor. Dashboard ciro gösteriyor fakat işletme sahibinin asıl sorusu genellikle şudur:

> “Bugün ne kadar sattım?” değil, “Bugün gerçekten ne kadar kazandım?”

Eklenmesi gerekenler:

- Alış fiyatı
- Ortalama maliyet
- Satış fiyatı
- KDV oranı
- Ürün başına brüt kâr ve marj
- İndirim sonrası gerçek kâr
- Günlük/aylık brüt kâr
- En çok kazandıran ürünler
- Satıldığı halde zarar ettiren ürünler
- Maliyeti değişen ürün uyarısı
- Hedef marja göre önerilen satış fiyatı

Bu özellik hem satış demosunda çok etkileyici olur hem de günlük kullanım değerini ciddi biçimde yükseltir.

## 2. Tedarikçi, alış faturası ve stok giriş sistemi

Bugün stok yalnızca ürün kartındaki sayı değiştirilerek yönetiliyor. Bu, gerçek işletme operasyonunu tam karşılamıyor.

Eklenmesi gereken akış:

- Tedarikçi kartları ve cari hesapları
- Alış faturası oluşturma
- Alış faturasıyla toplu stok artırma
- Vadeli tedarikçi borcu
- Tedarikçiye ödeme
- Ürünün son ve ortalama alış maliyeti
- İade edilen alışlar
- Sipariş verilmesi gereken ürün listesi
- Tedarikçiye göre alış önerisi
- Alış faturası fotoğrafı veya PDF eki

Bu modül eklendiğinde ürün “POS” olmaktan çıkıp küçük işletmenin ana yönetim sistemine dönüşür. Bu da kullanıcı değiştirme maliyetini ve müşteri bağlılığını artırır.

## 3. WhatsApp üzerinden veresiye ekstresi ve ödeme hatırlatma

Düşük geliştirme maliyetine karşı çok yüksek müşteri değeri üretebilir.

Önerilen akış:

- Müşteri detayında “WhatsApp’tan ekstre gönder”
- Güncel borç, son işlemler ve işletme bilgisi içeren hazır mesaj
- PDF veya bağlantı olarak hesap ekstresi
- Vadesi geçen borçlar için otomatik hatırlatma
- “Ödeme sözü” tarihi
- Son hatırlatma tarihi
- Toplu fakat kontrollü gönderim
- Tahsilat sonrası teşekkür mesajı

Örnek mesaj:

> Merhaba Ahmet Bey, Yakamoz Market hesabınızdaki güncel bakiye 2.450 TL’dir. Hesap detayınız: …

Bu özellik özellikle veresiye çalışan bakkal, toptancı ve yerel esnafta güçlü bir satış argümanıdır. İlk sürüm WhatsApp’ın hazır mesaj bağlantısıyla yapılabilir; daha sonra resmi WhatsApp Business entegrasyonuna geçilebilir.

## 4. e-Fatura/e-Arşiv ve muhasebeci entegrasyonu

Türkiye pazarı için en önemli güven ve profesyonellik özelliklerinden biri.

Seçenekler:

- Bir özel entegratörle e-Fatura/e-Arşiv entegrasyonu
- Satıştan doğrudan e-Arşiv oluşturma
- Müşterinin VKN/TCKN ve vergi dairesi bilgileri
- Kurumsal/perakende müşteri ayrımı
- Fatura PDF’i paylaşma
- Muhasebeciye dönemsel aktarım
- Logo, Mikro, Paraşüt veya benzeri sistemlere aktarım
- İlk aşamada standart Excel/CSV muhasebe çıktısı

Bu özellik teknik ve mevzuatsal olarak daha maliyetlidir; bu yüzden ilk sürümde entegratör ortaklığı tercih edilmeli. GİB’in e-Arşiv gereklilikleri nedeniyle uygulamayı kendi başına mali belge üreticisi gibi konumlandırmamak gerekir. [GİB e-Arşiv bilgilendirmesi](https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Finfografikler%2Fpdfs%2F2025_e_arsiv_fatura.pdf)

## 5. Stok hareketleri, sayım ve fark düzeltme

Şu anda “stok neden 12 oldu?” sorusunun sağlam bir cevabı yok. Her ürün için değişmez bir stok hareket defteri oluşturulmalı.

Hareket türleri:

- Satış
- Satış iptali
- Alış
- Alış iadesi
- Stok sayım farkı
- Fire/bozulma
- Şubeler arası transfer
- Manuel düzeltme

Her harekette:

- Önceki stok
- Değişim miktarı
- Yeni stok
- İşlemi yapan çalışan
- Tarih
- Açıklama/referans

Mobil barkodlu stok sayımı özellikle güçlü olur: çalışan rafları dolaşır, ürünü okutur, gerçek adedi girer; sistem fark raporu çıkarır.

## 6. CSV/Excel içe ve dışa aktarma

Bu özellik müşteri dönüşümünün önündeki en büyük engellerden birini kaldırır:

> “Benim mevcut ürünlerimi ve müşterilerimi tek tek mi gireceğim?”

Eklenmesi gerekenler:

- Ürün Excel/CSV içe aktarma
- Müşteri ve açılış bakiyesi aktarma
- Örnek şablon indirme
- Kolon eşleştirme ekranı
- Hatalı satırların açıklamalı gösterilmesi
- Ön izleme ve geri alma
- Ürün, müşteri, satış ve stok raporlarını dışa aktarma

Dokümanda rapor dışa aktarımı destekleniyor denmiş olsa da uygulama kodunda çalışan bir dışa aktarım akışı görünmüyor. Roadmap’te de hâlâ planlanan özellik olarak yer alıyor.

## 7. Gün sonu, kasa ve vardiya yönetimi

Birden fazla çalışanı olan işletmeler için önemli satın alma nedeni:

- Kasayı açan çalışan
- Açılış nakdi
- Vardiya başlangıç/bitiş saati
- Beklenen nakit
- Sayılan nakit
- Kasa farkı
- Kart/QR/nakit/veresiye dağılımı
- İptal ve indirim özeti
- Çalışan bazlı satış
- Z raporu benzeri gün sonu özeti
- Yönetici onayı

Çoklu çalışan yetkilendirme zaten bulunduğu için bu özellik mevcut altyapının doğal devamı.

## 8. Barkod etiketi ve raf fiyat etiketi basma

Perakendecilerin hemen anlayacağı, demoda kolay gösterilen bir özellik:

- Ürün veya toplu seçimden barkod etiketi
- EAN-13/Code 128 desteği
- Fiyatlı/fiyatsız etiket şablonları
- A4 ve termal yazıcı desteği
- Raf etiketi
- Fiyat değişen ürünlerin etiket kuyruğu
- Terazi barkodu desteği

Özellikle barkodsuz ürün satan işletmelerde müşteri kazanımını artırır.

## 9. Kampanya, sadakat ve müşteri segmentasyonu

Yeni müşteri kazanmaktan çok mevcut müşterinin uygulamayı bırakmasını engeller ve işletmenin kendi müşterisini geri getirmesini sağlar.

- Puan sistemi
- “10 alışverişe 1 hediye”
- Ürün veya kategori bazlı kampanya
- İkinci ürüne indirim
- Müşteriye özel fiyat
- Doğum günü kuponu
- Uzun süredir gelmeyen müşteriler
- En değerli müşteriler
- Ortalama alışveriş sıklığı
- Kampanya sonucunda üretilen ek ciro

Önce basit puan ve müşteri segmentiyle başlanmalı; karmaşık kampanya motoru daha sonra yapılabilir.

## 10. Pazaryeri ve e-ticaret entegrasyonları

Hedef kitle butik ve çevrim içi satıcıları da kapsayacaksa çok güçlü bir büyüme kanalıdır:

- Trendyol, Hepsiburada, N11
- WooCommerce, Shopify, ikas
- Merkezi stok senkronizasyonu
- Siparişleri tek ekranda toplama
- Kanal bazlı fiyat
- Komisyon ve kargo sonrası net kâr
- İade yönetimi
- Kritik stok koruması

Pazarda ürün, stok, sipariş, fiyat, fatura ve kargoyu tek panelde yönetme vaadi yoğun biçimde kullanılıyor. [TrendEntegre](https://www.trendentegre.com.tr/features), [Livius](https://livius.com.tr/), [EntegraGO](https://entegrago.com/)

Ancak bunu ilk aşamaya koymam. Önce fiziksel perakende çekirdeği tamamlanmalı; sonra ayrı bir ücretli paket olarak sunulmalı.

# Kullanıcı deneyimini artıracak iyileştirmeler

## İlk kullanım deneyimi

Mevcut onboarding ağırlıklı olarak işletme oluşturuyor. Bunun yerine adım adım başarı akışı olmalı:

1. İşletmeni oluştur.
2. İlk ürününü ekle veya Excel’den aktar.
3. Barkod okuyucunu dene.
4. İlk deneme satışını yap.
5. İlk müşterini oluştur.
6. Fiş ayarlarını tamamla.

Ayrıca boş dashboard yerine örnek veriler veya yönlendirici görev listesi gösterilmeli.

## Rol bazlı ana ekran

İşletme sahibi ile kasiyer aynı ana ekrana ihtiyaç duymaz:

- İşletme sahibi: ciro, kâr, borç, kritik stok, kasa farkı
- Kasiyer: doğrudan satış ekranı, vardiya durumu, bekleyen satışlar
- Depo çalışanı: sayım, mal kabul, kritik stok, transferler

## Satış ekranında hız

- Tam klavye kullanımı
- Numpad desteği
- Hızlı ürün tuşları/favoriler
- Kategori sekmeleri
- Son satılan ürünler
- Tek dokunuşla adet artırma
- Tartılı ürün girişi
- Satır bazlı indirim
- Bölünmüş ödeme: bir kısmı nakit, bir kısmı kart
- Para üstü hesaplama
- Satıştan sonra otomatik yeni satışa geçiş
- Kasiyerin değiştiremeyeceği yönetici kontrollü fiyat/indirim

Özellikle bölünmüş ödeme ve para üstü hesabı günlük POS kullanımında önemli eksikler.

## Arama ve tablo deneyimi

- Türkçe karakter duyarsız arama
- Barkod, SKU, ad ve kategori üzerinden birleşik arama
- Kaydedilmiş filtreler
- Sütun seçimi
- Toplu fiyat ve stok güncelleme
- Sayfalama veya sanal liste
- Mobilde tablo yerine kart görünümü
- Son yapılan işlemi geri alma

## Bildirim merkezi

- Kritik stok
- Veresiye limiti aşımı
- Geciken alacak
- Başarısız senkronizasyon
- Gün sonu yapılmadı
- Bekleyen çalışan daveti
- Maliyetin altındaki satış fiyatı
- Stoksuz satış

Bildirimler uygulama içi, push ve isteğe bağlı WhatsApp/e-posta olarak sınıflandırılabilir.

# Teknik olarak önce sağlamlaştırılması gereken noktalar

Bunlar doğrudan pazarlama özelliği değildir ama müşteri güveni açısından kritik:

- Firestore güvenlik kuralları repoda görünmüyor. Çoklu işletme izolasyonu yalnızca istemci sorgularına bırakılamaz.
- Bazı satış yazma işlemleri tamamlanması beklenmeden başarılı kabul ediliyor. Senkronizasyon başarısız olsa bile kullanıcı satış tamamlandı sanabilir.
- Satış geçmişi yalnızca son 500 kaydı çekiyor ve filtreleri tarayıcıda uyguluyor. Büyüyen işletmelerde raporlar eksik görünebilir.
- Fatura numarası zaman damgasının son altı hanesinden üretiliyor; sıra, benzersizlik ve işletme/kasa bazlı numaralandırma güçlendirilmeli.
- Ürün silme geçmiş satışların referans bütünlüğünü etkileyebilir. Kalıcı silme yerine arşivleme kullanılmalı.
- Stok güncellemeleri eşzamanlı kasalarda negatif stok ve yarış koşullarına karşı transaction/Cloud Function ile korunmalı.
- Satış iptalinde mevcut stok okunup yeni değer yazılıyor; eşzamanlı satışlarda veri kaybı oluşabilir. Atomik `increment` tercih edilmeli.
- Müşteri kredi limiti gösteriliyor fakat satış sırasında limit aşımını gerçekten engelleyen veya yönetici onayı isteyen bir kontrol görünmüyor.
- “Offline” göstergesi bağlantıyı gösteriyor; işlemin gerçekten sunucuya senkronize edildiğini garanti etmiyor. “Bekleyen 3 işlem / son senkronizasyon” gibi gerçek kuyruk durumu gösterilmeli.
- PWA manifestinde uygulama ikonları tanımlı görünmüyor; kurulum deneyimi tamamlanmalı.
- Route seviyesinde lazy loading yapılmadığı için ilk paket gereksiz büyüyebilir.

# Önerdiğim ürün yol haritası

| Aşama | Özellikler | Ticari amaç |
|---|---|---|
| İlk 4–6 hafta | Maliyet/KDV/kâr, stok hareketleri, CSV içe/dışa aktarma, WhatsApp ekstre, kredi limiti kontrolü | Demo dönüşümünü ve mevcut programdan geçişi artırmak |
| Sonraki 6–10 hafta | Tedarikçi, alış faturası, stok sayımı, barkod etiketi, gün sonu/kasa | Ürünü günlük işletme sistemi haline getirmek |
| Sonraki dönem | e-Fatura/e-Arşiv entegrasyonu, gelişmiş raporlar, vardiya ve çoklu kasa | Daha yüksek ücretli işletme paketine geçmek |
| Büyüme paketi | Sadakat, kampanya, pazaryeri ve e-ticaret entegrasyonu | Yeni müşteri segmentleri ve ek gelir |
| İleri aşama | Talep tahmini, otomatik sipariş önerisi, anomali tespiti | Premium farklılaşma |

## En doğru konumlandırma

Ürünü herkese hitap eden genel bir ERP olarak konumlandırmak yerine daha dar ve güçlü bir mesaj öneririm:

> “İnternet olmasa da çalışan, barkodlu satış ve veresiye takibini tek yerde birleştiren kolay esnaf POS’u.”

İlk hedef segment olarak da şunlara odaklanırdım:

1. Veresiye çalışan bakkal, büfe ve küçük marketler
2. Birden fazla çalışanı olan yerel perakendeciler
3. Barkodlu satışa geçmek isteyen küçük mağazalar
4. Mobil cihazdan stok ve satış görmek isteyen işletme sahipleri

Bu segment için en güçlü satış paketi şu beşliyi birlikte sunar:

- Offline satış
- Barkod
- Veresiye + WhatsApp hatırlatma
- Gerçek kâr
- Kolay Excel’den geçiş

Benim net öncelik sıram: önce maliyet/kâr, CSV aktarımı ve WhatsApp veresiye; ardından tedarikçi/alış ve stok hareketleri; sonrasında e-Fatura ve gün sonu. Bu sıra, geliştirme maliyetine karşı en yüksek müşteri kazanım potansiyelini verir.
