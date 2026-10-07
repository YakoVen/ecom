# DzShip Integration — Features & Options Report
> Date: 2026-10-07
> Purpose: What features and options the websites must contain for full DzShip shipping API integration
> Source: https://github.com/DZBuild-com/dzship

---

## 1. Checkout Features (Customer-Facing)

### 1.1 Address Selection

| Feature | Required | Description |
|---|---|---|
| Wilaya dropdown | Yes | 58 wilayas (numeric code 1-58). Show FR + AR names. Auto-resolve 59-69 via `shipAs`. |
| Commune dropdown | Yes | Filtered by selected wilaya. 1541 communes. Show FR + AR names. Send FR spelling to courier. |
| Address line | Yes | Free text, up to 255 chars. Required for home delivery. |
| Phone number | Yes | Algerian mobile `05/06/07`. Validate `^(05|06|07)\d{8}$`. |
| Alt phone | No | Second number courier may call. |
| Save address | No | Store in user profile for next order. |

### 1.2 Delivery Options

| Feature | Required | Description |
|---|---|---|
| Delivery type | Yes | `home` (door) or `stopdesk` (pickup point). |
| Stop-desk selector | Conditional | Fetch via `POST /v1/desks`. Show name + address. Hide if `NOT_SUPPORTED`. |
| Live rate quote | Yes | `POST /v1/rates` per wilaya + delivery type. Show `deliveryFee` + `returnFee`. |
| Free shipping toggle | No | `freeShipping: true` — merchant absorbs fee. |
| Delivery time estimate | No | Show estimated days based on wilaya tier. |
| Deep south surcharge | Auto | `isDeepSouth: true` wilayas show higher fee automatically. |

### 1.3 Order Summary

| Feature | Required | Description |
|---|---|---|
| Subtotal | Yes | From cart. |
| Delivery fee | Yes | From live quote. |
| Return fee | No | Show for transparency. |
| Discount | Yes | Coupon/loyalty. |
| Total | Yes | Subtotal + delivery - discount. |
| COD amount | Yes | `codAmount = total`. Integer DZD. |

---

## 2. Admin Dashboard Features

### 2.1 Order Management

| Feature | Required | Description |
|---|---|---|
| Ship order | Yes | Button per order. Calls `POST /v1/orders`. Saves `trackingNumber`. |
| Bulk ship | No | Select multiple orders. Queue with rate limit (200/h). |
| Track order | Yes | Button per order. Shows canonical status + timeline. |
| Tracking sync | No | Cron polls `POST /v1/track` for non-terminal orders. |
| Label printing | No | Open `labelUrl` in new tab. |
| Cancel shipment | No | Yalidine/Maystro/NOEST only. |
| Order status filter | Yes | Filter by `courierStatus`. |
| Courier filter | Yes | Filter by `courier`. |

### 2.2 Courier Management

| Feature | Required | Description |
|---|---|---|
| Courier selector | Yes | Choose default courier. |
| Multi-courier | No | Route by wilaya or customer choice. |
| Credential config | Yes | Admin UI to set `apiId`/`apiToken` etc. |
| Courier status | Yes | Show which couriers are configured/active. |
| Rate comparison | No | Compare `deliveryFee` across couriers. |
| Return fee config | No | Set default `returnFee` per courier. |

### 2.3 Delivery Zones (Fallback)

| Feature | Required | Description |
|---|---|---|
| Zone editor | Yes | CRUD for `delivery_zones` collection. |
| Home/desk pricing | Yes | Separate prices per method. |
| Active toggle | Yes | Enable/disable zones. |
| Fallback mode | Yes | Use when DzShip API fails. |

### 2.4 Notifications

| Feature | Required | Description |
|---|---|---|
| SMS on ship | No | "Your order has been shipped." |
| SMS on delivery | No | "Your order has been delivered." |
| SMS on attempted | No | "Courier tried to deliver. Call to reschedule." |
| Email on ship | Yes | Tracking number + link. |
| Email on delivery | Yes | Confirmation + review request. |
| Email on attempted | No | "Action required." |
| Push notification | No | PWA push on status change. |

### 2.5 Analytics

