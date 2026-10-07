# Restyle Plan — 5 Unique Design Systems
> Date: 2026-10-07
> Goal: each tier gets its own identity — font, palette, radius, shadows, component styling — while keeping the shared component architecture (no logic rewrites).

## 1. Current state (the problem)

All 5 tiers share one look: Inter font, indigo-600 primary, `rounded-xl`, white cards, gray-50 background. Professional and enterprise are byte-identical copies. Nothing distinguishes a 1,000 DZD store from a 40,000 DZD platform.

## 2. Design tokens per tier

| Token | Beginner | Basic | Intermediate | Professional | Enterprise |
|---|---|---|---|---|---|
| **Font** | Nunito (rounded, friendly) | Poppins (geometric) | DM Sans (clean modern) | Playfair Display + Inter (serif headings) | Space Grotesk (technical) |
| **Primary** | teal-500 | indigo-600 | violet-600 | amber-600 (gold) | slate-900 + cyan-400 accent |
| **Background** | #f0fdfa (mint tint) | #f8fafc | #faf5ff (violet tint) | #fffbeb (warm cream) | #0f172a dark |
| **Text** | slate-800 | slate-900 | slate-900 | stone-900 | slate-100 |
| **Radius** | rounded-2xl (playful) | rounded-xl | rounded-2xl | rounded-lg (refined) | rounded-md (sharp) |
| **Shadow** | soft, colored | standard | soft violet | subtle warm | none, border-based |
| **Buttons** | chunky, bold | standard | gradient hover | elegant serif labels | uppercase, tracking-wide |
| **Cards** | white + teal ring | white + border | white + violet tint | cream + gold ring | slate-800 + cyan border |
| **Vibe** | Fun starter | Trustworthy shop | Modern brand | Premium boutique | Tech platform |

## 3. Implementation approach (zero logic changes)

Each tier gets a **design-system module** that components read from, instead of hardcoded classes:

1. `src/theme/tokens.ts` — per-tier CSS custom properties + Tailwind theme extension
2. `src/theme/ThemeProvider.tsx` — sets `data-theme` on `<html>` + applies font class
3. `src/components/ui/` — shared primitives: `Btn`, `Card`, `Badge`, `Input`, `SectionTitle` that consume tokens
4. Migrate components tier-by-tier: header → product cards → buttons → dashboard shell

**Migration order per tier** (each step = build check):
1. Tokens + font + globals (instant identity shift)
2. Header + footer + buttons
3. Product cards + badges
4. Dashboard shell (sidebar, tables, modals)
5. Landing page sections

## 4. Screenshot workflow (for your critique)

Since I can't see your screen, I'll capture screenshots for you to review:

```bash
# After each tier's restyle, capture:
# - Homepage (desktop 1280px)
# - Product detail page
# - Cart/checkout
# - Dashboard home
# - Mobile view (375px) of homepage
```

You review the screenshots, tell me what to change (colors, spacing, font size, layout), and I iterate. Each round = new screenshots.

## 5. Per-tier restyle spec

### Beginner — "Friendly Starter"
- Font: Nunito (Google Fonts, rounded feel)
- Palette: teal-500 primary, mint background, white cards with teal-50 borders
- Radius: rounded-2xl everywhere, chunky buttons
- Dashboard: light teal sidebar, playful stat cards
- Landing: big friendly hero, emoji-free but warm copy tone

### Basic — "Trustworthy Shop"
- Font: Poppins (geometric, professional)
- Palette: indigo-600 primary, clean white/gray, blue accents
- Radius: rounded-xl, standard shadows
- Dashboard: classic blue sidebar, clean tables
- Landing: professional hero, trust badges, clear CTAs

### Intermediate — "Modern Brand"
- Font: DM Sans (clean, contemporary)
- Palette: violet-600 primary, soft violet tints, gradient accents
- Radius: rounded-2xl, soft colored shadows
- Dashboard: violet-tinted sidebar, modern cards
- Landing: bold hero with gradient, brand-forward sections

### Professional — "Premium Boutique"
- Font: Playfair Display (serif) for headings + Inter for body
- Palette: amber-600/gold primary, warm cream background, stone text
- Radius: rounded-lg, subtle warm shadows, elegant spacing
- Dashboard: dark sidebar (stone-900), gold accents, refined tables
- Landing: editorial hero, serif headlines, luxury feel

### Enterprise — "Tech Platform"
- Font: Space Grotesk (technical, modern)
- Palette: dark slate-900 background, cyan-400 accent, white text
- Radius: rounded-md, no shadows, border-based cards
- Dashboard: dark sidebar, cyan accents, data-dense tables
- Landing: dark hero, grid layout, technical aesthetic

## 6. Files to create per tier

```
src/theme/
  tokens.ts          # CSS vars + Tailwind theme
  ThemeProvider.tsx  # sets data-theme + font
src/components/ui/
  Btn.tsx            # token-driven button
  Card.tsx           # token-driven card
  Badge.tsx          # token-driven badge
  Input.tsx          # token-driven input
  SectionTitle.tsx   # token-driven heading
```

## 7. Screenshot capture plan

After each tier restyle:
1. Start dev server
2. Use Puppeteer (already in beginner-plan deps) to capture 5 screenshots per tier
3. Save to `screenshots/` folder
4. You review → I iterate

## 8. Your input needed

1. **Approve the 5 design directions** (or suggest alternatives)
2. **Confirm screenshot workflow** — I capture, you critique, I iterate
3. **Priority order** — which tier first? (Suggestion: Professional since it's the "premium" showcase)

## 9. Estimated effort

- Tokens + font + globals: 30 min per tier
- Component migration: 1-2 hours per tier
- Screenshot + iteration: 30 min per round
- Total: ~2-3 hours for all 5 tiers (excluding your review time)
