---
name: Arabian Petroleum Corporate FinTech
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#404947'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#707977'
  outline-variant: '#bfc8c6'
  surface-tint: '#316760'
  primary: '#01433d'
  on-primary: '#ffffff'
  primary-container: '#235b54'
  on-primary-container: '#99d1c7'
  inverse-primary: '#9ad1c8'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#00452e'
  on-tertiary: '#ffffff'
  tertiary-container: '#005f41'
  on-tertiary-container: '#68dca9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b5eee4'
  primary-fixed-dim: '#9ad1c8'
  on-primary-fixed: '#00201c'
  on-primary-fixed-variant: '#144f48'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 46px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 36px
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 30px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 19px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  financial-numeral:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.875rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style

The design system embodies the operational rigor, trust, and executive stature required for large-scale enterprise contracting, maintenance logistics, and site-level petty cash disbursements. Designed specifically for corporate treasuries, project managers, and site procurement officers across the GCC, the interface conveys reliability, high-level governance, and absolute fiscal precision.

The aesthetic fuses **Corporate Modern** with **Subtle Tactile FinTech Precision**:
- **Executive Elegance & Fiscal Rigor:** Unwavering, clean balance between white-collar fiscal accountability and field-level operational clarity.
- **RTL-Native Ergonomics:** Engineered from the ground up for right-to-left reading posture, ensuring logical hierarchy, natural finger reach, and optimal metric comprehension in Arabic.
- **Atmosphere:** High-trust, authoritative, serene yet prompt, utilizing petroleum hues reminiscent of engineering stability and gulf corporate heritage.

## Colors

The palette directly honors the corporate identity extracted from the brand mark, anchored by the distinguished petroleum teal and paired with deep architectural slates and crisp fiscal neutrals.

### Roles and Balance
- **Primary (`#235b54`) — Deep Petroleum Teal:** Anchors executive headers, hero summary cards, primary actions, and navigational markers. Conveys security, corporate depth, and regional industrial permanence.
- **Secondary (`#1e293b`) — Slate Charcoal:** Utilized for high-contrast alphanumeric metrics, SAR/AED currency notations, ledger titles, and grounded iconography.
- **Tertiary (`#059669`) — Emerald Ledger Green:** Applied selectively to verified petty-cash top-ups, approval states, positive ledger flows, and completed vouchers.
- **Neutral (`#64748b` to `#f8fafc`):** Neutral slates frame subtle hairline dividers, form boundaries, and micro-labels. Background surfaces rely on an ultra-crisp slate white (`#f8fafc`) accented by pure white (`#ffffff`) floating ledger tiles.
- **Warning / Fiscal Hold (`#d97706` / `#f59e0b`):** Allocated strictly for pending sign-offs, manager approvals, and budget allocation thresholds.

## Typography

The type scale accommodates dual-language Arabic (via system-mapped modern geometric sans fonts like Cairo or Tajawal) alongside Western financial tabular numerals, driven by the clean, modern structure of **Plus Jakarta Sans**.

### RTL & Numerals Rule
- **Arabic Text Rendering:** Line heights are calibrated 15–20% roomier than standard Latin configurations to allow Arabic diacritics, descenders, and ligatures ample breathing room without vertical clipping.
- **Financial Figures:** Currency amounts and serial voucher identifiers maintain tabular figure alignment (`font-variant-numeric: tabular-nums`) to preserve clean vertical scanning across expense reports, receipt line items, and audit logs.
- **Hierarchy:** Primary balance figures sit at high-weight focal points, while contextual labels (e.g., "مركز التكلفة / Cost Center", "رصيد العهدة / Custody Balance") remain medium-weight with controlled optical contrast.

## Layout & Spacing

This design system employs a focused, fluid 4-column mobile grid built specifically for single-handed, on-site petty-cash submissions, swift receipts upload, and executive approval flows.

### Mobile Grid & Safe Insets
- **Column System:** 4 fluid columns on mobile viewports with a persistent `16px` outer screen margin.
- **Vertical Rhythm:** 4px micro-grid baseline, where cards, input fields, bottom action bars, and list items scale in intervals of `8px` and `12px`.
- **RTL Symmetrical Margins:** Ensure consistent bilateral padding (`16px`) to prevent directional bias when flipping between English reference documentation and Arabic entry workflows.

## Elevation & Depth

Visual hierarchy leverages crisp tonal separation combined with petroleum-tinted ambient shadows, rejecting heavy drop shadows in favor of boardroom-grade clarity.

### Depth System
1. **Canvas Surface (Level 0):** Flat background in muted slate-tinted white (`#f8fafc`).
2. **Card & Ledger Containers (Level 1):** Solid `#ffffff` elevated by a whisper-soft ambient glow:
   - `0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03)`
   - Border: `1px solid rgba(226, 232, 240, 0.8)`
3. **Floating Metric & Custody Cards (Level 2):** Primary teal cards and hero summary tiles incorporate deep colored dispersion:
   - `0 8px 24px -4px rgba(35, 91, 84, 0.22), 0 2px 6px -1px rgba(35, 91, 84, 0.12)`
4. **Persistent Bottom Action Bar / Modals (Level 3):** Frosted corporate surface with subtle backdrop blur (`16px` blur, 95% opacity), accompanied by an upward dispersion:
   - `0 -4px 20px -2px rgba(15, 23, 42, 0.06)`
   - Border-top: `1px solid rgba(226, 232, 240, 0.9)`

## Shapes

The interface balances corporate authority with contemporary mobile ease through a calibrated **Rounded (Level 2)** geometry:
- **Base Components (0.5rem / 8px):** Input fields, inline filters, table cells, and petty-cash category chips.
- **Containers & Vouchers (1rem / 16px):** Expense cards, balance breakdown tiles, and approval bottom-sheet containers.
- **Pills & Status Badges (Full Radius):** Audit stage indicators ("معتمد", "قيد المراجعة", "مسودة") and quick-action transaction buttons.

## Components

### Petty Cash Hero Balance Card
- High-contrast Petroleum Teal background (`#235b54`) featuring a subtle architectural watermarked arc pattern reflecting the brand emblem.
- Dual-metric display: Available Custody ("الرصيد المتاح") alongside Spent This Cycle ("إجمالي المصروف").
- Action bar anchored by two high-contrast quick buttons: "طلب عهدة / Request Advance" and "إضافة مصروف / Add Expense".

### RTL Financial Input Fields
- Labels positioned top-right with optional English subheadings top-left.
- Leading icons (such as SAR/AED currency markers or receipt scan triggers) anchored to the far right, with currency numbers formatted right-to-left.
- Active focus rings in `#235b54` with a 2px offset border.

### Expense & Approval List Items
- Right side: Category icon with soft rounded container (`#235b54` at 8% tint), category title ("صيانة ميدانية", "شراء مواد"), and timestamp.
- Left side: Financial value in tabular figures, followed directly below by status badges (Emerald `#059669` for Approved, Amber `#f59e0b` for Pending).
- Left-pointing subtle chevron indicating drill-down availability in RTL mode.

### Buttons & Quick Actions
- **Primary Corporate Button:** Full `#235b54` fill with pure white label and optional trailing arrow indicator pointing left.
- **Secondary Action:** Crisp `#f1f5f9` slate fill with `#1e293b` text.
- **Danger / Rejection Action:** Light rose container with crisp crimson typography for audited claim rejections.

### Status Badges & Chips
- Symmetrical pill capsules (`px: 10px, py: 4px`) pairing deep semantic typography with light pastel backgrounds (e.g., Emerald at 10% opacity for "تم الصرف / Disbursed").