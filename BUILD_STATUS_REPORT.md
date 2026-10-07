# Ecom Build Status Report
> Date: 2026-10-06
> Scope: `beginner-plan/`, `basic-plan/`, `intermediate-plan/`, `professional-plan/`, `enterprise-plan/`
> Sources: `REPORT.md`, `PLANS_COMPARISON.md`, 5x `FEATURES_REPORT.md`, code inspection

## 1. Summary (rechecked 2026-10-07 — all 5 build clean, all servers up)

| Tier | Routes (build) | Actual | Verdict |
|------|---------|--------|---------|
| `beginner-plan/` | 11 | 32 built | Complete. 6 polish items remain. |
| `basic-plan/` | 13 | Cart + Variants + Stock + Delivery-admin built, no coupons per owner decision; stock sync fixed | Shippable. Reviews/SMS/theme deferred to Intermediate. |
| `intermediate-plan/` | 32 | Auth, cart, checkout, tracking, wishlist, coupons, discounts, articles, orders wired; recovery dashboards wired | Core flows working. Email still stubbed. |
| `professional-plan/` | 40 | + analytics, flash sales, bundles, loyalty, returns, inventory+, recovery automation, roles, currency; order/articles/settings/accounts fully wired | All key-free differentiators done. Needs keys: Resend, Stripe. |
| `enterprise-plan/` | 40 | Mirror of professional; enterprise-only layers (multi-store, API, couriers, AI, marketplace) still specced, not built | Real store. Platform layers next. |

Evidence for empty scaffolds: `professional-plan/package.json:11` and `enterprise-plan/package.json:11` contain only `next`, `react`, `react-dom`. No `firebase`, `stripe`, `recharts`, `resend`, `openai`.

## 2. Tier 1: beginner-plan — Built

Built (verified):
- Storefront: landing, catalog + search/filter/sort, detail carousel, COD form + server price check (`beginner-plan/app/actions/orders.ts:36`), WhatsApp + share (`beginner-plan/components/article-page/presentation.tsx`), breadcrumbs, skeletons, SEO constants (`beginner-plan/service/constants.ts`).
- Admin: Firebase Auth guard (`beginner-plan/app/dashboard/layout.tsx`), article CRUD (`beginner-plan/service/firebase/database.ts:57`), orders + status + stats (`beginner-plan/components/dashboard/order-table.tsx`), detail modal (`beginner-plan/components/dashboard/command-amplify.tsx`).
- Already fixed vs old report: 404 (`beginner-plan/app/articles/[id]/page.tsx:45`), delete confirm modal (`beginner-plan/components/dashboard/widget/edit-card.tsx:92`).

To continue (polish only):
1. Filter `active:false` in storefront. Currently `getArticles()` in `beginner-plan/service/firebase/database.ts:78` has no `where` clause.
2. Use `logo` constant in header. Currently empty in `beginner-plan/service/constants.ts:4`, header hardcodes image in `beginner-plan/components/general/header.tsx:29`.
3. Real category thumbnails. All empty in `beginner-plan/service/constants.ts:23`, placeholder div in `beginner-plan/components/general/categorie-widget.tsx:9`.
4. Testimonials configurable. Hardcoded in `beginner-plan/components/landingpage/ratings-preview.tsx:4`.
5. Order submit spinner. Text-only `Envoi...` in `beginner-plan/components/article-page/order-card.tsx:269`.
6. Configurable max quantity. Hardcoded `10` in `beginner-plan/components/article-page/order-card.tsx:178`.
7. Finish `next/image` `sizes` coverage (8 files have it, missing in `categorie-widget.tsx:55`, `article-editor.tsx:150`, `order-table.tsx:183`).

## 3. Tier 2: basic-plan — Partially built