| Feature | Required | Description |
|---|---|---|
| Delivered revenue | Yes | Count only `delivered` orders. |
| Return rate | No | % of `returned` orders. |
| Delivery fee spend | Yes | Total `quotedDeliveryFee`. |
| Return fee spend | Yes | Total `returnFee`. |
| Courier performance | No | Delivered rate per courier. |
| Wilaya breakdown | No | Orders/revenue per wilaya. |
| Avg delivery time | No | Days from `picked_up` to `delivered`. |

---

## 3. Customer-Facing Features

### 3.1 Tracking Page

| Feature | Required | Description |
|---|---|---|
| Status timeline | Yes | Visual pipeline: created → picked_up → in_transit → out_for_delivery → delivered. |
| Status labels | Yes | FR + AR labels for 14 canonical statuses. |
| Raw status | No | Show courier's original wording. |
| Event history | Yes | Full event list with timestamps. |
| Delivery attempted alert | No | "Courier tried to deliver. Contact us." |
| Return in progress | No | "Your return is on the way." |
| Estimated delivery | No | Based on courier SLA. |

### 3.2 Order History

| Feature | Required | Description |
|---|---|---|
| Order status | Yes | Show `courierStatus` mapped to `order_states`. |
| Tracking number | Yes | Show + copy button. |
| Label download | No | Download PDF label. |
| Reorder | No | One-click reorder same items. |

### 3.3 Notifications

| Feature | Required | Description |
|---|---|---|
| SMS on status change | No | Configurable per status. |
| Email on status change | No | Configurable per status. |
| Push notification | No | PWA push. |
| WhatsApp notification | No | "Your order is out for delivery." |

---

## 4. API & Integration Features

### 4.1 REST API (Enterprise)

| Feature | Required | Description |
|---|---|---|
| `GET /api/v1/shipments` | No | List shipments. |
| `POST /api/v1/shipments` | No | Create shipment. |
| `GET /api/v1/shipments/:id` | No | Get tracking. |
| `POST /api/v1/shipments/bulk` | No | Bulk create. |
| `GET /api/v1/shipments/labels/:id` | No | Get label PDF. |

### 4.2 Webhooks (Enterprise)

| Feature | Required | Description |
|---|---|---|
| `shipment.created` | No | Fired on creation. |
| `shipment.tracking_updated` | No | Fired on status change. |
| `shipment.delivered` | No | Fired on delivery. |
| `shipment.returned` | No | Fired on return. |
| Delivery log | No | Show webhook delivery attempts. |
| Retry logic | No | Auto-retry failed webhooks. |

### 4.3 Multi-Store (Enterprise)

| Feature | Required | Description |
|---|---|---|
| Store-level courier config | No | Each store has own courier creds. |
| Store-level tracking | No | Isolated per store. |
| Cross-store analytics | No | Rollup across stores. |

---

## 5. Configuration Options

### 5.1 General Settings

| Option | Type | Default | Description |
|---|---|---|---|
| `DZSHIP_DEFAULT_COURIER` | string | `sandbox` | Default courier for quotes. |
| `DZSHIP_FROM_WILAYA` | number | `16` | Origin wilaya (Yalidine requires). |
| `DZSHIP_TIMEOUT_MS` | number | `10000` | API timeout. |
| `DZSHIP_RETRY_ATTEMPTS` | number | `3` | Retry on `overloaded`. |
| `DZSHIP_RATE_LIMIT_BUFFER` | number | `0.9` | Stop at 90% of limit. |

### 5.2 Courier-Specific Settings

| Option | Type | Default | Description |
|---|---|---|---|
| `YALIDINE_API_ID` | string | — | Yalidine credential. |
| `YALIDINE_API_TOKEN` | string | — | Yalidine credential. |
| `ZREXPRESS_TOKEN` | string | — | ZR credential. |
| `ZREXPRESS_KEY` | string | — | ZR credential. |
| `MAYSTRO_API_KEY` | string | — | Maystro credential. |
| `NOEST_API_TOKEN` | string | — | NOEST credential. |
| `NOEST_GUID` | string | — | NOEST credential. |
| `ECOTRACK_TOKEN` | string | — | Ecotrack credential. |
| `ECOTRACK_BASE_URL` | string | — | Generic Ecotrack tenant. |

