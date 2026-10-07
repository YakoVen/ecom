# Full Integration Plan — Professional (61) + Enterprise (65)
> Date: 2026-10-07
> Audit result: 0/61 professional and 0/65 enterprise differentiators integrated.
> Both apps are the intermediate foundation (auth, cart, COD, tracking, wishlist, coupons/discounts, delivery zones).
> Rule: build in `professional-plan/`, verify (`tsc` + `npm run build` + dev check), then propagate to `enterprise-plan/`.

## 0. Keys and inputs needed from owner (everything else is key-free)

| Key | Needed for | Status without it |
|---|---|---|
| `RESEND_API_KEY` | Real order/shipping/recovery emails | Stub logs to console, UI works |
| `STRIPE_SECRET_KEY` + publishable key | Online payments, subscriptions | COD only; UI shells built, disabled |
| `OPENAI_API_KEY` (or Gemini) | AI descriptions, chatbot, forecasting | Provider interface + UI shells, disabled |
| Yalidine / ZR Express credentials | Auto-shipments, label printing, tracking sync | Adapter interface + manual-entry fallback |

## 1. Build order (dependency-safe, key-free first)

### PROFESSIONAL — Part 1: pure code, no new deps
| Phase | Features (report refs) | What gets built | Acceptance |
|---|---|---|---|
| P1 Analytics | B9–B16 (minus GA4/Pixel) | `dashboard/analytics` page: revenue + volume SVG charts (hand-rolled, no recharts), top sellers, AOV, wilaya breakdown, KPI cards on dashboard home — all from real `orders` | Charts render from Firestore orders |
| P2 Recovery automation | C19–C24 | Abandonment detection (checkout heartbeat + `saveAbandonedCart`), `dashboard/abandoned-carts` wired to `getAbandonedCarts`, manual SMS/email trigger, recovery coupon attach, recovery-rate stat | Abandoned session appears in dashboard; resolve works |
| P3 Flash sales | D25–D29 | `flash_sales` collection + engine (schedule, active check), countdown component, storefront banner, auto-revert via active-window logic, per-sale revenue stat | Sale shows countdown, ends on time, price reverts |
| P4 Loyalty | E30–E35 | `loyalty` on user doc (points, tier), earn on order create, balance in dashboard + checkout, redeem-to-discount, VIP thresholds, admin config doc | Points accrue/redeem end-to-end |
| P5 Bundles | F36–F39 | `bundles` collection, admin creator, storefront section, one-click add, stock validation (all items in stock) | Bundle purchasable only when complete |
| P6 Reviews wiring | (intermediate carryover) | Product review form + list, `dashboard/reviews` wired to `getReviews`/`updateReviewStatus`, approved-only display | Review submitted → approved → visible |
| P7 Returns | J54–J56 | Return request from order detail, `returns` collection, admin approve/reject, status flow | Request → decision reflected |
| P8 Inventory+ | H44–H47 | Low-stock threshold + dashboard alerts, auto-hide OOS toggle, restock-notify subscriptions, inventory log on stock change | Alert fires; notify list fills |
| P9 Roles | I48–I51 | `role` on users (owner/manager/agent/support), admin invite UI, route + component guards, activity log collection | Non-owner blocked from restricted actions |
| P10 Currency | J52–J53 | Currency selector (DZD/EUR/USD), static rate doc admin-editable, `formatPrice` extension | Prices convert on toggle |
| P11 Reports | L59–L61 | Weekly/monthly aggregation functions, segmentation query (spend/recency/wilaya), email body ready (sends when key present) | Report generates from real data |
| P12 PWA | G40–G43 | `manifest.json`, icons, minimal service worker (cache shell + product images), install prompt | Lighthouse PWA installable |
| P13 Tracking pixels | B17–B18 | GA4 + Meta Pixel snippet loader with route + ecommerce events (view_item, add_to_cart, purchase) | Events fire in devtools |

