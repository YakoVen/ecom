# DzShip Integration Plan — All 5 Tiers
> Date: 2026-10-07
> Source: https://github.com/DZBuild-com/dzship (docs: endpoints, integrating, statuses, cash-on-delivery, wilayas-and-communes, choosing-a-courier, couriers/*)
> Rule: build in `intermediate-plan/`, verify, propagate upward. Never call dzship from client code.

---

## 0. Architecture Overview

```
Browser (client)          Server (Next.js)              DzShip API
─────────────────         ──────────────────            ──────────
checkout/page.tsx    →    app/api/shipping/quote/    →  POST /v1/rates
                          app/api/shipping/desks/     →  POST /v1/desks
                          app/api/shipping/create/    →  POST /v1/orders
                          app/api/shipping/track/     →  POST /v1/track
                          service/shipping/dzship.ts  (server-only wrapper)
                          service/firebase/database.ts (Firestore)
```

**One rule:** courier credentials live in server env vars only. Browser never sees them.

---

## 1. Shared Infrastructure (build once, reuse everywhere)

### 1.1 Environment Variables (add to `.env.master` + `sync-env.mjs`)

```bash
# DzShip
DZSHIP_BASE_URL=https://freeship.dzbuild.com
DZSHIP_DEFAULT_COURIER=sandbox
DZSHIP_FROM_WILAYA=16

# Yalidine family
YALIDINE_API_ID=
YALIDINE_API_TOKEN=

# ZR Express (Procolis)
ZREXPRESS_TOKEN=
ZREXPRESS_KEY=

# Maystro
MAYSTRO_API_KEY=

# NOEST
NOEST_API_TOKEN=
NOEST_GUID=

# Ecotrack (DHD, Conexlog, MSM Go, Rocket, ...)
ECOTRACK_TOKEN=
ECOTRACK_BASE_URL=          # only for generic ecotrack courier
```

### 1.2 New Shared Files (per plan, in `src/service/shipping/`)

| File | Purpose |
|---|---|
| `dzship.ts` | Server-only client wrapper. Exports `quoteRate()`, `createOrder()`, `trackOrder()`, `getDesks()`, `getCouriers()`, `getWilayas()`, `getCommunes()`. Uses `DzshipError` for typed errors. |
| `types.ts` | Shared TS types: `ShipmentQuote`, `ShipmentOrder`, `ShipmentTracking`, `CourierInfo`, `WilayaInfo`, `CommuneInfo`, `StopDesk`. |
| `status-map.ts` | Maps 14 canonical dzship statuses → your `order_states` (0-3) + FR/AR labels. |
| `wilaya-data.ts` | Loads vendored `wilayas.json` + `communes.json` (or fetches from API with cache). Exports `getWilayaList()`, `getCommuneList(wilayaCode)`, `resolveShipAs(code)`. |

### 1.3 New API Routes (per plan, in `src/app/api/shipping/`)

| Route | Method | Body | Response |
|---|---|---|---|
| `/api/shipping/quote` | POST | `{ wilayaCode, deliveryType, courier? }` | `{ deliveryFee, returnFee, total, currency }` |
| `/api/shipping/desks` | POST | `{ wilayaCode, courier }` | `StopDesk[]` or `{ error: 'NOT_SUPPORTED' }` |
| `/api/shipping/create` | POST | `{ orderId, courier, recipient, deliveryType, productList, codAmount, ... }` | `{ trackingNumber, status, reference, labelUrl? }` |
| `/api/shipping/track` | POST | `{ trackingNumber, courier }` | `{ status, rawStatus, events[] }` |

All routes: server-only, validate input, handle `DzshipError` with proper HTTP codes, respect `Retry-After`.

### 1.4 Data Model Changes

#### `interfaces/order.ts` — add fields:

