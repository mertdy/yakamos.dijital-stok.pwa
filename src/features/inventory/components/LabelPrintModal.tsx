import { useEffect, useMemo, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  Button,
  Checkbox,
  Input,
  Label,
  Modal,
  TextField,
  toast
} from '@heroui/react';
import { Check, Printer, Tag } from 'lucide-react';
import type { InventoryItem } from '../store/useInventoryStore';
import {
  DEFAULT_LABEL_FIELDS,
  formatPrice,
  formatUpdatedAt,
  LABEL_SIZES,
  LABEL_TEMPLATES,
  type LabelField,
  type LabelSize,
  type LabelTemplate
} from '../domain/labelPrinting';
import { BarcodeSvg } from './BarcodeSvg';

interface LabelPrintModalProps {
  isOpen: boolean;
  items: InventoryItem[];
  onClose: () => void;
}

interface PrintItem {
  item: InventoryItem;
  quantity: number;
}

const FIELD_OPTIONS: { id: LabelField; label: string }[] = [
  { id: 'NAME', label: 'Ürün adı' },
  { id: 'PRICE', label: 'Satış fiyatı' },
  { id: 'BARCODE', label: 'Taranabilir barkod' },
  { id: 'BARCODE_TEXT', label: 'Barkod numarası' },
  { id: 'SKU', label: 'Stok kodu (SKU)' },
  { id: 'STOCK', label: 'Stok miktarı' },
  { id: 'UPDATED_AT', label: 'Son güncelleme' },
  { id: 'IMAGE', label: 'Ürün görseli' }
];

const MAX_PREVIEW_LABELS = 6;