Built:
- Cart: `basic-plan/contexts/CartContext.tsx:19` (localStorage `ecom_cart`, variant-aware keys), `basic-plan/app/cart/page.tsx:11`, `basic-plan/components/cart/cart-drawer.tsx:13`, `basic-plan/app/checkout/page.tsx:14`, wired in `basic-plan/app/layout.tsx:5`.
- Variants: model `basic-plan/interfaces/article.ts:1`, selector `basic-plan/components/article-page/presentation.tsx:107`, admin editor `basic-plan/components/dashboard/article-editor.tsx:253`.
- Stock: toggle `basic-plan/components/dashboard/article-editor.tsx:123`, badge + disabled buttons `basic-plan/components/article-page/presentation.tsx:27`, `basic-plan/service/firebase/database.ts:91`.
- Delivery: model `basic-plan/interfaces/delivery-zone.ts:1`, CRUD `basic-plan/service/firebase/database.ts:132`, admin 58-wilaya table `basic-plan/app/dashboard/delivery/page.tsx:20`.

Broken (built but not wired):
1. Header cart badge hardcoded `0`, `useCart` commented out — `basic-plan/components/general/header.tsx:8`.
2. Checkout delivery fee hardcoded `600/400`, never calls `getDeliveryPrice` — `basic-plan/app/checkout/page.tsx:111`.
3. `basic-plan/components/article-page/order-card.tsx:5` is `return null` stub; logic moved to `presentation.tsx` but WhatsApp button lost.
4. `basic-plan/middleware.ts:4` sets `no-store` only, no auth check.

To continue (in order):
1. Fix 4 bugs above.
2. Coupons: only `basic-plan/interfaces/coupon.ts:1` exists. Need validation + discount math + admin page + checkout input + order display. Currently only passthrough `discount='0'` in `basic-plan/app/checkout/page.tsx:37`.
3. Reviews: only `basic-plan/interfaces/review.ts:1` + static mock. Need form + list + `database.ts` functions + moderation page.
4. Delivery-zone wiring: connect checkout to Firestore pricing.
5. SMS notifications: zero code, no dependency in `basic-plan/package.json:11`.
6. Theme customization: zero code; settings page is mock with `TODO` in `basic-plan/app/dashboard/settings/page.tsx:17`.

Note: `basic-plan/FEATURES_REPORT.md:92` says coupons/reviews/SMS/theme are NOT in Basic, while `intermediate-plan/FEATURES_REPORT.md:7` says they migrate from Basic. Decide ownership before building; recommendation: finish coupons + stock + delivery in Basic, leave reviews/SMS/theme to Intermediate.

## 4. Tier 3: intermediate-plan — Service built, UI mocked

Built (real logic):
- `intermediate-plan/contexts/AuthContext.tsx:29` (email + Google + Firestore `users` profile), `intermediate-plan/contexts/WishlistContext.tsx:17` (localStorage + Firestore merge), `intermediate-plan/contexts/CartContext.tsx:18` (+ `sessionId` foundation).
- `intermediate-plan/service/firebase/database.ts:16` (articles, orders + `addTrackingNote:94` + `createFailedOrder:99`, `validateCoupon:157`, `getActiveDiscounts:280`, `saveAbandonedCart:299`).
- Models: `intermediate-plan/interfaces/discount.ts:1`, `abandoned-cart.ts:1`, `order.ts:36` (`trackingHistory`), `user.ts`.
- Deps present: `firebase`, `firebase-admin`, `resend` in `intermediate-plan/package.json:11`.

Mocked (UI exists, no backend call):
- `intermediate-plan/app/login/page.tsx:20`, `register/page.tsx:28` use `setTimeout` instead of `useAuth()`.
- `intermediate-plan/app/track/page.tsx:29` `if ORDER123` mock.
- `intermediate-plan/app/account/wishlist/page.tsx:9` hardcoded items, ignores `useWishlist()`.
- `intermediate-plan/app/dashboard/discounts/page.tsx:6`, `coupons/page.tsx:7` local `useState` only.
- `intermediate-plan/app/dashboard/abandoned-carts/page.tsx:6` `mockAbandonedCarts` + fake toast; same for `failed-orders/page.tsx:7`.
- `intermediate-plan/app/checkout/page.tsx:39` `subtotal=4500` hardcoded, no cart/order/delivery/discount logic.
- APIs stub: `intermediate-plan/app/api/validate-coupon/route.ts:7` only `PROMO10`, `discounts/apply/route.ts:7` dummy 10%, `send-email/route.ts:2` `simulated:true`.
- CSV export is client `Blob` dump only (`intermediate-plan/components/dashboard/order-table.tsx:57`); import is `alert()` (`intermediate-plan/app/dashboard/articles/page.tsx:32`).
- `intermediate-plan/middleware.ts:1` no session/role gate (check commented out).

