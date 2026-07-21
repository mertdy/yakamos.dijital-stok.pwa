import type { CartItem, PaymentMethod } from '@/features/sales';

export type PricingRuleEffect = 'discount' | 'surcharge';
export type PricingRuleAmountType = 'fixed' | 'percentage';
export type PricingRuleApplication = 'per_item' | 'per_cart';

export interface PricingRuleSchedule {
  startsAt?: string | null;
  endsAt?: string | null;
  daysOfWeek?: number[];
  startTime?: string | null;
  endTime?: string | null;
}

export interface PricingRule {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  priority: number;
  targetCategoryIds: string[];
  targetProductIds: string[];
  paymentMethods: PaymentMethod[];
  /** Target products are excluded from this basket subtotal. */
  otherItemsMaxTotal?: number | null;
  effect: PricingRuleEffect;
  amountType: PricingRuleAmountType;
  amount: number;
  application: PricingRuleApplication;
  schedule?: PricingRuleSchedule;
  createdAt: string;
  updatedAt: string;
}

export interface AppliedPricingRule {
  ruleId: string;
  name: string;
  effect: PricingRuleEffect;
  amount: number;
  application: PricingRuleApplication;
  targetItemCount: number;
  reason: string;
  ruleSnapshot: Pick<
    PricingRule,
    | 'name'
    | 'priority'
    | 'targetCategoryIds'
    | 'targetProductIds'
    | 'paymentMethods'
    | 'otherItemsMaxTotal'
    | 'effect'
    | 'amountType'
    | 'amount'
    | 'application'
    | 'schedule'
  >;
}

const isWithinSchedule = (
  schedule: PricingRuleSchedule | undefined,
  now: Date
) => {
  if (!schedule) return true;
  const nowIso = now.toISOString();
  if (schedule.startsAt && nowIso < schedule.startsAt) return false;
  if (schedule.endsAt && nowIso > schedule.endsAt) return false;
  if (
    schedule.daysOfWeek?.length &&
    !schedule.daysOfWeek.includes(now.getDay())
  ) {
    return false;
  }
  const time = now.toTimeString().slice(0, 5);
  if (schedule.startTime && time < schedule.startTime) return false;
  if (schedule.endTime && time > schedule.endTime) return false;
  return true;
};

const matchesTarget = (item: CartItem, rule: PricingRule) =>
  rule.targetProductIds.includes(item.inventoryId) ||
  Boolean(item.categoryId && rule.targetCategoryIds.includes(item.categoryId));

const snapshotRule = (
  rule: PricingRule
): AppliedPricingRule['ruleSnapshot'] => ({
  name: rule.name,
  priority: rule.priority,
  targetCategoryIds: rule.targetCategoryIds,
  targetProductIds: rule.targetProductIds,
  paymentMethods: rule.paymentMethods,
  otherItemsMaxTotal: rule.otherItemsMaxTotal ?? null,
  effect: rule.effect,
  amountType: rule.amountType,
  amount: rule.amount,
  application: rule.application,
  schedule: rule.schedule
});

export const evaluatePricingRules = (
  cart: CartItem[],
  paymentMethod: PaymentMethod,
  rules: PricingRule[],
  dismissedRuleIds: string[] = [],
  now = new Date()
): AppliedPricingRule[] => {
  const eligible = rules
    .filter(
      rule =>
        rule.isActive &&
        !dismissedRuleIds.includes(rule.id) &&
        rule.paymentMethods.includes(paymentMethod) &&
        isWithinSchedule(rule.schedule, now)
    )
    .map(rule => ({
      rule,
      targetItems: cart.filter(item => matchesTarget(item, rule))
    }))
    .filter(({ targetItems }) => targetItems.length > 0)
    .filter(({ rule, targetItems }) => {
      if (
        rule.otherItemsMaxTotal === undefined ||
        rule.otherItemsMaxTotal === null
      )
        return true;
      const targetIds = new Set(targetItems.map(item => item.inventoryId));
      const otherTotal = cart
        .filter(item => !targetIds.has(item.inventoryId))
        .reduce((sum, item) => sum + item.price * item.quantity, 0);
      return otherTotal <= rule.otherItemsMaxTotal;
    })
    .sort(
      (a, b) =>
        b.rule.priority - a.rule.priority ||
        a.rule.name.localeCompare(b.rule.name, 'tr')
    );

  const applied: AppliedPricingRule[] = [];
  const claimedItemIds = new Set<string>();
  let cartRuleApplied = false;

  for (const { rule, targetItems } of eligible) {
    if (rule.application === 'per_cart') {
      if (cartRuleApplied) continue;
      cartRuleApplied = true;
    }

    const applicableItems =
      rule.application === 'per_item'
        ? targetItems.filter(item => !claimedItemIds.has(item.inventoryId))
        : targetItems;
    if (!applicableItems.length) continue;

    const targetSubtotal = applicableItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const targetItemCount = applicableItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    const rawAmount =
      rule.amountType === 'percentage'
        ? targetSubtotal * (rule.amount / 100)
        : rule.application === 'per_item'
          ? rule.amount * targetItemCount
          : rule.amount;
    const amount = rule.effect === 'surcharge' ? rawAmount : -rawAmount;
    if (!Number.isFinite(amount) || amount === 0) continue;

    if (rule.application === 'per_item') {
      applicableItems.forEach(item => claimedItemIds.add(item.inventoryId));
    }
    applied.push({
      ruleId: rule.id,
      name: rule.name,
      effect: rule.effect,
      amount,
      application: rule.application,
      targetItemCount,
      reason: `${paymentMethod === 'Card' ? 'Kart' : paymentMethod} ödemede uygun ürünler ve sepet koşulu sağlandı.`,
      ruleSnapshot: snapshotRule(rule)
    });
  }
  return applied;
};

export const getPricingRuleSummary = (rule: PricingRule) => {
  const action = rule.effect === 'surcharge' ? 'ek ücret' : 'indirim';
  const amount =
    rule.amountType === 'percentage'
      ? `%${rule.amount}`
      : `${rule.amount.toLocaleString('tr-TR')} ₺`;
  return `${rule.application === 'per_item' ? 'Ürün başına' : 'Sepete bir kez'} ${amount} ${action}`;
};
