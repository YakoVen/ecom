# Ecom Full Build Plan
> Date: 2026-10-06
> Goal: Finish all 5 tiers. No code changes in this plan, execution follows phase order.
> Basis: `BUILD_STATUS_REPORT.md`, 5x `FEATURES_REPORT.md`, code audits.

## 0. Build principles

1. Migrate upward, never rebuild. Professional starts as copy of finished Intermediate. Enterprise starts as copy of finished Professional.
2. One backend pattern: Firebase Auth + Firestore + Storage, `service/firebase/database.ts` as only data layer, `contexts/` for client state.
3. Shared providers configured once: Resend (email), one SMS gateway, Stripe + BaridiMob/CCP, GA4 + Meta Pixel, courier adapters.
4. `sync-env.mjs` + `.env.master` remain source of truth for env. New keys added to `.env.master` first.
5. Each phase ends with `npm run build` + manual smoke test. No phase starts with broken build.

## 1. Decisions required before Phase 1

| # | Decision | Recommendation | Blocks |
|---|----------|----------------|--------|
| D1 | Coupon ownership | Basic has NO coupons (owner decision). Coupons + discounts live in Intermediate only | Intermediate Phase 2 |
| D2 | Reviews/SMS/Theme ownership | Leave in Intermediate, not Basic | Intermediate Phase 2 |
| D3 | Email provider | Resend (already in `intermediate-plan/package.json:21`) | Intermediate email |
| D4 | SMS provider (Algeria) | Pick one: Twilio / Djezzy API / custom gateway | Basic SMS or Intermediate SMS |
| D5 | Payments | Stripe (intl) + BaridiMob/EDAHABIA (DZ). Partial payment: yes/no | Professional Phase 1 |
| D6 | Multi-tenancy model for Enterprise | `stores/{storeId}/products|orders|...` subcollections + `storeId` claim | Enterprise Phase 1 |
| D7 | Blog + i18n | Confirm removed (per `intermediate-plan/FEATURES_REPORT.md:238`). Remove from Professional inheritance list | Professional planning |

## 2. Phase 1 — Complete basic-plan (unblocks all higher tiers)

Goal: make Basic genuinely shippable.

1.1 Bug fixes (half day):
- `basic-plan/components/general/header.tsx:8` — use `useCart()` + `cart-icon.tsx`, remove hardcoded `0`.
- `basic-plan/app/checkout/page.tsx:111` — replace `600/400` with `getDeliveryPrice(wilaya, method)` from `basic-plan/service/firebase/database.ts:132`.
- `basic-plan/components/article-page/order-card.tsx:5` — delete stub or re-export `presentation.tsx`; restore WhatsApp order button.
- `basic-plan/middleware.ts:4` — add session check for `/dashboard`.

1.2 Coupons (2-3 days):
- `interfaces/coupon.ts` exists — add `service/firebase/database.ts`: `validateCoupon()`, `applyCoupon()`, `incrementCouponUsage()`.
- New `app/dashboard/coupons/page.tsx`: CRUD + active toggle + usage counts.
- Checkout: promo input + validation + discount line + total recompute; persist `couponCode + discount` on order (`app/actions/orders.ts:18`).
- Display discount in `command-amplify.tsx:127`.

1.3 Delivery wiring (1 day):
- Checkout wilaya/commune + home/desk radio already in `basic-plan/app/checkout/page.tsx:73` — connect to Firestore zones, handle missing zone fallback.

1.4 Reviews MVP — only if D2 says Basic (else defer):
- `interfaces/review.ts` exists — add DB fns, product review list + form, admin moderation page.

1.5 Acceptance: cart badge updates, checkout total = subtotal - coupon + live delivery fee, coupon rejects expired/over-limit, OOS blocks add-to-cart, `npm run build` passes.

## 3. Phase 2 — Wire intermediate-plan (service exists, UI mocked)

Goal: turn mocks into working flows.

2.1 Auth + routing (1-2 days):
- `app/login/page.tsx:20`, `register/page.tsx:28` — call `AuthContext` (`intermediate-plan/contexts/AuthContext.tsx:29`), remove `setTimeout` mock.
- `middleware.ts:1` — enforce session for `/account`, role gate for `/dashboard`.
- `app/account/layout.tsx` — redirect unauthenticated; checkout auth auto-fill (`intermediate-plan/app/checkout/page.tsx`).

2.2 Tracking + wishlist (1-2 days):
- `app/track/page.tsx:29` — replace `ORDER123` mock with `getOrderById` + visual pipeline from `trackingHistory` (`intermediate-plan/interfaces/order.ts:36`).
- `app/account/wishlist/page.tsx:9` — use `useWishlist()` from `intermediate-plan/contexts/WishlistContext.tsx:17`.
- Admin: `addTrackingNote` (`database.ts:94`) wired to order-table.

2.3 Discounts + recovery dashboards (3-4 days):
- `app/dashboard/discounts/page.tsx:6`, `coupons/page.tsx:7` — connect to `getActiveDiscounts:280` / `validateCoupon:157`; implement scheduling, stacking, usage limits, badge on cards, checkout breakdown.
- `abandoned-carts/page.tsx:6`, `failed-orders/page.tsx:7` — connect to `saveAbandonedCart:299` / `createFailedOrder:99`; implement detection (30-60 min inactivity job via scheduled function or client heartbeat), real SMS/email trigger, manual resolve.
- `app/api/validate-coupon/route.ts:7`, `discounts/apply/route.ts:7` — replace dummy logic with DB calls.