To continue (in order):
1. Phase A — wiring: login/register to `AuthContext`, middleware session + admin-role guard, checkout to cart + `createOrder` + coupon validate + discount breakdown + delivery pricing + auth auto-fill, track page to `getOrderById`.
2. Phase B — dashboard: discounts/coupons/abandoned/failed pages to real `database.ts` functions; implement abandonment detection job + failed-order capture + error logging.
3. Phase C — email: configure Resend templates + triggers (confirmation, shipping, welcome, abandoned, failed). Add admin copy alerts.
4. Phase D — bulk: real CSV import (parse + upsert) + filtered order export; image optimization pipeline; delivery-zone UI; custom `error.tsx`/`not-found.tsx` already exist, verify.
5. Explicitly removed per report, do not build here: Blog, i18n FR/EN/AR, RTL (`intermediate-plan/FEATURES_REPORT.md:238`).

## 5. Tier 4: professional-plan — Not started

Built: none. `src/app/page.tsx` is default template.

To continue (per `professional-plan/FEATURES_REPORT.md:37`, in order):
1. Migrate all Intermediate code first (do not start from empty `src/`).
2. Phase 1: payments (Stripe + BaridiMob/CCP, selector, webhook, `paymentStatus`, admin overview) + analytics (revenue/volume/top-sellers/funnel/AOV + GA4 + Meta Pixel).
3. Phase 2: abandoned recovery (track + email/SMS + coupon + analytics) + flash sales (engine + countdown + banner + auto-revert).
4. Phase 3: loyalty (points + tiers + redeem + history) + bundles + restock notify + low-stock alerts.
5. Phase 4: PWA (`manifest.json`, `sw.js`, push) + role-based admin + inventory log.
6. Phase 5: multi-currency + returns/refunds + custom domain wizard + weekly/monthly reports.

Missing deps to add: `stripe`, `@stripe/stripe-js`, chart library (`recharts` used in beginner), `next-pwa` or Serwist, `web-push`.

## 6. Tier 5: enterprise-plan — Not started

Built: none. Identical scaffold to Professional.

To continue (per `enterprise-plan/FEATURES_REPORT.md:33`, in order):
1. Migrate all Professional code first; design multi-tenant Firestore isolation first (blocks everything else).
2. Phase 1: store switcher + creation wizard + REST API + API keys + webhooks + Yalidine/ZR Express/EcoTrack + labels.
3. Phase 2: AI (descriptions, chatbot, recommendations, review summary, forecasting) + multi-warehouse + SKU/barcode.
4. Phase 3: marketplace (vendors + commissions + payouts) + subscriptions (Stripe recurring + MRR) + dropshipping (suppliers + auto-forward).
5. Phase 4: A/B testing + white-label (theme engine + custom CSS + branded emails).
6. Phase 5: PDF invoices + packing slips + Swagger docs + GraphQL (optional) + audit logs + GDPR + dedicated hosting/SLA.

Missing deps to add: `stripe`, `openai` or Gemini SDK, `swagger`/`next-swagger-doc`, `graphql`, courier SDKs, `pdfkit`/`jspdf` + `jszip`, `web-push`.

## 7. Recommended continuation order

1. Finish `basic-plan/` bugs + coupons (unblocks revenue).
2. Wire `intermediate-plan/` Phase A + B (auth + checkout + tracking + recovery dashboards).
3. Finish `beginner-plan/` polish (1 day, low risk).
4. Add email (Resend) + SMS provider once, share across Basic/Intermediate.
5. Only then start Professional migration; do not build Professional/Enterprise from empty scaffold.
6. Fix docs: resolve Basic vs Intermediate ownership of coupons/reviews/SMS/theme; remove Blog/i18n from Professional inheritance list; correct feature counts (106 vs 126); update Basic status to partial.