```typescript
export interface Order {
  // ... existing fields ...
  
  // DzShip shipment fields
  wilayaCode?: number;           // numeric 1-58 (or shipAs for 59-69)
  wilayaName?: string;           // display name
  communeName?: string;          // courier spelling (French)
  addressLine?: string;          // full address for home delivery
  phoneAlt?: string;             // optional second phone
  courier?: string;              // 'yalidine' | 'zrexpress' | 'maystro' | 'noest' | 'dhd' | ...
  trackingNumber?: string;       // from dzship
  courierStatus?: string;        // canonical: created | in_transit | delivered | ...
  rawStatus?: string;            // raw courier wording
  labelUrl?: string;             // printable label (Yalidine/Maystro/NOEST)
  stopDeskId?: string;           // for stopdesk delivery
  codAmount?: number;            // integer DZD
  quotedDeliveryFee?: number;   // captured at creation
  returnFee?: number;             // captured at creation
  confirmedAt?: string;          // ISO timestamp when admin confirmed
  weightKg?: number;
  declaredValue?: number;
  freeShipping?: boolean;
  isExchange?: boolean;
}

export interface TrackingEntry {
  status: string;                // canonical dzship status (was: number)
  raw?: string;                  // raw courier wording
  timestamp: string;
  note?: string;
}
```

#### `interfaces/delivery-zone.ts` — extend:

```typescript
export interface DeliveryZone {
  wilayaId: number;
  wilayaName: string;
  deskPrice: number;
  homePrice: number;
  active: boolean;
  // New fields for live rates
  courier?: string;
  fromWilaya?: number;
  lastQuotedAt?: string;
}
```

#### `interfaces/shipment.ts` — new:

```typescript
export interface ShipmentQuote {
  deliveryFee: number;
  returnFee: number;
  total: number;
  currency: string;
}

export interface ShipmentOrder {
  orderId: string;
  courier: string;
  recipient: {
    fullName: string;
    phone: string;
    phoneAlt?: string;
    wilayaCode: number;
    communeName: string;
    addressLine?: string;
  };
  deliveryType: 'home' | 'stopdesk';
  stopDeskId?: string;
  productList: string;
  codAmount: number;
  weightKg?: number;
  declaredValue?: number;
  freeShipping?: boolean;
  isExchange?: boolean;
  notes?: string;
}

export interface ShipmentTracking {
  status: string;
  rawStatus?: string;
  events: Array<{
    status: string;
    raw?: string;
    timestamp: string;
    note?: string;
  }>;
}

export interface StopDesk {
  id: string;
  name: string;
  wilayaCode: number;
  communeName: string;
  address: string;
}

export interface WilayaInfo {
  code: number;
  nameFr: string;
  nameAr: string;
  nameAscii: string;
  communeCount: number;
  courierSupported: boolean;
  shipAs?: number;
  isDeepSouth?: boolean;
}

export interface CommuneInfo {
  wilayaCode: number;
  nameFr: string;
  nameAr: string;
}
```

### 1.5 Status Mapping (`service/shipping/status-map.ts`)

```typescript
// Canonical dzship statuses → your order_states (0-3)
const STATUS_TO_STATE: Record<string, number> = {
  created: 0,
  pending_pickup: 0,
  picked_up: 1,
  in_transit: 2,
  at_hub: 2,
  out_for_delivery: 2,
  delivery_attempted: 2,
  delivered: 3,
  on_hold: 2,
  return_in_transit: 2,
  returned: 3,  // terminal — but negative revenue
  cancelled: 3,  // terminal
  lost: 3,       // terminal
  unknown: 2,
};

// FR/AR labels for tracking page
const STATUS_LABELS: Record<string, { fr: string; ar: string }> = {
  created: { fr: 'Enregistré', ar: 'تم التسجيل' },
  pending_pickup: { fr: 'En attente de ramassage', ar: 'في انتظار الاستلام' },
  picked_up: { fr: 'Ramassé', ar: 'تم الاستلام من المتجر' },
  in_transit: { fr: 'En transit', ar: 'قيد النقل' },
  at_hub: { fr: 'Au centre de tri', ar: 'في مركز الفرز' },
  out_for_delivery: { fr: 'En cours de livraison', ar: 'خرج للتوصيل' },
  delivery_attempted: { fr: 'Tentative de livraison', ar: 'محاولة تسليم' },
  delivered: { fr: 'Livré', ar: 'تم التسليم' },
  on_hold: { fr: 'En attente', ar: 'معلّق' },
  return_in_transit: { fr: 'Retour en cours', ar: 'الإرجاع قيد النقل' },
  returned: { fr: 'Retourné', ar: 'تم الإرجاع' },
  cancelled: { fr: 'Annulé', ar: 'ملغى' },
  lost: { fr: 'Perdu', ar: 'مفقود' },
  unknown: { fr: 'Statut inconnu', ar: 'حالة غير معروفة' },
};
```

