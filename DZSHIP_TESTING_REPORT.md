# DzShip Integration — Testing Report
> Date: 2026-10-07
> Purpose: How to test the DzShip shipping API integration at every stage
> Source: https://github.com/DZBuild-com/dzship

---

## 1. Testing Stages

### Stage 1: Sandbox Testing (No Credentials Needed)

The `sandbox` courier validates exactly what a real courier validates — phone, wilaya, commune, field limits — and creates nothing.

```bash
curl -X POST https://freeship.dzbuild.com/v1/orders \
  -H 'Content-Type: application/json' \
  -d '{
    "courier": "sandbox",
    "order": {
      "recipient": { "fullName": "Amine Bouzid", "phone": "0551234567",
                     "wilayaCode": 16, "communeName": "Bab Ezzouar" },
      "deliveryType": "home", "productList": "Sneakers x1", "codAmount": 4500
    }
  }'
```

**Expected response:**
```json
{ "trackingNumber": "DZTEST-1A2B3C", "status": "created", "reference": "FS-…" }
```

**What sandbox catches:**
- Invalid phone format (not 05/06/07)
- Invalid wilaya code (not 1-58)
- Unknown commune name
- Field length violations
- Missing required fields

**What sandbox does NOT catch:**
- Real courier credential issues
- Real parcel creation
- Real tracking flow
- Rate limit behavior
- Label generation

---

### Stage 2: Staging Testing (One Real Courier Account)

Use one real courier (Yalidine recommended — most complete API). Test 5-10 orders end-to-end.

#### 2.1 Setup

1. Create Yalidine account at https://www.yalidine.com
2. Get `apiId` + `apiToken` from dashboard
3. Set env vars:
```bash
DZSHIP_DEFAULT_COURIER=yalidine
YALIDINE_API_ID=your_id
YALIDINE_API_TOKEN=your_token
DZSHIP_FROM_WILAYA=16
```

#### 2.2 Test Matrix

| # | Test Case | Input | Expected Result |
|---|---|---|---|
| 1 | Valid home delivery | Phone `0551234567`, Wilaya 16, Commune `Bab Ezzouar`, `deliveryType: home` | `201` + `trackingNumber` + `labelUrl` |
| 2 | Valid stop-desk | Same + `deliveryType: stopdesk` + valid `stopDeskId` | `201` + `trackingNumber` |
| 3 | Invalid phone | Phone `0123456789` | `422 invalid_phone` |
| 4 | Invalid wilaya | `wilayaCode: 99` | `404 NOT_FOUND` |
| 5 | Misspelled commune | `communeName: "Bab Ezzouar "` (trailing space) | `502 COURIER_ERROR` |
| 6 | Wilaya 59-69 (new) | `wilayaCode: 68` (Bou Saâda) | Auto-resolve to `shipAs: 28` |
| 7 | Deep south wilaya | `wilayaCode: 11` (Tamanrasset) | Higher `deliveryFee` in quote |
| 8 | Rate limit | 201 orders in 1 hour | `429 rate_limited` + `Retry-After` |
| 9 | Tracking | Valid `trackingNumber` | Canonical status + events array |
| 10 | Duplicate prevention | Same `reference` twice | Second returns same `trackingNumber` |

#### 2.3 Tracking Test

```bash
curl -X POST https://freeship.dzbuild.com/v1/track \
  -H 'Content-Type: application/json' \
  -d '{
    "courier": "yalidine",
    "credentials": { "apiId": "…", "apiToken": "…" },
    "trackingNumber": "yal-ABC123"
  }'
```

**Expected response:**
```json
{
  "status": "in_transit",
  "rawStatus": "En transit",
  "events": [
    { "status": "created", "timestamp": "2026-10-07T10:00:00Z" },
    { "status": "picked_up", "timestamp": "2026-10-07T12:00:00Z" },
    { "status": "in_transit", "timestamp": "2026-10-07T14:00:00Z" }
  ]
}
```

---

### Stage 3: Production Rollout

| Week | Action |
|---|---|
| 1 | One courier (Yalidine), 10-20 real orders, monitor daily |
| 2 | Add second courier (ZR Express or Ecotrack), compare delivered rate |
| 3 | Enable auto-ship for confirmed orders |
| 4 | Enable tracking sync cron |
| 5+ | Add couriers as needed, optimize routing by wilaya |

---

## 2. Feature-Level Testing

### 2.1 Checkout Flow

| Feature | Test | Expected |
|---|---|---|
| Live rate quote | Select wilaya 16, home delivery | Shows `deliveryFee` from `POST /v1/rates` |
| Return fee display | Same quote | Shows `returnFee` |
| Commune dropdown | Select wilaya 16 | Shows only communes in wilaya 16 |
| Phone validation | Enter `0123456789` | Rejects with error |
| Phone validation | Enter `0551234567` | Accepts |
| Desk selection | Select desk delivery | Fetches desks, requires selection |
| Desk not supported | ZR Express + desk | Shows "not supported" message |
| Wilaya 59-69 | Select Bou Saâda (68) | Auto-resolves to shipAs 28 |
| Deep south | Select Tamanrasset (11) | Shows higher fee |
| Free shipping | Toggle `freeShipping` | Customer not charged delivery |

