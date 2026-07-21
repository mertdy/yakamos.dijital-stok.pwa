import { describe, expect, it } from 'vitest';
import { evaluatePricingRules, type PricingRule } from './pricingRules';

const cigaretteRule: PricingRule = {
  id: 'card-cigarette-fee',
  companyId: 'company-1',
  name: 'Kartlı küçük alışveriş komisyonu',
  isActive: true,
  priority: 100,
  targetCategoryIds: ['tobacco'],
  targetProductIds: [],
  paymentMethods: ['Card'],
  otherItemsMaxTotal: 20,
  effect: 'surcharge',
  amountType: 'fixed',
  amount: 5,
  application: 'per_item',
  createdAt: '2026-07-21T00:00:00.000Z',
  updatedAt: '2026-07-21T00:00:00.000Z'
};

describe('evaluatePricingRules', () => {
  it('adds a fee per target item while excluding target items from the other-item total', () => {
    const adjustments = evaluatePricingRules(
      [
        {
          inventoryId: 'cigarette',
          name: 'Sigara',
          price: 60,
          quantity: 2,
          categoryId: 'tobacco'
        }
      ],
      'Card',
      [cigaretteRule]
    );
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0]).toMatchObject({
      ruleId: cigaretteRule.id,
      amount: 10,
      targetItemCount: 2
    });
  });

  it('does not apply the fee when non-target products exceed the allowed total', () => {
    const adjustments = evaluatePricingRules(
      [
        {
          inventoryId: 'cigarette',
          name: 'Sigara',
          price: 60,
          quantity: 2,
          categoryId: 'tobacco'
        },
        {
          inventoryId: 'drink',
          name: 'İçecek',
          price: 50,
          quantity: 1,
          categoryId: 'drink'
        }
      ],
      'Card',
      [cigaretteRule]
    );
    expect(adjustments).toEqual([]);
  });

  it('uses the highest-priority item rule for the same cart item', () => {
    const higherPriorityRule = {
      ...cigaretteRule,
      id: 'higher-fee',
      priority: 200,
      amount: 8
    };
    const adjustments = evaluatePricingRules(
      [
        {
          inventoryId: 'cigarette',
          name: 'Sigara',
          price: 60,
          quantity: 1,
          categoryId: 'tobacco'
        }
      ],
      'Card',
      [cigaretteRule, higherPriorityRule]
    );
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0]).toMatchObject({ ruleId: 'higher-fee', amount: 8 });
  });
});
