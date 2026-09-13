# Google AI Studio Prompt for AG-Cash UI/UX Design

---

## 🎨 UI/UX Design Prompt for AG-Cash Mobile App

**Role:** You are an expert mobile UI/UX designer specializing in finance and productivity applications with deep knowledge of Arabic RTL design and modern mobile UX patterns.

**Project:** AG-Cash - A Progressive Web App (PWA) for petty cash management

**Target Audience:** Arabic-speaking employees who need to manage petty cash expenses on mobile devices

**Key Requirements:**
- Mobile-first design
- Arabic RTL support
- Clean, intuitive interface
- Fast and responsive
- Accessible and inclusive

---

## 📱 App Overview

**AG-Cash** is a mobile-first petty cash management application that allows employees to:
- View their petty cash balance and status
- Create and submit expense requests
- Attach receipts via camera
- Track request status in real-time
- View spending history and reports
- Work offline when needed

**Brand Colors:**
- Primary: #1976d2 (Blue)
- Secondary: #4caf50 (Green - for success/money)
- Warning: #ff9800 (Orange)
- Error: #f44336 (Red)
- Background: #ffffff (White)
- Surface: #f5f5f5 (Light Gray)
- Text: #333333 (Dark Gray)

---

## 🎯 Design Principles

1. **Simplicity:** Keep interfaces clean and uncluttered
2. **Speed:** Fast loading and quick actions
3. **Clarity:** Clear visual hierarchy and information architecture
4. **Accessibility:** WCAG AA compliant, readable fonts, sufficient contrast
5. **Consistency:** Consistent patterns across all screens
6. **Mobile-First:** Touch-friendly targets (min 44px), thumb-zone optimization
7. **RTL Support:** Proper Arabic text direction and alignment

---

## 📋 Required Screens & Components

### **1. Authentication Screens**

#### **1.1 Login Screen**
- Clean, centered design
- Email/Phone input with validation
- Password input with show/hide toggle
- "Forgot Password" link
- "Don't have an account? Sign up" link
- Biometric login option (fingerprint/face ID)
- Logo at top
- Arabic RTL layout

#### **1.2 Registration Screen**
- Email input
- Phone input (with country code)
- Password input with strength indicator
- Confirm password
- First name & Last name
- Terms & conditions checkbox
- "Already have an account? Login" link

#### **1.3 Forgot Password Screen**
- Email input
- "Send reset link" button
- Back to login link

#### **1.4 Reset Password Screen**
- New password input
- Confirm password
- "Update password" button

---

### **2. Dashboard (Home Screen)**

#### **2.1 Main Dashboard**
**Header:**
- App logo/name
- User avatar with dropdown (profile, settings, logout)
- Notification bell with badge
- Sync status indicator (online/offline)

**Balance Cards (Top Section):**
- Current Balance (large, prominent)
- Remaining Amount (secondary)
- Used Amount (tertiary)
- Progress bar showing utilization percentage
- Quick action buttons: "New Request", "History"

**KPI Cards (Middle Section):**
- Pending Requests (count + amount)
- Monthly Spend (with trend indicator)
- Active Dedicated Advances (count)

**Charts (Bottom Section):**
- Weekly spend bar chart
- Category breakdown pie chart
- Daily heatmap (mini version)

**Recent Activity:**
- List of recent requests (last 5)
- Each item shows: request name, amount, status, date
- Tap to view details

**Bottom Navigation:**
- Dashboard (active)
- Requests
- New Request (floating action button)
- History
- Profile

---

### **3. Requests List Screen**

#### **3.1 Requests List**
**Header:**
- Title: "My Requests"
- Filter icon (filter by status, date range)
- Search bar

**Filter Options:**
- Status: All, Draft, Submitted, Approved, Posted, Rejected, Cancelled
- Date Range: Last 7 days, Last 30 days, Last 3 months, Custom
- Sort: Newest first, Oldest first, Highest amount, Lowest amount

