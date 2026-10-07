# DzShip Integration — Gap Analysis & Revised Plan Comparison
> Date: 2026-10-07
> Purpose: What exists vs what's missing, and how to revise plans to fit the DzShip API
> Source: Full codebase audit of all 5 plans + DzShip API docs

---

## 1. Feature Gap Matrix

### Legend
- ✅ Exists and works
- ⚠️ Exists but incomplete/broken
- ❌ Missing entirely

| Feature | Beginner | Basic | Intermediate | Professional | Enterprise | DzShip API Support |
|---------|----------|-------|--------------|--------------|------------|-------------------|
| **ADDRESS SELECTION** |
| Wilaya dropdown | ✅ JSON | ✅ String array | ✅ String array | ✅ String array | ✅ String array | ✅ `GET /v1/wilayas` |
| Commune dropdown | ✅ JSON | ❌ Free-text input | ❌ Free-text input | ❌ Free-text input | ❌ Free-text input | ✅ `GET /v1/communes` |
| Wilaya by numeric code | ⚠️ `id` field | ❌ `indexOf+1` | ❌ `indexOf+1` | ❌ `indexOf+1` | ❌ `indexOf+1` | ✅ `wilayaCode: 1-58` |
| Commune by courier spelling | ⚠️ Custom JSON | ❌ Free-text | ❌ Free-text | ❌ Free-text | ❌ Free-text | ✅ `communeName` |
| 59-69 wilaya `shipAs` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ `GET /v1/wilayas?all=1` |
| Deep south surcharge | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ `isDeepSouth` |
| **DELIVERY OPTIONS** |
| Home delivery | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ `deliveryType: home` |
| Stop-desk delivery | ❌ | ✅ UI only | ✅ UI only | ✅ UI only | ✅ UI only | ✅ `deliveryType: stopdesk` |
| Stop-desk selector | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ `POST /v1/desks` |
| Live rate quote | ❌ | ❌ Hardcoded | ❌ Hardcoded | ❌ Hardcoded | ❌ Hardcoded | ✅ `POST /v1/rates` |
| Return fee display | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ `returnFee` in rates |
| Free shipping flag | ❌ | ❌ | ⚠️ Discount type only | ⚠️ Discount type only | ⚠️ Discount type only | ✅ `freeShipping: true` |
| **ORDER MANAGEMENT** |
| COD amount | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ `codAmount` (int DZD) |
| Courier selection | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ `courier` key |
| Tracking number | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ `trackingNumber` |
| Courier status | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 14 canonical statuses |
| Label URL | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ `labelUrl` (Yalidine/Maystro/NOEST) |
| Confirm before ship | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Required by COD guide |
| Bulk shipment | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Queue with rate limit |
| **TRACKING** |
| Tracking page | ❌ | ❌ | ✅ Visual mock | ✅ Visual mock | ✅ Visual mock | ✅ `POST /v1/track` |
| Real-time tracking | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ `POST /v1/track` |
| Status timeline | ❌ | ❌ | ⚠️ Manual notes | ⚠️ Manual notes | ⚠️ Manual notes | ✅ Events array |
| FR/AR status labels | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ 14 labels provided |
| Delivery attempted alert | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ `delivery_attempted` |
| **ADMIN** |
| Ship order button | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ `POST /v1/orders` |
| Track order button | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ `POST /v1/track` |
| Label printing | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ `labelUrl` |
| Courier management UI | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ `GET /v1/couriers` |
| Delivery zone fallback | ❌ | ✅ Full 58 | ⚠️ 3 hardcoded | ⚠️ 3 hardcoded | ⚠️ 3 hardcoded | ✅ Fallback if API fails |
| **NOTIFICATIONS** |
| SMS on ship | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Trigger on `created` |
| SMS on delivery | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Trigger on `delivered` |
| SMS on attempted | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Trigger on `delivery_attempted` |
| Email on ship | ❌ | ❌ | ❌ | ❌ | ✅ Resend configured | ✅ Trigger on `created` |
| Email on delivery | ❌ | ❌ | ❌ | ❌ | ✅ Resend configured | ✅ Trigger on `delivered` |
| **ANALYTICS** |
| Delivered revenue | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Only `delivered` = revenue |
| Return rate | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ `returned` orders |
| Courier performance | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Per-courier stats |
| Delivery fee spend | ❌ | ❌ | ❌ | ❌ | ✅ `quotedDeliveryFee` | ✅ Captured at creation |
| **API (Enterprise)** |
| REST API shipments | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ `/api/v1/shipments` |
| Webhooks | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ `shipment.created/updated` |
| Multi-store courier config | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ Per-store creds |

---

## 2. Critical Issues in Current Plans

### Issue 1: Commune Free-Text Input (All Plans Except Beginner)

