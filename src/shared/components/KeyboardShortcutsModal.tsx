import React from 'react';
import { Kbd, Modal } from '@heroui/react';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

const shortcutGroups: Array<{ title: string; items: ShortcutItem[] }> = [
  {
    title: 'Gezinme',
    items: [
      { keys: ['F1'], description: 'Satış ekranını aç' },
      { keys: ['F2'], description: 'Yeni satış başlat ve sepeti temizle' },
      { keys: ['F3'], description: 'Müşteriler ekranını aç' },
      { keys: ['F4'], description: 'Envanter ekranını aç' },
      { keys: ['Ctrl', 'F'], description: 'Ürün veya barkod aramasına odaklan' }
    ]
  },
  {
    title: 'Satış ve ödeme',
    items: [
      { keys: ['F5'], description: 'Nakit ödeme seç' },
      { keys: ['F6'], description: 'Kart ödeme seç' },
      { keys: ['F7'], description: 'QR kod ile ödeme seç' },
      { keys: ['F8'], description: 'Veresiye ödeme seç' },
      { keys: ['F9'], description: 'Satışı beklemeye al' },
      { keys: ['F10'], description: 'Bekleyen satışları aç' },
      { keys: ['Enter'], description: 'Ödemeyi al' }
    ]
  },
  {
    title: 'Arama ve sepet',
    items: [
      { keys: ['↑', '↓'], description: 'Arama sonuçlarında gez' },
      { keys: ['Enter'], description: 'Seçili arama sonucunu sepete ekle' },
      {
        keys: ['+', '-'],
        description: 'Odaklanmış sepet satırının adedini değiştir'
      },
      { keys: ['Delete'], description: 'Odaklanmış sepet satırını sil' },
      {
        keys: ['Esc'],
        description: 'Açık pencereyi kapat veya aramayı temizle'
      }
    ]
  }
];

const ShortcutKeys: React.FC<{ keys: string[] }> = ({ keys }) => (
  <span className="flex flex-wrap justify-end gap-1.5">
    {keys.map(key => (
      <Kbd key={key} variant="default">
        {key}
      </Kbd>
    ))}
  </span>
);

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onOpenChange
}) => (
  <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
    <Modal.Backdrop>
      <Modal.Container scroll="inside">
        <Modal.Dialog className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl outline-none">
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Icon className="bg-primary/10 text-primary">
              <Keyboard size={20} />
            </Modal.Icon>
            <div>
              <Modal.Heading className="text-xl">
                Klavye kısayolları
              </Modal.Heading>
              <p className="mt-1 text-sm text-gray-500">
                Satış işlemlerini klavyeden daha hızlı tamamlayın.
              </p>
            </div>
          </Modal.Header>

          <Modal.Body className="space-y-6">
            {shortcutGroups.map(group => (
              <section
                key={group.title}
                aria-labelledby={`shortcut-${group.title}`}>
                <h3
                  id={`shortcut-${group.title}`}
                  className="mb-2 text-sm font-bold text-gray-900">
                  {group.title}
                </h3>
                <div className="overflow-hidden rounded-2xl border border-gray-100">
                  {group.items.map((item, index) => (
                    <div
                      key={item.description}
                      className={`flex items-center justify-between gap-4 px-4 py-3 ${
                        index > 0 ? 'border-t border-gray-100' : ''
                      }`}>
                      <span className="text-sm text-gray-600">
                        {item.description}
                      </span>
                      <ShortcutKeys keys={item.keys} />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  </Modal>
);