**Request Cards:**
- Request name/number
- Date
- Amount (prominent)
- Status badge (color-coded)
- Expense line count
- Swipe actions: View details, Edit (if draft), Delete (if draft)

**Empty State:**
- "No requests yet"
- "Create your first request" button
- Illustration

**Pull-to-Refresh**

---

### **4. Request Detail Screen**

#### **4.1 Request Detail View
**Header:**
- Back button
- Request name/number
- Action buttons (Edit if draft, Submit if draft, Cancel if not posted)

**Status Timeline:**
- Visual progress indicator showing current state
- Draft → Submitted → Manager Approved → Finance Approved → Posted
- Current state highlighted

**Request Information:**
- Request date
- Description
- Holder name
- Total amount
- State
- Created at

**Expense Lines Section:**
- List of expense lines
- Each line shows:
  - Description
  - Category
  - Amount
  - Date
  - Receipt attachment indicator
- Tap line to view/edit details
- "Add Expense Line" button (if draft)

**Actions Section:**
- Submit button (if draft)
- Cancel button (if not posted)
- Share button (export PDF/Excel)

**Attachments Section:**
- List of attached receipts
- Tap to view/download
- Add attachment button (if draft)

---

### **5. Create/Edit Request Screen**

#### **5.1 Request Form
**Header:**
- Back button
- Title: "New Request" or "Edit Request"
- Save button (enabled when valid)

**Form Fields:**
- Holder (auto-selected, read-only)
- Date (date picker, default today)
- Description (text area, optional)

**Expense Lines Section:**
- "Add Expense Line" button
- List of added lines
- Each line shows mini-card with: description, category, amount
- Swipe to delete line

**Expense Line Form (Modal/Bottom Sheet):**
- Description (text input, required)
- Category (dropdown, required)
- Amount (number input, required)
- With VAT toggle
- Tax calculation (auto when VAT enabled)
- Invoice date (date picker)
- Vendor (autocomplete/search)
- Attach receipt (camera or gallery)
- Currency (auto-selected)
- Save/Cancel buttons

**Validation:**
- At least one expense line required
- Total amount validation
- Required fields validation
- Category availability validation

**Preview Section:**
- Total amount summary
- Tax breakdown (if applicable)
- Attachment count

**Actions:**
- Save as Draft
- Submit for Approval

---

### **6. Dedicated Advances Screen**

#### **6.1 Dedicated Advances List
**Header:**
- Title: "Dedicated Advances"
- Filter icon
- "Request New Advance" button

**Advance Cards:**
- Advance name/number
- Amount
- Reason
- Status (color-coded)
- Date
- Settlement status
- Tap to view details or settle

**Empty State:**
- "No dedicated advances"
- "Request a new advance" button

---

### **7. Create/Settle Dedicated Advance Screen**

#### **7.1 Dedicated Advance Form
**Header:**
- Back button
- Title: "New Dedicated Advance" or "Settle Advance"

**Form Fields:**
- Holder (auto-selected)
- Amount (number input, required)
- Reason (text area, required)
- Analytic Account (dropdown, optional)
- Payment method (dropdown, auto-selected from holder)

**Settlement Mode (if settling):**
- Link to original advance
- Auto-populate amount from advance
- Add expense lines (must equal advance amount)

**Validation:**
- Amount must be positive
- Reason required
- Settlement must equal advance amount

**Actions:**
- Save as Draft
- Submit for Approval
- Settle (if applicable)

---

### **8. Categories Screen**

#### **8.1 Categories List
**Header:**
- Title: "Expense Categories"
- Search bar
- Filter by allowed categories

**Category Cards:**
- Category name
- Icon/emoji
- Default account
- Required vendor indicator
- Required attachment indicator
- Tap to view details

**Search & Filter:**
- Real-time search
- Filter by allowed/not allowed

---

### **9. History & Reports Screen**

#### **9.1 History View
**Header:**
- Title: "History"
- Filter icon (date range, status)
- Export button

