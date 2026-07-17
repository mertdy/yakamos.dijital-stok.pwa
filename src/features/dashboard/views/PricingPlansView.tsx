import { Button, Card } from '@heroui/react';
import { Check, Sparkles } from 'lucide-react';

const plans = [
  {
    name: 'Başlangıç',
    description: 'Küçük işletmeler için temel stok takibi.',
    price: '₺0',
    period: '/ ay',
    features: ['Temel stok yönetimi', 'Satış takibi', '1 işletme'],
    featured: false
  },
  {
    name: 'Profesyonel',
    description: 'Büyüyen işletmeler için daha fazla kontrol.',
    price: '₺299',
    period: '/ ay',
    features: [
      'Sınırsız ürün',
      'Gelişmiş raporlar',
      'Ekip üyeleri',
      'Öncelikli destek'
    ],
    featured: true
  },
  {
    name: 'Kurumsal',
    description: 'Özel ihtiyaçları olan ekipler için esnek çözüm.',
    price: 'Özel',
    period: '',
    features: [
      'Özel kurulum',
      'Sınırsız işletme',
      'Özel destek',
      'Gelişmiş yetkilendirme'
    ],
    featured: false
  }
];

export const PricingPlansView = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col p-4 md:p-6">
    <div className="mb-8 max-w-2xl">
      <span className="text-primary flex items-center gap-2 text-sm font-semibold">
        <Sparkles size={16} /> Planlar ve Fiyatlandırma
      </span>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
        İşletmenize uygun planı seçin
      </h1>
      <p className="mt-2 text-sm leading-6 text-gray-500">
        İhtiyaçlarınız büyüdükçe size eşlik eden esnek plan seçeneklerini
        inceleyin.
      </p>
    </div>

    <div className="grid gap-5 lg:grid-cols-3">
      {plans.map(plan => (
        <Card
          key={plan.name}
          className={`relative flex min-h-96 flex-col rounded-2xl border bg-white p-6 shadow-sm ${
            plan.featured
              ? 'border-primary/40 ring-primary/15 ring-1'
              : 'border-gray-100'
          }`}>
          {plan.featured && (
            <span className="bg-primary absolute -top-3 left-6 rounded-full px-3 py-1 text-[11px] font-bold text-white shadow-sm">
              En Çok Tercih Edilen
            </span>
          )}
          <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
          <p className="mt-2 min-h-10 text-sm leading-5 text-gray-500">
            {plan.description}
          </p>
          <div className="mt-6 flex items-baseline gap-1">
            <span className="text-3xl font-bold tracking-tight text-gray-900">
              {plan.price}
            </span>
            <span className="text-sm text-gray-500">{plan.period}</span>
          </div>
          <ul className="mt-6 space-y-3 border-t border-gray-100 pt-5">
            {plan.features.map(feature => (
              <li
                key={feature}
                className="flex items-center gap-2 text-sm text-gray-600">
                <Check size={16} className="text-primary flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
          <Button
            variant={plan.featured ? 'primary' : 'outline'}
            className="mt-auto w-full"
            isDisabled>
            Yakında
          </Button>
        </Card>
      ))}
    </div>

    <p className="mt-6 text-center text-xs text-gray-400">
      Bu sayfa şu an tanıtım amaçlıdır; plan değiştirme yakında eklenecek.
    </p>
  </div>
);