### 2.2 Admin Dashboard

| Feature | Test | Expected |
|---|---|---|
| Ship order | Click "Ship" on pending order | Creates parcel, saves `trackingNumber` |
| Track order | Click "Track" | Shows canonical status + timeline |
| Bulk ship | Select 5 orders, click "Bulk ship" | Creates 5 parcels, respects rate limit |
| Label print | Click "Print label" | Opens `labelUrl` in new tab |
| Delivery attempted | Status = `delivery_attempted` | Shows alert banner |
| Return received | Status = `returned` | Shows negative revenue impact |

### 2.3 Customer-Facing

| Feature | Test | Expected |
|---|---|---|
| Tracking page | Enter order ID | Shows status timeline |
| Status labels | Any status | Shows FR/AR label |
| Delivery attempted | Status = `delivery_attempted` | Shows "courier tried to deliver" message |
| SMS notification | Status change | Customer receives SMS |
| Email notification | Status change | Customer receives email |

---

## 3. Error Handling Tests

| Error Code | HTTP | Trigger | Expected App Behavior |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | Missing required field | Show field-level errors |
| `invalid_phone` | 422 | Bad phone format | Show "invalid phone" message |
| `NOT_FOUND` | 404 | Bad wilaya/commune | Show "invalid location" message |
| `NOT_SUPPORTED` | 422 | ZR + desk | Hide desk option |
| `rate_limited` | 429 | >200 orders/h | Queue + retry after `Retry-After` |
| `COURIER_ERROR` | 502 | Courier rejected | Show courier message |
| `overloaded` | 503 | Capacity guard | Retry after few seconds |
| `CONFIGURATION_ERROR` | 400 | Missing credentials | Show "courier not configured" |
| `EGRESS_BLOCKED` | 400 | Bad `baseUrl` | Show config error |

---

## 4. Performance Tests

| Test | Method | Expected |
|---|---|---|
| Rate quote latency | Time `POST /v1/rates` | < 2s |
| Order creation latency | Time `POST /v1/orders` | < 3s |
| Tracking sync | 100 orders via cron | < 60s total |
| Desk list caching | Request same wilaya twice | Second from cache |
| Wilaya/commune data | Load 1541 communes | < 100ms (vendored) |

---

## 5. Security Tests

| Test | Expected |
|---|---|
| Credentials in browser | Never visible (server-only env) |
| API key in client JS | Never exposed |
| Rate limit respect | Never exceed 200/h |
| Idempotency | Same `reference` = same `trackingNumber` |
| Input validation | All inputs validated server-side |
| SQL injection | N/A (Firestore) |
| XSS | All outputs escaped |

---

## 6. Integration Test Checklist

### Pre-Deployment
- [ ] Sandbox tests pass (all 10 cases)
- [ ] Staging tests pass (all 10 cases)
- [ ] Error handling verified (all 9 codes)
- [ ] Performance benchmarks met
- [ ] Security review passed
- [ ] Env vars set in production
- [ ] `delivery_zones` fallback populated
- [ ] Vendored wilaya/commune data up to date

### Post-Deployment
- [ ] First 10 orders shipped successfully
- [ ] Tracking sync running
- [ ] No rate limit hits
- [ ] Customer notifications sending
- [ ] Admin dashboard showing courier status
- [ ] Labels printing correctly
- [ ] Revenue recognition correct (delivered only)
- [ ] Return handling correct (negative margin)

---

## 7. Test Automation (Optional)

```typescript
// Example: Jest test for status mapping
import { mapStatus } from './status-map';

test('maps canonical statuses to order_states', () => {
  expect(mapStatus('created')).toBe(0);
  expect(mapStatus('delivered')).toBe(3);
  expect(mapStatus('returned')).toBe(3);
  expect(mapStatus('unknown')).toBe(2);
});

// Example: API route test
import { POST } from './app/api/shipping/quote/route';

test('returns delivery fee for valid wilaya', async () => {
  const req = new Request('http://localhost/api/shipping/quote', {
    method: 'POST',
    body: JSON.stringify({ wilayaCode: 16, deliveryType: 'home' }),
  });
  const res = await POST(req);
  const data = await res.json();
  expect(data.deliveryFee).toBeGreaterThan(0);
  expect(data.currency).toBe('DZD');
});
```

---

## 8. Common Issues & Fixes

| Issue | Cause | Fix |
|---|---|---|
| `COURIER_ERROR: commune not found` | Misspelled commune | Use vendored `communes.json` |
| `invalid_phone` | Landline or wrong format | Validate `^(05|06|07)\d{8}$` |
| `NOT_SUPPORTED` for desks | ZR Express doesn't support | Hide desk option for ZR |
| `rate_limited` | Too many orders | Queue + retry with `Retry-After` |
| `CONFIGURATION_ERROR` | Missing credentials | Check env vars |
| Tracking not updating | Cron not running | Check scheduled function |
| Label not printing | `labelUrl` missing | Yalidine/Maystro/NOEST only |
| Duplicate parcels | Retry without `reference` | Always send `reference=orderId` |