**History List:**
- Chronological list of all requests
- Each item shows: date, request name, amount, status
- Tap to view details

**Statistics Summary:**
- Total spent this month
- Total spent this year
- Total requests
- Average request amount

#### **9.2 Reports View
**Header:**
- Title: "Reports"
- Report type selector (Monthly, Category, Location)

**Monthly Report:**
- Bar chart: Monthly spending over time
- Summary cards: This month, Last month, Trend
- Export options: PDF, Excel, CSV

**Category Report:**
- Pie chart: Spending by category
- List view: Category name, amount, percentage
- Export options

**Location Report:**
- Map view: Spending locations
- List view: Location, amount, count
- Export options

---

### **10. Profile Screen**

#### **10.1 Profile View
**Header:**
- Title: "Profile"
- Settings icon

**User Information:**
- Avatar (with edit option)
- Name
- Email
- Phone
- Employee ID
- Department
- Manager

**Petty Cash Information:**
- Holder status
- Limit amount
- Used amount
- Remaining amount
- Expense categories assigned

**Settings:**
- Language toggle (Arabic/English)
- Dark mode toggle
- Notifications settings
- Biometric authentication toggle
- Offline mode settings
- Cache management (clear cache)

**Actions:**
- Edit profile
- Change password
- Logout

---

### **11. Camera & Attachment Screen**

#### **11.1 Camera Capture
**Header:**
- Back button
- Title: "Capture Receipt"

**Camera View:**
- Full-screen camera preview
- Flash toggle
- Front/back camera toggle
- Capture button (large, centered)
- Gallery picker button

**Image Preview:**
- Captured image
- Crop/Rotate controls
- Filters (enhance, auto-enhance)
- Retake button
- Use photo button

**Upload Progress:**
- Progress bar
- Cancel button

---

### **12. Offline Mode Indicator

#### **12.1 Offline Banner**
- Persistent banner at top when offline
- "You're offline. Changes will sync when you're back online."
- Sync button
- View pending actions

**Pending Actions Queue:**
- List of unsynced actions
- Each action shows: type, timestamp, retry button
- Sync all button

---

## 🎨 Design Specifications

### **Typography**
- **Primary Font:** Cairo or Tajawal (Google Fonts) for Arabic
- **Secondary Font:** Roboto or Inter for English numbers
- **Font Sizes:**
  - H1: 32px (Screen titles)
  - H2: 24px (Section headers)
  - H3: 20px (Card titles)
  - Body: 16px (Regular text)
  - Caption: 14px (Secondary text)
  - Small: 12px (Labels)

### **Color Palette**
```
Primary:       #1976d2 (Blue)
Secondary:     #4caf50 (Green)
Warning:       #ff9800 (Orange)
Error:         #f44336 (Red)
Background:    #ffffff (White)
Surface:       #f5f5f5 (Light Gray)
Text Primary:  #333333 (Dark Gray)
Text Secondary: #666666 (Medium Gray)
Text Disabled: #999999 (Light Gray)
Border:        #e0e0e0 (Gray)
Divider:       #eeeeee (Light Gray)
```

### **Spacing**
- **Base Unit:** 8px
- **Padding:** 16px (cards), 24px (screens)
- **Margin:** 8px (elements), 16px (sections)
- **Gap:** 8px (related items), 16px (sections)

### **Border Radius**
- **Small:** 4px (buttons, inputs)
- **Medium:** 8px (cards)
- **Large:** 16px (modals)

### **Shadows**
- **Elevation 1:** 0 2px 4px rgba(0,0,0,0.1)
- **Elevation 2:** 0 4px 8px rgba(0,0,0,0.12)
- **Elevation 3:** 0 6px 12px rgba(0,0,0,0.15)

### **Iconography**
- **Style:** Material Icons or similar
- **Size:** 24px (standard), 32px (large)
- **Color:** Primary color or inherit

---

## 📐 Layout Guidelines