2.4 Email + bulk (2-3 days):
- `app/api/send-email/route.ts:2` — configure Resend templates: confirmation, shipping, welcome, abandoned, failed + admin copies.
- CSV: real import parser + upsert in `app/dashboard/articles/page.tsx:32`; filtered order export; image optimization on upload; delivery-zone UI.
- Acceptance: register/login/Google works, checkout creates real order, tracking page resolves real ID, abandoned cart appears in dashboard, discount applies automatically, emails delivered.

## 4. Phase 3 — Beginner polish (1 day, low risk, can run parallel)

- `active` filter in `service/firebase/database.ts:78` (`where active==true`).
- Header logo from `service/constants.ts:4`, category thumbnails, testimonials via constants.
- Spinner in `order-card.tsx:269`, configurable max qty (`order-card.tsx:178`), finish `next/image sizes`.

## 5. Phase 4 — Professional (starts from finished Intermediate copy)

5.1 Migration (1 day): copy Intermediate `app/`, `components/`, `contexts/`, `service/`, `interfaces/` into `professional-plan/src/` (currently empty scaffold, only `next+react` in `package.json:11`). Fix import paths, `npm run build`.

5.2 Payments + analytics (1-2 weeks):
- Stripe + BaridiMob integration, method selector, webhook handler, `paymentStatus` on orders, admin paid-vs-COD overview.
- Dashboard: revenue/volume/top-sellers/funnel/AOV/traffic (reuse `recharts` pattern from beginner), GA4 + Meta Pixel events.
- Deps to add: `stripe`, `@stripe/stripe-js`, `recharts`, GA/Meta snippets.

5.3 Growth (1 week): abandoned recovery automation + flash sales engine (scheduler + countdown + banner + auto-revert + analytics).
5.4 Engagement (1 week): loyalty points + VIP tiers + redeem, bundles with stock validation, restock notify, low-stock alerts.
5.5 Platform (1 week): PWA manifest + SW + push, role-based admin + activity log, inventory history, customer segmentation.
5.6 Polish (3-5 days): multi-currency display + selector, returns/refunds, domain wizard docs, weekly/monthly report job.
- Acceptance: online payment succeeds + webhook marks paid, analytics charts render from real orders, recovery email recovers test cart, flash sale reverts on expiry.

## 6. Phase 5 — Enterprise (starts from finished Professional copy)

6.1 Multi-tenancy first (1 week, blocks rest): implement `stores/{storeId}/*` isolation, store switcher, creation wizard, shared owner account, cross-store analytics. Decide in D6.
6.2 API + couriers (1-2 weeks): `/api/products|orders|customers|coupons` + API keys + Swagger at `/api/docs` + webhooks (`order.created`, `payment.received`) + Yalidine/ZR Express/EcoTrack adapter + labels + bulk shipment + tracking sync.
6.3 Intelligence (1-2 weeks): OpenAI/Gemini descriptions, chatbot, recommendations, review summary, forecasting, multi-warehouse + transfers + SKU/barcode.
6.4 Business models (1-2 weeks): vendors + commissions + payouts, subscriptions + Stripe recurring + MRR, dropshipping suppliers + auto-forward.
6.5 Enterprise finish (1 week): A/B engine + results dashboard, white-label + theme engine + custom CSS + branded emails, PDF invoices + packing slips + bulk ZIP, audit logs + GDPR + export, hosting/SLA docs.
- Deps to add: `openai`, `swagger`/`next-swagger-doc`, `graphql`, courier SDKs, `jspdf`/`pdfkit` + `jszip`, `web-push`.

## 7. Execution order and dependencies

```
Phase 1 (Basic) ──> Phase 2 (Intermediate) ──> Phase 4 (Professional) ──> Phase 5 (Enterprise)
       \                    ^
        \── Phase 3 (Beginner polish, parallel) ──/
Phase 0 decisions D1-D4 before Phase 1; D5 before Phase 4; D6 before Phase 5.
```

Do not start Phase 4 until Phase 2 acceptance passes. Do not start Phase 5 until Phase 4 payments + analytics pass.

## 8. Risks

1. Coupon ownership dispute causes rework — locked by D1/D2.
2. SMS/courier APIs in Algeria have poor docs — spike-test providers in Phase 1, not Phase 5.
3. Discount stacking + flash sales + coupons triple-interaction — single `price-engine` module required in Intermediate Phase 2.3, reused in Professional.
4. Enterprise multi-tenancy retrofit is high cost if delayed — schema decision D6 must precede Professional migration (add `storeId` field now even if single-store).
5. Docs drift (`REPORT.md`, `PLANS_COMPARISON.md` counts 106 vs 126, Blog/i18n inheritance) — update `BUILD_STATUS_REPORT.md` at each phase exit.

## 9. Next step

Confirm D1-D4, then execute Phase 1 task 1.1. Estimated: Basic 4-6 days, Intermediate 7-10 days, Beginner 1 day, Professional 4-6 weeks, Enterprise 6-8 weeks.