**Problem:** Basic, Intermediate, Professional, Enterprise all use `<input type="text">` for commune. This is the #1 cause of failed parcel creation.

**Fix:** Replace with wilaya-filtered dropdown from vendored `communes.json` or `GET /v1/communes?wilaya=`.

### Issue 2: Wilaya as String Array + `indexOf+1`

**Problem:** All plans use `wilayas.indexOf(selectedWilaya) + 1` to get the code. This breaks on:
- Accents (`Sidi Bel Abbès` vs `Sidi Bel Abbes`)
- Reordering
- Name variants (`Alger` vs `Algiers` vs `الجزائر`)

**Fix:** Use numeric `wilayaCode` from vendored `wilayas.json`. Store code, not name.

### Issue 3: Hardcoded Delivery Fees

**Problem:** Basic uses `600/400`, Intermediate/Professional/Enterprise use `800/400` as fallback. These rot and don't reflect real courier pricing.

**Fix:** Use `POST /v1/rates` for live quotes. Keep `delivery_zones` as fallback only.

### Issue 4: No Confirm-Before-Ship Flow

**Problem:** All plans create order + shipment simultaneously. This violates the COD guide's #1 rule.

**Fix:** Two-phase checkout. Order saved first. Admin confirms by phone. Then shipment created.

### Issue 5: Tracking is Visual Mock

**Problem:** Intermediate/Professional/Enterprise tracking pages show a visual pipeline but have no real courier data.

**Fix:** Integrate `POST /v1/track` for real-time status + events.

### Issue 6: Professional and Enterprise Are Identical

**Problem:** Both plans share the same shipping/delivery code. No differentiation.

**Fix:** Professional adds courier choice + revenue-on-delivered. Enterprise adds adapters + bulk + cron + API.

### Issue 7: Delivery Zone Management Inconsistent

**Problem:** Basic has full 58-wilaya management. Intermediate/Professional/Enterprise only show 3 hardcoded wilayas.

**Fix:** All plans should have full 58-wilaya management. Use vendored data.

### Issue 8: No Server-Side Delivery Validation (Intermediate/Professional/Enterprise)

**Problem:** Only Basic validates delivery fees server-side. Others trust client-side values.

**Fix:** All plans must validate `deliveryFee` against `POST /v1/rates` or `delivery_zones`.

### Issue 9: `free_shipping` Discount Type Has No Implementation

**Problem:** Defined in discount interface and API route but doesn't actually waive delivery fees.

**Fix:** Implement `freeShipping: true` flag on order creation.

### Issue 10: No Return Fee Economics

**Problem:** No plan captures or displays `returnFee`. COD returns are negative margin.

**Fix:** Capture `returnFee` at creation. Show in admin. Include in analytics.

---

## 3. Revised Plan Comparison (DzShip-Optimized)

### Tier 1: Beginner (32 features)
**Goal:** Zero-cred validation + commune picker

| Feature | Current | Required Change |
|---|---|---|
| Wilaya dropdown | ✅ JSON | Add numeric `wilayaCode` |
| Commune dropdown | ✅ JSON | Use `communeName` (courier spelling) |
| Phone validation | ❌ | Add `^(05|06|07)\d{8}$` |
| Live rate quote | ❌ Flat 500 | `POST /v1/rates` (sandbox) |
| COD amount | ❌ | Add `codAmount` to order |
| Delivery fields | ❌ | Add `wilayaCode`, `communeName`, `addressLine` |

**New files:** `service/shipping/dzship.ts`, `types.ts`, `wilaya-data.ts`, `app/api/shipping/quote/route.ts`

---

### Tier 2: Basic (49 features)
**Goal:** Live rates replace hardcoded fees

| Feature | Current | Required Change |
|---|---|---|
| Live rate quote | ❌ Hardcoded `600/400` | `POST /v1/rates` |
| Delivery zone fallback | ✅ Full 58 | Keep, add `courier` + `fromWilaya` |
| Return fee display | ❌ | Show `returnFee` in admin |
| Courier selector | ❌ | Optional dropdown if multiple configured |
| Server-side validation | ✅ | Keep |

**New files:** Same as Beginner + `status-map.ts`

---

### Tier 3: Intermediate (106 features)
**Goal:** Two-phase checkout + real tracking + desks

| Feature | Current | Required Change |
|---|---|---|
| Two-phase checkout | ❌ | Order first, ship after confirm |
| Tracking page | ⚠️ Visual mock | `POST /v1/track` real data |
| Stop-desk selector | ❌ | `POST /v1/desks` + selection |
| Delivery attempted alert | ❌ | SMS/Email on `delivery_attempted` |
| Label printing | ❌ | `labelUrl` from Yalidine/Maystro/NOEST |
| Status timeline | ⚠️ Manual notes | Real events from `POST /v1/track` |
| FR/AR labels | ❌ | 14 canonical labels |
| Delivery zone management | ⚠️ 3 hardcoded | Full 58 from vendored data |
| Server-side validation | ❌ | Add delivery fee validation |