---

## 2. Per-Tier Implementation

### Tier 1: Beginner (32 features, single-item COD, flat-rate)

**Goal:** Zero-cred validation + commune picker. No courier account needed.

#### Changes:
1. **Vendored data:** Copy `data/wilayas.json` + `data/communes.json` from dzship repo into `beginner-plan/src/service/shipping/data/`.
2. **Checkout form:** Replace flat-rate with `POST /api/shipping/quote` (uses `sandbox` courier). Show live `deliveryFee`.
3. **Commune picker:** Replace free-text `<input>` with wilaya-filtered `<select>` from vendored communes.
4. **Phone validation:** Add `^(05|06|07)\d{8}$` regex.
5. **Order creation:** Add `wilayaCode`, `communeName`, `codAmount` to order doc.

#### Files to modify:
- `beginner-plan/src/app/checkout/page.tsx` (or order-card for single-item)
- `beginner-plan/src/interfaces/order.ts`
- `beginner-plan/src/service/firebase/database.ts` (add shipment fields to createOrder)
- `beginner-plan/src/app/actions/orders.ts`

#### New files:
- `beginner-plan/src/service/shipping/dzship.ts`
- `beginner-plan/src/service/shipping/types.ts`
- `beginner-plan/src/service/shipping/wilaya-data.ts`
- `beginner-plan/src/app/api/shipping/quote/route.ts`
- `beginner-plan/src/service/shipping/data/wilayas.json`
- `beginner-plan/src/service/shipping/data/communes.json`

#### Acceptance:
- [ ] Checkout shows live delivery fee from sandbox
- [ ] Commune dropdown filters by selected wilaya
- [ ] Phone validation rejects invalid numbers
- [ ] Order stores `wilayaCode` + `communeName`
- [ ] `npm run build` passes

---

### Tier 2: Basic (cart + variants, per-wilaya pricing)

**Goal:** Live rates replace hardcoded `600/400`. Real courier account optional.

#### Changes:
1. **Fix hardcoded delivery fee:** `basic-plan/app/checkout/page.tsx:29` — replace `600/400` with `POST /api/shipping/quote`.
2. **Delivery zone fallback:** Keep `delivery_zones` collection as fallback when API fails.
3. **Add return fee display:** Show `returnFee` in admin for unit economics.
4. **Courier selector (optional):** If owner has creds, show courier dropdown. Default to `sandbox` for quotes.

#### Files to modify:
- `basic-plan/app/checkout/page.tsx` (lines 27-31, add quote fetch)
- `basic-plan/src/interfaces/order.ts`
- `basic-plan/src/service/firebase/database.ts`
- `basic-plan/src/app/actions/orders.ts`

#### New files:
- Same shared files as Beginner (copy pattern)

#### Acceptance:
- [ ] Delivery fee comes from live API (or zone fallback)
- [ ] Return fee visible in admin order detail
- [ ] `npm run build` passes

---

### Tier 3: Intermediate (accounts, tracking, wishlist)

**Goal:** Real tracking sync + confirm-before-ship flow.