### 5.3 Feature Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `ENABLE_LIVE_RATES` | boolean | `true` | Use `POST /v1/rates`. |
| `ENABLE_DESK_DELIVERY` | boolean | `true` | Show stop-desk option. |
| `ENABLE_BULK_SHIP` | boolean | `false` | Admin bulk ship. |
| `ENABLE_TRACKING_SYNC` | boolean | `false` | Cron tracking sync. |
| `ENABLE_LABEL_PRINT` | boolean | `false` | Show label button. |
| `ENABLE_DELIVERY_ATTEMPTED_ALERT` | boolean | `true` | Alert on `delivery_attempted`. |
| `ENABLE_REVENUE_ON_DELIVERED` | boolean | `true` | Only count `delivered` as revenue. |
| `FALLBACK_TO_ZONES` | boolean | `true` | Use `delivery_zones` if API fails. |

---

## 6. Feature Priority by Tier

### Beginner (32 features)
- [ ] Wilaya dropdown (58)
- [ ] Commune dropdown (filtered)
- [ ] Phone validation
- [ ] Live rate quote (sandbox)
- [ ] COD amount display

### Basic (49 features)
- [ ] All Beginner features
- [ ] Live rate quote (real courier)
- [ ] Return fee display
- [ ] Delivery zone fallback
- [ ] Courier selector (if multiple configured)

### Intermediate (106 features)
- [ ] All Basic features
- [ ] Two-phase checkout (confirm before ship)
- [ ] Tracking page (real-time)
- [ ] Stop-desk selection
- [ ] Delivery attempted alert
- [ ] SMS/Email notifications
- [ ] Label printing

### Professional (167 features)
- [ ] All Intermediate features
- [ ] Multi-courier routing
- [ ] Revenue on delivered only
- [ ] Recovery automation (delivery_attempted)
- [ ] Bulk shipment
- [ ] Courier performance analytics
- [ ] Return fee economics

### Enterprise (232 features)
- [ ] All Professional features
- [ ] Courier adapter interface
- [ ] Bulk API endpoints
- [ ] Webhooks
- [ ] Tracking sync cron
- [ ] Multi-store courier config
- [ ] White-label tracking page
- [ ] Cross-store analytics

---

## 7. Data Requirements

### 7.1 Vendored Data (from dzship repo)

| File | Contents | Size |
|---|---|---|
| `data/wilayas.json` | 58 wilayas (code, FR, ar, ascii, communeCount) | ~5 KB |
| `data/communes.json` | 1541 communes (wilayaCode, fr, ar) | ~100 KB |
| `data/wilayas-2026.json` | 69 wilayas (+courierSupported, shipAs) | ~6 KB |
| `data/new-wilayas-2026.json` | 11 new wilayas + 108 communes | ~10 KB |

### 7.2 Firestore Collections

| Collection | Purpose |
|---|---|
| `orders` | Add `courier`, `trackingNumber`, `courierStatus`, `labelUrl`, `codAmount`, `returnFee`, `confirmedAt` |
| `delivery_zones` | Fallback pricing (existing) |
| `couriers` | Courier config (new) |
| `shipments` | Shipment log (new) |
| `tracking_events` | Tracking history (new) |
| `webhook_log` | Webhook delivery log (new) |

---

## 8. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Rate quote latency | < 2s |
| Order creation latency | < 3s |
| Tracking sync (100 orders) | < 60s |
| Desk list cache | 24h |
| Wilaya/commune data | Vendored (no API call) |
| Uptime | 99.9% (fallback to zones) |
| Rate limit compliance | Never exceed 200/h |
| Credential security | Server-only env vars |

---

## 9. Summary

### Must-Have (MVP)
1. Wilaya + commune dropdowns (vendored data)
2. Phone validation (`05/06/07`)
3. Live rate quote (`POST /v1/rates`)
4. Two-phase checkout (confirm before ship)
5. Admin ship button (`POST /v1/orders`)
6. Tracking page (`POST /v1/track`)
7. Status mapping (14 canonical → 0-3)
8. Delivery zone fallback
9. Server-only credentials

### Should-Have (Production)
1. Stop-desk selection
2. Label printing
3. Bulk shipment
4. Tracking sync cron
5. SMS/Email notifications
6. Delivery attempted alert
7. Revenue on delivered only
8. Return fee economics

### Nice-to-Have (Enterprise)
1. Multi-courier routing
2. Webhooks
3. REST API
4. Multi-store config
5. White-label tracking
6. Cross-store analytics