**New files:** All Basic files + `app/api/shipping/create/route.ts`, `app/api/shipping/track/route.ts`, `app/api/shipping/desks/route.ts`

---

### Tier 4: Professional (167 features)
**Goal:** Courier choice + revenue-on-delivered + recovery

| Feature | Current | Required Change |
|---|---|---|
| All Intermediate features | — | Copy from Intermediate |
| Courier selector at checkout | ❌ | Dropdown if multiple configured |
| Revenue on delivered | ❌ | Analytics: only `delivered` = revenue |
| Recovery automation | ❌ | `delivery_attempted` → SMS/Email + coupon |
| Bulk shipment | ❌ | Queue with rate limit |
| Courier performance analytics | ❌ | Per-courier delivered rate |
| Return fee economics | ❌ | `returnFee` in margin calc |
| Multi-currency delivery fee | ❌ | Show in selected currency |

**New files:** All Intermediate files + `service/shipping/adapters/` (interface)

---

### Tier 5: Enterprise (232 features)
**Goal:** Full courier adapter + bulk + cron + API

| Feature | Current | Required Change |
|---|---|---|
| All Professional features | — | Copy from Professional |
| Courier adapter interface | ❌ | One file per courier family |
| Bulk API endpoints | ❌ | `/api/v1/shipments` |
| Webhooks | ❌ | `shipment.created/updated/delivered/returned` |
| Tracking sync cron | ❌ | Scheduled `POST /v1/track` |
| Multi-store courier config | ❌ | Per-store credentials |
| White-label tracking | ❌ | Branded tracking page |
| Cross-store analytics | ❌ | Rollup across stores |

**New files:** All Professional files + `adapters/yalidine.ts`, `adapters/zrexpress.ts`, `adapters/maystro.ts`, `adapters/noest.ts`, `adapters/ecotrack.ts`

---

## 4. Revised Feature Count

| Tier | Current | New (DzShip) | Total |
|---|---|---|---|
| Beginner | 32 | +6 | 38 |
| Basic | 49 | +5 | 54 |
| Intermediate | 106 | +10 | 116 |
| Professional | 167 | +8 | 175 |
| Enterprise | 232 | +10 | 242 |
| **Total** | **586** | **+39** | **625** |

---

## 5. Revised Execution Order

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

## 6. What Already Exists (No Need to Build)

| Feature | Location | Reuse |
|---|---|---|
| Wilaya JSON data | `beginner-plan/assets/json/wilaya.json` | Copy to all plans |
| Commune JSON data | `beginner-plan/assets/json/commune.json` | Copy to all plans |
| Delivery zone interface | `basic-plan/interfaces/delivery-zone.ts` | Extend |
| Delivery zone DB functions | `basic-plan/service/firebase/database.ts` | Copy + extend |
| Admin delivery page | `basic-plan/app/dashboard/delivery/page.tsx` | Copy + extend |
| Order interface (delivery fields) | `basic-plan/interfaces/order.ts` | Extend |
| Tracking page (visual) | `intermediate-plan/app/track/page.tsx` | Replace mock with real |
| TrackingEntry interface | `intermediate-plan/interfaces/order.ts` | Change `status` to `string` |
| `addTrackingNote` function | `intermediate-plan/service/firebase/database.ts` | Keep |
| User address management | `intermediate-plan/app/account/addresses/page.tsx` | Copy |
| `free_shipping` discount type | `intermediate-plan/app/api/discounts/apply/route.ts` | Implement |
| Resend email | `professional-plan/package.json` | Use for notifications |
| Wilaya analytics | `professional-plan/src/service/analytics.ts` | Extend |

---

## 7. Summary

### What Exists
- Wilaya/commune JSON data (Beginner only)
- Delivery zone management (Basic only, full 58)
- Visual tracking page (Intermediate+)
- Manual tracking notes (Intermediate+)
- User address management (Intermediate+)
- Resend email (Professional+)
- Wilaya analytics (Professional+)

### What's Missing (Must Build)
- DzShip API integration (all plans)
- Live rate quotes (all plans)
- Real tracking sync (all plans)
- Confirm-before-ship flow (all plans)
- Stop-desk selection (all plans)
- Label printing (all plans)
- Courier management (all plans)
- Bulk shipment (Professional+)
- Webhooks (Enterprise)
- Multi-store courier config (Enterprise)

### Critical Fixes Needed
1. Replace commune free-text with dropdown (Basic+)
2. Replace wilaya string array with numeric code (all)
3. Replace hardcoded fees with live rates (all)
4. Add confirm-before-ship flow (all)
5. Add server-side delivery validation (Intermediate+)
6. Differentiate Professional from Enterprise