#### Changes:
1. **Two-phase checkout:** Checkout saves order with `state=0` (En attente). Admin clicks "Ship" -> calls `POST /api/shipping/create` -> saves `trackingNumber`.
2. **Tracking page:** `intermediate-plan/app/track/page.tsx` — replace `ORDER123` mock with `POST /api/shipping/track`. Show canonical status + FR/AR labels + timeline.
3. **Admin order table:** Add "Ship via courier" button + "Track" button per order.
4. **Delivery attempted alert:** When `courierStatus === 'delivery_attempted'`, show banner in admin + trigger SMS/email.
5. **Desks:** If `deliveryMethod === 'desk'`, fetch desks via `POST /api/shipping/desks` and require selection.

#### Files to modify:
- `intermediate-plan/src/app/checkout/page.tsx` (remove immediate shipment)
- `intermediate-plan/src/app/track/page.tsx` (real tracking)
- `intermediate-plan/src/components/dashboard/order-table.tsx` (add Ship/Track buttons)
- `intermediate-plan/src/components/dashboard/command-amplify.tsx` (show courier status)
- `intermediate-plan/src/interfaces/order.ts`
- `intermediate-plan/src/service/firebase/database.ts`
- `intermediate-plan/src/app/actions/orders.ts`

#### New files:
- `intermediate-plan/src/service/shipping/dzship.ts`
- `intermediate-plan/src/service/shipping/types.ts`
- `intermediate-plan/src/service/shipping/status-map.ts`
- `intermediate-plan/src/service/shipping/wilaya-data.ts`
- `intermediate-plan/src/app/api/shipping/quote/route.ts`
- `intermediate-plan/src/app/api/shipping/desks/route.ts`
- `intermediate-plan/src/app/api/shipping/create/route.ts`
- `intermediate-plan/src/app/api/shipping/track/route.ts`
- `intermediate-plan/src/service/shipping/data/wilayas.json`
- `intermediate-plan/src/service/shipping/data/communes.json`

#### Acceptance:
- [ ] Checkout does NOT create shipment
- [ ] Admin can ship order -> trackingNumber saved
- [ ] Tracking page shows real status from courier
- [ ] `delivery_attempted` triggers notification
- [ ] Desk selection works for couriers that support it
- [ ] `npm run build` passes

---

### Tier 4: Professional (payments, analytics, recovery, flash, loyalty)

**Goal:** Courier choice in recovery + revenue on delivered only.

#### Changes:
1. **All Intermediate shipping features** (copy from Intermediate).
2. **Courier selector at checkout:** If multiple couriers configured, show dropdown. Store `courier` on order.
3. **Revenue recognition:** Analytics counts revenue only when `courierStatus === 'delivered'`. `returned` = negative margin.
4. **Recovery automation:** `delivery_attempted` -> auto-send SMS/email with coupon.
5. **Flash sale + shipping:** Flash sale price + live shipping quote = total shown.
6. **Loyalty:** Points earned only on `delivered` orders.
7. **Multi-currency:** Show delivery fee in selected currency.

#### Files to modify:
- All Intermediate files above, plus:
- `professional-plan/src/app/dashboard/analytics/page.tsx` (revenue = delivered only)
- `professional-plan/src/app/dashboard/abandoned-carts/page.tsx` (delivery_attempted trigger)
- `professional-plan/src/components/dashboard/order-table.tsx` (courier filter)
- `professional-plan/src/service/analytics.ts` (delivered-only revenue)

#### Acceptance:
- [ ] Revenue dashboard shows delivered-only revenue
- [ ] `delivery_attempted` triggers recovery email/SMS
- [ ] Courier selector works at checkout
- [ ] Points earned only on delivered orders
- [ ] `npm run build` passes

---

### Tier 5: Enterprise (multi-store, API, couriers, AI)

**Goal:** Full courier adapter + bulk operations + tracking sync.

#### Changes:
1. **All Professional shipping features** (copy from Professional).
2. **Courier adapter interface:** `service/shipping/adapters/` — one file per courier family. Swap by changing `courier` key.
3. **Bulk shipment creation:** Admin selects multiple orders -> bulk create. Queue with rate limiting (200/h).
4. **Label printing:** Show `labelUrl` in admin. For Ecotrack (PDF bytes), fetch and display inline.
5. **Tracking sync cron:** Scheduled function polls `POST /v1/track` for all non-terminal orders. Updates Firestore.
6. **Multi-tenant:** `storeId` on shipment. Cross-store courier analytics.
7. **API endpoints:** Expose `/api/v1/shipments` for external systems.
8. **White-label:** Branded tracking page with store logo.

