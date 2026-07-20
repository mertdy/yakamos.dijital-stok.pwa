import { Dropdown } from '@heroui/react';
import { Copy, MessageSquareText, PhoneCall } from 'lucide-react';
import { clsx } from 'clsx';
import type { Key } from 'react';
import {
  formatPhoneNumber,
  normalizePhoneNumber
} from '@/shared/utils/phoneNumber';
import { copyToClipboard } from '@/shared/utils/clipboard';

interface PhoneContactMenuProps {
  phone?: string | null;
  className?: string;
  iconClassName?: string;
  emptyLabel?: string;
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={clsx('size-4 fill-current', className)}>
    <path d="M12 2a9.9 9.9 0 0 0-8.45 15.06L2 22l5.07-1.48A9.9 9.9 0 1 0 12 2Zm0 18.13a8.18 8.18 0 0 1-4.17-1.14l-.3-.18-3.01.88.9-2.93-.2-.31A8.18 8.18 0 1 1 12 20.13Zm4.48-6.1c-.25-.13-1.47-.72-1.7-.8-.23-.09-.4-.13-.57.13-.17.25-.64.8-.79.97-.14.17-.3.2-.55.07a6.7 6.7 0 0 1-1.97-1.21 7.42 7.42 0 0 1-1.37-1.7c-.14-.25-.02-.39.1-.52l.38-.44c.13-.15.17-.25.25-.42.08-.16.04-.3-.02-.42-.07-.12-.57-1.37-.78-1.88-.2-.49-.42-.42-.57-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.04s.88 2.37 1 2.53c.12.16 1.73 2.64 4.2 3.7.59.26 1.04.4 1.4.52.59.18 1.12.16 1.54.1.47-.07 1.46-.6 1.66-1.18.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.47-.28Z" />
  </svg>
);

export const PhoneContactMenu = ({
  phone,
  className,
  iconClassName,
  emptyLabel = '-'
}: PhoneContactMenuProps) => {
  const normalizedPhone = normalizePhoneNumber(phone || undefined);
  const formattedPhone = formatPhoneNumber(phone || undefined);

  if (!phone) return <span className={className}>{emptyLabel}</span>;

  if (!normalizedPhone) {
    return <span className={className}>{formattedPhone}</span>;
  }

  const handleAction = (key: Key) => {
    if (key === 'call') {
      window.location.href = `tel:${normalizedPhone}`;
      return;
    }

    if (key === 'sms') {
      window.location.href = `sms:${normalizedPhone}`;
      return;
    }

    if (key === 'copy') {
      void copyToClipboard(normalizedPhone, 'Telefon numarası kopyalandı.');
      return;
    }

    window.open(
      `https://wa.me/${normalizedPhone.replace(/\D/g, '')}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <Dropdown>
      <Dropdown.Trigger
        className={clsx(
          'group hover:text-primary focus-visible:ring-primary/40 flex items-center gap-1.5 rounded-md text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
          className
        )}
        aria-label={`${formattedPhone} için iletişim seçeneklerini aç`}
        onClick={event => event.stopPropagation()}>
        <PhoneCall
          size={14}
          className={clsx(
            'group-hover:text-primary text-gray-400',
            iconClassName
          )}
        />
        <span>{formattedPhone}</span>
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom start" className="min-w-44">
        <Dropdown.Menu
          aria-label={`${formattedPhone} iletişim seçenekleri`}
          onAction={handleAction}>
          <Dropdown.Item id="call" textValue="Telefon ara">
            <span className="flex items-center gap-2.5">
              <PhoneCall size={16} className="text-gray-500" />
              <span>Telefon ara</span>
            </span>
          </Dropdown.Item>
          <Dropdown.Item id="sms" textValue="SMS gönder">
            <span className="flex items-center gap-2.5">
              <MessageSquareText size={16} className="text-gray-500" />
              <span>SMS gönder</span>
            </span>
          </Dropdown.Item>
          <Dropdown.Item id="copy" textValue="Numarayı kopyala">
            <span className="flex items-center gap-2.5">
              <Copy size={16} className="text-gray-500" />
              <span>Numarayı kopyala</span>
            </span>
          </Dropdown.Item>
          <Dropdown.Item id="whatsapp" textValue="WhatsApp ile mesaj gönder">
            <span className="flex items-center gap-2.5">
              <WhatsAppIcon className="text-success" />
              <span>WhatsApp</span>
            </span>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
};