### **Mobile Layout (Portrait)**
- **Status Bar:** 44px height
- **App Bar:** 56px height
- **Content Area:** Scrollable
- **Bottom Navigation:** 56px height
- **Touch Targets:** Minimum 44x44px

### **Responsive Breakpoints**
- **Mobile:** < 768px
- **Tablet:** 768px - 1024px
- **Desktop:** > 1024px

### **RTL Considerations**
- All text aligned right
- Icons mirrored where appropriate
- Margins and padding flipped
- Navigation elements positioned correctly

---

## 🔄 Interaction Patterns

### **Navigation**
- **Bottom Navigation:** 5 tabs (Dashboard, Requests, New Request FAB, History, Profile)
- **Back Navigation:** Consistent back button in headers
- **Gesture Navigation:** Swipe back on supported devices

### **Actions**
- **Primary Actions:** Prominent buttons at bottom of screens
- **Secondary Actions:** In headers or as icon buttons
- **Destructive Actions:** Red color, confirmation dialogs

### **Feedback**
- **Loading:** Spinners, skeleton screens, progress bars
- **Success:** Green checkmarks, success messages
- **Error:** Red error messages, inline validation
- **Offline:** Gray banners, sync indicators

### **Forms**
- **Input Fields:** Clear labels, helper text, validation messages
- **Date Pickers:** Native date pickers, Arabic calendar support
- **Dropdowns:** Full-screen modals on mobile
- **Multi-select:** Chips with close buttons

---

## ♿ Accessibility

### **Visual**
- **Color Contrast:** WCAG AA compliant (4.5:1 for normal text)
- **Font Size:** Minimum 16px for body text
- **Touch Targets:** Minimum 44x44px
- **Focus States:** Visible focus indicators

### **Screen Reader**
- **Semantic HTML**
- **ARIA labels**
- **Alt text for images
- **Live regions for dynamic content

### **Motor**
- **Keyboard navigation support
- **Voice control compatibility
- **Gesture alternatives

---

## 🎯 Design Deliverables

Please create the following as part of your design:

1. **Wireframes:** Low-fidelity wireframes for all major screens
2. **Mockups:** High-fidelity mockups with proper styling
3. **Component Library:** Reusable UI components with specifications
4. **Design System:** Complete design system with colors, typography, spacing
5. **User Flow Diagrams:** Key user journeys and flows
6. **Style Guide:** Comprehensive style guide with examples
7. **Prototype:** Interactive prototype showing key interactions
8. **RTL Variations:** Show how the design adapts to Arabic RTL

---

## 📋 Special Considerations

### **Arabic Language Support**
- Right-to-left (RTL) layout
- Arabic fonts (Cairo, Tajawal)
- Proper text alignment
- Mirrored icons where appropriate
- Arabic number formatting
- Date formatting (Arabic/Gregorian calendar)

### **Offline Mode**
- Clear offline indicators
- Pending action queue
- Sync status visualization
- Graceful degradation

### **Performance**
- Lightweight assets
- Optimized images
- Minimal animations
- Fast loading times

### **Security**
- Secure UI patterns
- Biometric authentication options
- Clear permission requests
- Data privacy indicators

---

## 🎨 Inspiration

Please draw inspiration from:
- Modern finance apps (Revolut, N26, Monzo)
- Expense management apps (Expensify, Receipt Bank)
- Arabic RTL apps (Noon, Talabat, STC Pay)
- Material Design 3 guidelines
- iOS Human Interface Guidelines
- Android Material Design guidelines

---

## 📝 Additional Notes

- Keep the design clean and minimalist
- Focus on core user tasks
- Minimize cognitive load
- Use whitespace effectively
- Ensure consistency across all screens
- Make frequent actions easily accessible
- Provide clear feedback for all interactions
- Design for thumb-zone optimization
- Consider one-handed usage scenarios

---

**Please create a comprehensive, production-ready UI/UX design for AG-Cash that follows these specifications and delivers an excellent mobile experience for Arabic-speaking users managing petty cash expenses.**
