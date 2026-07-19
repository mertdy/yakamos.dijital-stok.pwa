import { useEffect } from 'react';
import { Card } from '@heroui/react';
import { CalendarDays, CheckCircle2, Sparkles, Wrench } from 'lucide-react';
import {
  CHANGELOG_ENTRIES,
  markLatestChangelogSeen,
  type ChangelogItemType
} from '@/core/config/changelog';

const itemStyle: Record<
  ChangelogItemType,
  { label: string; className: string; icon: typeof Sparkles }
> = {
  new: {
    label: 'Yeni',
    className: 'bg-primary/10 text-primary',
    icon: Sparkles
  },
  improved: {
    label: 'İyileştirme',
    className: 'bg-emerald-100 text-emerald-700',
    icon: CheckCircle2
  },
  fixed: {
    label: 'Düzeltme',
    className: 'bg-amber-100 text-amber-700',
    icon: Wrench
  }
};

export const ChangelogView = () => {
  useEffect(() => {
    markLatestChangelogSeen();
  }, []);

  return (
    <div className="w-full max-w-3xl p-4 md:p-6">
      <div className="mb-7">
        <div className="text-primary bg-primary/10 mb-3 flex h-11 w-11 items-center justify-center rounded-2xl">
          <Sparkles size={22} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Yenilikler
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Uygulamada sizin için yaptığımız geliştirmeler.
        </p>
      </div>

      <div className="space-y-4">
        {CHANGELOG_ENTRIES.map(entry => (
          <Card
            key={entry.id}
            className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
            <Card.Header className="mb-4 flex-row items-start justify-between gap-4 p-0">
              <div>
                <Card.Title className="text-lg font-bold text-gray-900">
                  {entry.title}
                </Card.Title>
                <Card.Description className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                  <CalendarDays size={14} />
                  {entry.date}
                </Card.Description>
              </div>
            </Card.Header>
            <Card.Content className="space-y-3 p-0">
              {entry.items.map(item => {
                const style = itemStyle[item.type];
                const Icon = style.icon;
                return (
                  <div key={item.text} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${style.className}`}>
                      <Icon size={12} />
                      {style.label}
                    </span>
                    <p className="pt-0.5 text-sm leading-5 text-gray-700">
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
};