#### New files:
- `enterprise-plan/src/service/shipping/adapters/yalidine.ts`
- `enterprise-plan/src/service/shipping/adapters/zrexpress.ts`
- `enterprise-plan/src/service/shipping/adapters/maystro.ts`
- `enterprise-plan/src/service/shipping/adapters/noest.ts`
- `enterprise-plan/src/service/shipping/adapters/ecotrack.ts`
- `enterprise-plan/src/app/api/v1/shipments/route.ts`
- `enterprise-plan/src/app/api/v1/shipments/track/route.ts`
- `enterprise-plan/src/app/api/v1/shipments/bulk/route.ts`

#### Acceptance:
- [ ] Bulk shipment creation respects rate limits
- [ ] Labels print from admin
- [ ] Tracking sync cron updates all orders
- [ ] Multi-store isolation works
- [ ] API endpoints functional
- [ ] `npm run build` passes

---

## 3. Execution Order (dependency-safe)

```
Phase 0: Shared infrastructure (types, dzship.ts, status-map, wilaya-data)
    ↓
Phase 1: Beginner (sandbox validation + commune picker, zero creds)
    ↓
Phase 2: Basic (live rates replace hardcoded fees)
    ↓
Phase 3: Intermediate (two-phase checkout + tracking + desks)
    ↓
Phase 4: Professional (courier choice + revenue-on-delivered + recovery)
    ↓
Phase 5: Enterprise (adapters + bulk + cron + API)
```

**Do not skip phases.** Each builds on the previous.

---

## 4. Testing Strategy

| Stage | Method |
|---|---|
| Dev | Use `courier: 'sandbox'` — validates everything, creates nothing |
| Staging | One real courier account (Yalidine recommended). Test 5-10 orders. |
| Production | Start with one courier. Add others after 1 week. |

**Test cases:**
- [ ] Valid Algerian phone (05/06/07) -> success
- [ ] Invalid phone -> `422 invalid_phone`
- [ ] Valid commune -> success
- [ ] Misspelled commune -> `COURIER_ERROR` with message
- [ ] Wilaya 59-69 -> auto-resolve to `shipAs` code
- [ ] Stop-desk for Yalidine -> success
- [ ] Stop-desk for ZR Express -> `422 NOT_SUPPORTED`
- [ ] Rate limit -> `429` + `Retry-After`
- [ ] Tracking -> canonical status + events

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Courier API down | Fallback to `delivery_zones` static pricing |
| Rate limit hit | Queue + retry with `Retry-After`. Max 200/h. |
| Credential leak | Server-only env vars. Never `NEXT_PUBLIC_`. |
| Maystro duplicate | Check before resend. Same name+phone+day = error. |
| NOEST draft trap | Dzship handles validation. Homegrown doesn't. |
| Commune misspelling | Vendored data + normalized matching. |
| 69 wilaya confusion | `shipAs` resolution in `wilaya-data.ts`. |

---

## 6. Estimated Effort

| Phase | Days | Depends on |
|---|---|---|
| Phase 0: Shared infra | 2 | — |
| Phase 1: Beginner | 1 | Phase 0 |
| Phase 2: Basic | 1 | Phase 1 |
| Phase 3: Intermediate | 3-4 | Phase 2 |
| Phase 4: Professional | 2-3 | Phase 3 |
| Phase 5: Enterprise | 5-7 | Phase 4 |
| **Total** | **14-18 days** | |

---

## 7. Next Step

1. Confirm this plan.
2. Start Phase 0: create shared types + `dzship.ts` wrapper in `intermediate-plan/`.
3. Test with `sandbox` courier.
4. Propagate upward.
