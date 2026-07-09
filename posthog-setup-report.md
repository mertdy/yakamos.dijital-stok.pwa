<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of your project. Existing PostHog browser analytics remained in place, the local PostHog environment variables were refreshed in `.env`, `posthog-node` was confirmed in dependencies for the Node project context, and new analytics coverage was added across customer selection, customer payments, customer forms, customer/account views, inventory forms, inventory/customer list views, sales history views, barcode scanning outcomes, global product search selections, payment method changes, cart clearing, and held-sale cleanup flows.

| Event name | Description | File |
| --- | --- | --- |
| customer_selected_for_sale | Captures when a customer is selected or cleared for the active sale. | `src/features/customers/components/CustomerDrawer.tsx` |
| customer_payment_modal_submitted | Captures when a customer debt payment is submitted from the payment modal. | `src/features/customers/components/PaymentModal.tsx` |
| customer_form_submitted | Captures when the customer form is submitted for create or edit flows. | `src/features/customers/views/CustomerFormView.tsx` |
| customer_detail_viewed | Captures when a customer account detail view is opened. | `src/features/customers/views/CustomerDetailView.tsx` |
| inventory_form_submitted | Captures when the inventory product form is submitted for create or edit flows. | `src/features/inventory/views/ProductFormView.tsx` |
| product_search_result_selected | Captures when a product is selected from global search results and added to the cart. | `src/features/sales/components/GlobalProductSearch.tsx` |
| scanner_item_added_to_cart | Captures when a scanned barcode matches an inventory item and adds it to the cart. | `src/features/sales/components/ScannerModal.tsx` |
| unknown_barcode_detected | Captures when a scanned barcode is not found in inventory. | `src/features/sales/components/ScannerModal.tsx` |
| payment_method_selected | Captures when checkout payment method changes. | `src/features/sales/components/InvoicePanel.tsx` |
| cart_cleared | Captures when the active cart is manually cleared from checkout. | `src/features/sales/components/InvoicePanel.tsx` |
| held_sale_removed | Captures when a single held sale is removed from the drawer. | `src/features/sales/components/HeldSalesDrawer.tsx` |
| held_sales_cleared | Captures when all held sales are cleared from the drawer. | `src/features/sales/components/HeldSalesDrawer.tsx` |
| sales_history_viewed | Captures when the sales history screen is opened. | `src/features/sales-history/views/SalesHistoryView.tsx` |
| inventory_viewed | Captures when the inventory screen is opened. | `src/features/inventory/views/InventoryView.tsx` |
| customers_viewed | Captures when the customers list screen is opened. | `src/features/customers/views/CustomerListView.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- Dashboard: https://eu.posthog.com/project/219521/dashboard/804975
- Insight: Customer payment submissions (wizard) — https://eu.posthog.com/project/219521/insights/puKjOcTN
- Insight: Product search selections by barcode availability (wizard) — https://eu.posthog.com/project/219521/insights/GThzCnCp
- Insight: Inventory form submissions (wizard) — https://eu.posthog.com/project/219521/insights/GV3Lv7Ot
- Insight: Checkout intent funnel (wizard) — https://eu.posthog.com/project/219521/insights/baJEVvIG
- Insight: Barcode exceptions (wizard) — https://eu.posthog.com/project/219521/insights/olxfvSpr

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add the exact PostHog env var names you added to `.env.example` and any monorepo/bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.
- [ ] Confirm the returning-visitor path also calls `identify` — a handler that only identifies on fresh login can leave returning sessions on anonymous distinct IDs.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