### PROFESSIONAL — Part 2: needs keys/packages
| Phase | Features | Blocked by | Fallback meanwhile |
|---|---|---|---|
| P14 Email real | G (customer+admin mails) | `RESEND_API_KEY` | Stub logs; templates built |
| P15 Payments | A1–A8 (Stripe + BaridiMob, webhooks, paymentStatus, partial) | `stripe` npm install (slow network) + keys | Method selector UI built, COD default; webhook route stubbed |
| P16 Push | G42 | Web-push package + VAPID keys | PWA without push |

### ENTERPRISE (after Professional Part 1 complete; copy base first)
| Phase | Features (report refs) | What gets built | Acceptance |
|---|---|---|---|
| E1 Tenancy | A1–A6 | `storeId` on all docs, store switcher, creation wizard, `stores` collection, cross-store rollup | Two stores isolated, switch works |
| E2 Public API | B7–B10, B13 | `/api/v1/*` products/orders/customers/coupons + API-key auth + rate limit + Swagger page | curl with key succeeds; docs render |
| E3 Webhooks | B11–B12 | Outbound events (order.created/shipped, payment.received), registration UI, delivery log + retries | Receiver gets payload; log shows status |
| E4 Couriers | C14–C21 | Courier adapter interface + Yalidine driver (key-gated), manual shipment fallback, label view, bulk create | Manual flow works; auto when key present |
| E5 Warehouse | D22–D26 | `warehouses` collection, per-warehouse stock, assignment rule, transfer log, SKU field | Stock splits correctly |
| E6 Invoicing | K55–K58 | Print-CSS invoice + packing slip routes (no pdf dep), bulk date-range view | Invoice prints cleanly |
| E7 Marketplace | J50–J54 | Vendor registration, vendor dashboard scope, commission config, approval flow, payout ledger | Vendor isolated to own products/orders |
| E8 White-label | G37–G41 | Branding removal flag, theme editor (colors/fonts/radius), custom CSS doc, favicon upload, email branding | Theme applies store-wide |
| E9 A/B testing | F33–F36 | Experiment doc (variants, split), assignment hook, results dashboard with counts | Variant split + conversion counted |
| E10 Dropshipping | H42–H45 | Suppliers collection, order forward (email when no API), margin view, fulfillment status | Forward generates supplier email |
| E11 Audit/GDPR | L59–L65 | Audit log writer + viewer, data export (JSON), cookie banner, deletion request flow | Actions logged; export downloads |
| E12 AI | E27–E32 | Provider interface + admin key field, description generator button, chatbot widget shell, recommendations (purchase-data based, no AI), forecasting (moving average, no AI) | Non-AI parts work; AI lights up with key |
| E13 Subscriptions | I46–I49 | Product subscription flags, customer pause/cancel, billing hook (Stripe-gated), MRR view | Works manually; auto-bills with Stripe |

## 2. Propagation rule
- Professional phases land in `professional-plan/src/`, verified, then copied to `enterprise-plan/src/` (same layout, same `@/*` mapping).
- Enterprise phases land only in `enterprise-plan/`.
- Intermediate-phase fixes flow backward to `intermediate-plan/` (already established pattern).
- Never copy `node_modules`; keep `package.json` deps in sync manually.

## 3. Definition of done per phase
1. `npx tsc --noEmit` clean, `npm run build` passes (zero errors; warnings OK).
2. No mock data in touched flows; French UI strings use `&apos;` escapes.
3. Key-gated features degrade to clear disabled states, never crash without keys.

## 4. Suggested execution batches (next)
- Batch 1: P1 Analytics + P6 Reviews wiring (both read-only, zero risk to checkout).
- Batch 2: P3 Flash sales + P5 Bundles (pricing engine; shared sale-price helper).
- Batch 3: P4 Loyalty + P7 Returns + P8 Inventory+ (order lifecycle writes).
- Then: P2 Recovery, P9 Roles, P10–P13, P14–P16 as keys arrive; E1–E13 in order.