export const LabelPrintModal = ({
  isOpen,
  items,
  onClose
}: LabelPrintModalProps) => {
  const [template, setTemplate] = useState<LabelTemplate>('PRODUCT_BARCODE');
  const [sizeId, setSizeId] = useState('40x30');
  const [fields, setFields] = useState<LabelField[]>(DEFAULT_LABEL_FIELDS);
  const [printItems, setPrintItems] = useState<PrintItem[]>([]);
  const printRef = useRef<HTMLDivElement>(null);
  const size =
    LABEL_SIZES.find(option => option.id === sizeId) ?? LABEL_SIZES[0];

  useEffect(() => {
    if (!isOpen) return;
    setPrintItems(items.map(item => ({ item, quantity: 1 })));
    setTemplate('PRODUCT_BARCODE');
    setSizeId('40x30');
    setFields(DEFAULT_LABEL_FIELDS);
  }, [isOpen, items]);

  const labels = useMemo(
    () =>
      printItems.flatMap(({ item, quantity }) =>
        Array.from({ length: quantity }, () => item)
      ),
    [printItems]
  );

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'stok-etiketleri',
    pageStyle: getPageStyle(size),
    onPrintError: (_, error) => {
      console.error('Label print failed:', error);
      toast.danger('Yazdırma penceresi açılamadı. Lütfen tekrar deneyin.');
    }
  });

  const setQuantity = (id: string, quantity: number) => {
    setPrintItems(current =>
      current.map(entry =>
        entry.item.id === id
          ? { ...entry, quantity: Math.max(1, Math.min(999, quantity || 1)) }
          : entry
      )
    );
  };

  const toggleField = (field: LabelField) => {
    setFields(current =>
      current.includes(field)
        ? current.filter(selected => selected !== field)
        : [...current, field]
    );
  };

  const selectTemplate = (nextTemplate: LabelTemplate) => {
    setTemplate(nextTemplate);
    if (nextTemplate === 'SHELF_PRICE' || nextTemplate === 'DISCOUNT')
      setSizeId('100x50');
    if (nextTemplate === 'PACKAGE') setSizeId('100x150');
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={open => !open && onClose()}>
      <button className="hidden" aria-hidden="true" tabIndex={-1} />
      <Modal.Backdrop>
        <Modal.Container scroll="inside">
          <Modal.Dialog className="max-h-[92vh] w-full max-w-5xl rounded-3xl bg-white shadow-xl outline-none">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-primary/10 text-primary">
                <Tag className="size-5" />
              </Modal.Icon>
              <div>
                <Modal.Heading className="text-xl">Etiket Bas</Modal.Heading>
                <p className="text-sm font-normal text-gray-500">
                  {items.length} ürün için etiket türünü ve içeriğini seçin.
                </p>
              </div>
            </Modal.Header>

            <Modal.Body className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
              <div className="space-y-6">
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">
                    Etiket türü
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {LABEL_TEMPLATES.map(option => (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={template === option.id}
                        onClick={() => selectTemplate(option.id)}
                        className={`rounded-2xl border p-3 text-left transition-colors ${
                          template === option.id
                            ? 'border-primary bg-primary/5 ring-primary/20 ring-1'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}>
                        <span className="flex items-center justify-between text-sm font-semibold text-gray-800">
                          {option.label}
                          {template === option.id && (
                            <Check className="text-primary" size={16} />
                          )}
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          {option.description}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <label
                    className="mb-2 block text-sm font-semibold text-gray-700"
                    htmlFor="label-size">
                    Etiket ölçüsü
                  </label>
                  <select
                    id="label-size"
                    value={sizeId}
                    onChange={event => setSizeId(event.target.value)}
                    className="focus:border-primary focus:ring-primary/20 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-800 outline-none focus:ring-2">
                    {LABEL_SIZES.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-semibold text-gray-700">
                    Etikette göster
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {FIELD_OPTIONS.map(option => (
                      <Checkbox
                        key={option.id}
                        isSelected={fields.includes(option.id)}
                        onChange={() => toggleField(option.id)}>
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <Label>{option.label}</Label>
                        </Checkbox.Content>
                      </Checkbox>
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-5">
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Baskı adetleri
                    </h3>
                    <span className="text-xs text-gray-500">
                      Varsayılan: 1 adet
                    </span>
                  </div>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-gray-100 p-2">
                    {printItems.map(({ item, quantity }) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-xl bg-gray-50 p-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">
                          {item.name}
                        </span>
                        <Button
                          variant="tertiary"
                          size="sm"
                          onPress={() => setQuantity(item.id, item.stock)}>
                          Stok kadar
                        </Button>
                        <TextField
                          className="w-16"
                          value={String(quantity)}
                          onChange={value =>
                            setQuantity(item.id, Number(value))
                          }>
                          <Label className="sr-only">{item.name} adet</Label>
                          <Input
                            type="number"
                            min="1"
                            max="999"
                            inputMode="numeric"
                          />
                        </TextField>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Baskı önizlemesi
                    </h3>
                    <span className="text-xs text-gray-500">
                      Toplam {labels.length} etiket
                    </span>
                  </div>
                  <LabelPreview
                    items={labels.slice(0, MAX_PREVIEW_LABELS)}
                    fields={fields}
                    size={size}
                    template={template}
                  />
                  {labels.length > MAX_PREVIEW_LABELS && (
                    <p className="mt-2 text-xs text-gray-500">
                      Önizlemede ilk {MAX_PREVIEW_LABELS} etiket gösterilir.
                    </p>
                  )}
                </section>
              </div>
            </Modal.Body>

            <Modal.Footer className="flex gap-3 border-t border-gray-100 p-6">
              <Button variant="secondary" className="flex-1" onPress={onClose}>
                Vazgeç
              </Button>
              <Button
                className="flex-1"
                onPress={() => handlePrint()}
                isDisabled={labels.length === 0}>
                <Printer className="mr-2" size={18} /> Yazdırma Penceresini Aç
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <div className="fixed top-0 left-[-10000px]" aria-hidden="true">
        <div ref={printRef}>
          <LabelPrintStyles />
          <LabelPreview
            items={labels}
            fields={fields}
            size={size}
            template={template}
            printable
          />
        </div>
      </div>
    </Modal>
  );
};

interface LabelPreviewProps {
  items: InventoryItem[];
  fields: LabelField[];
  size: LabelSize;
  template: LabelTemplate;
  printable?: boolean;
}

const LabelPreview = ({
  items,
  fields,
  size,
  template,
  printable = false
}: LabelPreviewProps) => (
  <div
    className={
      printable
        ? 'label-print-grid'
        : 'grid grid-cols-2 gap-3 rounded-2xl bg-gray-100 p-3'
    }
    style={
      printable
        ? ({
            '--label-width': `${size.widthMm}mm`,
            '--label-height': `${size.heightMm}mm`,
            '--label-columns': size.columns ?? 1
          } as React.CSSProperties)
        : undefined
    }>
    {items.map((item, index) => (
      <ProductLabel
        key={`${item.id}-${index}`}
        item={item}
        fields={fields}
        template={template}
        printable={printable}
      />
    ))}
  </div>
);

interface ProductLabelProps {
  item: InventoryItem;
  fields: LabelField[];
  template: LabelTemplate;
  printable: boolean;
}

const ProductLabel = ({
  item,
  fields,
  template,
  printable
}: ProductLabelProps) => {
  const show = (field: LabelField) => fields.includes(field);
  const compact = template === 'PRODUCT_BARCODE';

  return (
    <article
      className={`label-print-item ${printable ? '' : 'min-h-32'} ${template === 'DISCOUNT' ? 'label-print-item--discount' : ''}`}>
      {show('IMAGE') && item.imageUrl && (
        <img className="label-print-image" src={item.imageUrl} alt="" />
      )}
      {show('NAME') && (
        <strong className="label-print-name">{item.name}</strong>
      )}
      {show('PRICE') && (
        <span className="label-print-price">{formatPrice(item.price)}</span>
      )}
      {show('BARCODE') && item.barcode && (
        <BarcodeSvg value={item.barcode} compact={compact} />
      )}
      {show('BARCODE_TEXT') && item.barcode && (
        <span className="label-print-meta">{item.barcode}</span>
      )}
      {show('SKU') && item.sku && (
        <span className="label-print-meta">SKU: {item.sku}</span>
      )}
      {show('STOCK') && (
        <span className="label-print-meta">Stok: {item.stock}</span>
      )}
      {show('UPDATED_AT') && (
        <span className="label-print-meta">
          Güncelleme: {formatUpdatedAt(item.updatedAt)}
        </span>
      )}
    </article>
  );
};

const getPageStyle = (size: LabelSize): string => `
  @page { size: ${size.pageSize ?? `${size.widthMm}mm ${size.heightMm}mm`}; margin: 0; }
  html, body { margin: 0 !important; padding: 0 !important; }
`;

const LabelPrintStyles = () => (
  <style>{`
    .label-print-grid { display: grid; grid-template-columns: repeat(var(--label-columns), var(--label-width)); gap: 0; width: fit-content; }
    .label-print-item { box-sizing: border-box; width: var(--label-width); height: var(--label-height); overflow: hidden; padding: 2.2mm; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #111827; background: #fff; font-family: Arial, sans-serif; text-align: center; }
    .label-print-name { width: 100%; overflow: hidden; font-size: 10pt; line-height: 1.15; font-weight: 700; }
    .label-print-price { margin: .5mm 0; font-size: 13pt; font-weight: 800; }
    .label-print-meta { font-size: 7pt; line-height: 1.2; }
    .label-print-item svg { max-width: 100%; height: auto; }
    .label-print-image { max-height: 10mm; max-width: 14mm; object-fit: contain; }
    .label-print-item--discount .label-print-price { color: #dc2626; font-size: 16pt; }
  `}</style>
);
