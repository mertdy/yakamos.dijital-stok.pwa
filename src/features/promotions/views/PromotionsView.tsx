import { useEffect, useMemo, useState } from 'react';
import { Button, Chip, Spinner, Switch, Tabs, Tooltip } from '@heroui/react';
import { Megaphone, Pencil, Plus, Power, Tag, Trash2 } from 'lucide-react';
import { toast } from '@heroui/react';
import { useConfirm } from '@/shared/contexts/ConfirmDialogContext';
import {
  getPricingRuleSummary,
  type PricingRule
} from '../domain/pricingRules';
import { usePricingRuleStore } from '../store/usePricingRuleStore';
import { PricingRuleEditorDrawer } from '../components/PricingRuleEditorDrawer';

export const PromotionsView = () => {
  const { rules, isLoading, loadRules, saveRule, deleteRule } =
    usePricingRuleStore();
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorSession, setEditorSession] = useState(0);
  const [selectedTab, setSelectedTab] = useState('active');
  const { confirm } = useConfirm();
  useEffect(() => {
    loadRules();
  }, [loadRules]);
  const filteredRules = useMemo(
    () =>
      rules.filter(
        rule =>
          selectedTab === 'all' ||
          (selectedTab === 'active' ? rule.isActive : !rule.isActive)
      ),
    [rules, selectedTab]
  );
  const openNew = () => {
    setEditingRule(null);
    setEditorSession(current => current + 1);
    setIsEditorOpen(true);
  };
  const updateActive = async (rule: PricingRule, isActive: boolean) => {
    await saveRule(rule.id, { ...rule, isActive });
    toast.success(isActive ? 'Kural etkinleştirildi.' : 'Kural duraklatıldı.');
  };
  const remove = async (rule: PricingRule) => {
    const approved = await confirm({
      title: 'Fiyat kuralını sil',
      description: `“${rule.name}” kalıcı olarak silinecek.`,
      confirmText: 'Sil',
      variant: 'danger'
    });
    if (approved) {
      await deleteRule(rule.id);
      toast.success('Fiyat kuralı silindi.');
    }
  };
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 lg:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-primary mb-2 flex items-center gap-2">
            <Megaphone size={20} />
            <span className="text-sm font-bold tracking-wider uppercase">
              Kampanyalar
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Fiyat Kuralları
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Ödeme ve sepet koşullarına göre otomatik indirim veya ek ücret
            uygulayın.
          </p>
        </div>
        <Button variant="primary" onPress={openNew}>
          <Plus size={18} /> Yeni fiyat kuralı
        </Button>
      </div>
      <div className="rounded-3xl border border-gray-100 bg-white shadow-sm">
        <Tabs
          selectedKey={selectedTab}
          onSelectionChange={key => setSelectedTab(String(key))}
          className="border-b border-gray-100 px-4 pt-3">
          <Tabs.ListContainer>
            <Tabs.List aria-label="Fiyat kuralları durumu">
              <Tabs.Tab id="active">
                Aktif <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="inactive">
                Duraklatılanlar <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="all">
                Tümü <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
        <div className="p-4">
          {isLoading ? (
            <div className="flex min-h-56 items-center justify-center">
              <Spinner />
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <Tag className="mb-3 text-gray-300" size={42} />
              <h2 className="font-semibold text-gray-900">
                Henüz fiyat kuralı yok
              </h2>
              <p className="mt-1 max-w-sm text-sm text-gray-500">
                Kartlı küçük alışveriş komisyonu veya kategori indirimi gibi
                kuralları buradan oluşturabilirsiniz.
              </p>
              <Button variant="secondary" className="mt-4" onPress={openNew}>
                <Plus size={16} /> İlk kuralı oluştur
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredRules.map(rule => (
                <div
                  key={rule.id}
                  className="flex flex-col gap-4 rounded-2xl border border-gray-100 p-4 transition-colors hover:bg-gray-50/50 sm:flex-row sm:items-center">
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${rule.effect === 'discount' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                    <Tag size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-gray-900">
                        {rule.name}
                      </h2>
                      <Chip
                        size="sm"
                        variant="secondary"
                        className={
                          rule.effect === 'discount'
                            ? 'text-success'
                            : 'text-primary'
                        }>
                        {rule.effect === 'discount' ? 'İndirim' : 'Ek ücret'}
                      </Chip>
                      {!rule.isActive && (
                        <Chip size="sm" variant="secondary">
                          Duraklatıldı
                        </Chip>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {getPricingRuleSummary(rule)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>Öncelik: {rule.priority}</span>
                      <span>
                        {rule.paymentMethods
                          .map(
                            method =>
                              ({
                                Card: 'Kart',
                                Cash: 'Nakit',
                                Scan: 'QR Kod',
                                Credit: 'Veresiye'
                              })[method]
                          )
                          .join(', ')}
                      </span>
                      {rule.otherItemsMaxTotal !== null &&
                        rule.otherItemsMaxTotal !== undefined && (
                          <span>
                            Hedef dışı sepet ≤{' '}
                            {rule.otherItemsMaxTotal.toLocaleString('tr-TR')} ₺
                          </span>
                        )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <Tooltip delay={0}>
                      <Switch
                        isSelected={rule.isActive}
                        onChange={isActive => void updateActive(rule, isActive)}
                        aria-label={
                          rule.isActive
                            ? 'Kuralı duraklat'
                            : 'Kuralı etkinleştir'
                        }>
                        {() => (
                          <Switch.Content className="gap-0">
                            <Switch.Control>
                              <Switch.Thumb>
                                <Switch.Icon>
                                  <Power size={12} />
                                </Switch.Icon>
                              </Switch.Thumb>
                            </Switch.Control>
                          </Switch.Content>
                        )}
                      </Switch>
                      <Tooltip.Content>
                        <Tooltip.Arrow />
                        {rule.isActive
                          ? 'Kuralı duraklat'
                          : 'Kuralı etkinleştir'}
                      </Tooltip.Content>
                    </Tooltip>
                    <Tooltip delay={0}>
                      <Button
                        isIconOnly
                        variant="ghost"
                        aria-label="Kuralı düzenle"
                        onPress={() => {
                          setEditingRule(rule);
                          setEditorSession(current => current + 1);
                          setIsEditorOpen(true);
                        }}>
                        <Pencil size={17} />
                      </Button>
                      <Tooltip.Content>
                        <Tooltip.Arrow />
                        Düzenle
                      </Tooltip.Content>
                    </Tooltip>
                    <Tooltip delay={0}>
                      <Button
                        isIconOnly
                        variant="ghost"
                        className="text-danger"
                        aria-label="Kuralı sil"
                        onPress={() => void remove(rule)}>
                        <Trash2 size={17} />
                      </Button>
                      <Tooltip.Content>
                        <Tooltip.Arrow />
                        Sil
                      </Tooltip.Content>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <PricingRuleEditorDrawer
        key={editorSession}
        rule={editingRule}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={async input => {
          await saveRule(editingRule?.id ?? null, input);
          toast.success(
            editingRule
              ? 'Fiyat kuralı güncellendi.'
              : 'Fiyat kuralı oluşturuldu.'
          );
        }}
      />
    </div>
  );
};
