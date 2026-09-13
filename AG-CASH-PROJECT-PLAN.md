# AG-Cash Project Plan

## 🎯 Project Overview

**AG-Cash** is a Progressive Web App (PWA) for petty cash management, acting as an intermediary between mobile devices and Odoo ERP system.

### Key Features:
- Independent authentication system (single API user for Odoo)
- Mobile-first PWA experience
- Offline support
- Real-time notifications
- Camera integration for receipts
- Voice input
- Location services

---

## 🏗️ Architecture

### **Monolithic Architecture**

```
┌─────────────────┐
│   PWA Frontend  │
│   (React/Vue)   │
└─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend API (Node.js)                      │
│              (Monolithic Application)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Auth      │  │ Petty Cash  │  │   OCR       │        │
│  │   Module    │  │   Module    │  │   Module    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │   Redis Cache   │  │   Supabase     │
│   (Application  │  │                 │  │   (Auth + DB)   │
│    Database)    │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │
         ▼
┌─────────────────┐
│     Odoo API    │
│   (External)    │
└─────────────────┘
```

---

## 🔧 Technology Stack

### **Backend:**
- **Runtime:** Node.js (Express)
- **Language:** TypeScript
- **Architecture:** Monolithic
- **Database:** PostgreSQL (Application DB)
- **Auth:** Supabase Auth (Local Docker)
- **Cache:** Redis
- **Real-time:** Supabase Realtime
- **Storage:** Supabase Storage
- **ORM:** Prisma

### **Frontend:**
- **Framework:** React.js or Vue.js
- **Language:** TypeScript
- **UI Library:** Material-UI or Vuetify
- **State Management:** Redux or Pinia
- **Auth:** Supabase Auth Client
- **Real-time:** Supabase Realtime Client
- **Storage:** Supabase Storage Client
- **Offline:** IndexedDB

### **DevOps:**
- **Containerization:** Docker & Docker Compose
- **Reverse Proxy:** Nginx
- **SSL:** Let's Encrypt
- **CI/CD:** GitHub Actions

---

## 📅 Implementation Timeline

### **Phase 1: Foundation (Week 1-3)**
- Week 1: Setup & Configuration
- Week 2: Authentication (Supabase)
- Week 3: Odoo Integration & PWA Foundation

### **Phase 2: Core Features (Week 4-9)**
- Week 4: Dashboard
- Week 5: Requests Management
- Week 6: Request Actions
- Week 7: Dedicated Advances
- Week 8: Categories & Vendors
- Week 9: History & Reports

### **Phase 3: Advanced Features (Week 10-13)**
- Week 10: Camera & Image Processing
- Week 11: Real-time Notifications
- Week 12: Offline Mode
- Week 13: Voice & Location

### **Phase 4: Testing & Deployment (Week 14-16)**
- Week 14: Testing
- Week 15: Security & Hardening
- Week 16: Deployment

**Total Duration:** 16 weeks (4 months)

---

## 🔐 Authentication System

### **Supabase Auth Flow:**
```
User → Supabase Auth (Local) → JWT Token
                                ↓
                        AG-Cash Backend
                                ↓
                        Validate JWT
                                ↓
                Get employee_id from mapping table
                                ↓
                        Call Odoo API
```

### **User Mapping Table:**
```sql
CREATE TABLE user_employee_mapping (
  id SERIAL PRIMARY KEY,
  supabase_user_id UUID UNIQUE NOT NULL,
  odoo_employee_id INTEGER NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) DEFAULT 'employee',
  department_id INTEGER,
  manager_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);
```

---

## 📱 PWA Features

### **Core PWA:**
- Service Worker with caching
- Offline support with IndexedDB
- Background sync
- App installation

### **Mobile Features:**
- Camera integration
- Push notifications (Supabase Realtime)
- Voice input (Arabic/English)
- Location services
- Biometric authentication

### **Storage:**
- Supabase Storage for receipts
- Image compression
- Offline queue for uploads

---

## 🐳 Docker Configuration

### **Services:**
1. **Supabase Stack (Local):**
   - PostgreSQL (Supabase DB)
   - Kong (API Gateway)
   - Gotrue (Auth)
   - Realtime (WebSockets)
   - Storage (File Storage)
   - Meta (Database Management)
   - Studio (UI)
   - Inbucket (Email Testing)

2. **Application Stack:**
   - PostgreSQL (Application DB)
   - Redis (Cache)
   - Backend API (Monolithic)
   - Frontend (PWA)
   - Nginx (Reverse Proxy)

3. **Optional:**
   - PgAdmin (Database Management)

---

## 🔌 Odoo Integration

### **Strategy:**
- Single API user for Odoo
- Employee-based filtering
- Domain filters: `[('employee_id', '=', employee_id)]`
- Data mapping from Odoo to AG-Cash format

### **Key Endpoints:**
- Get holder data
- Get requests (filtered by employee)
- Create/update requests
- Get categories
- Get dedicated advances

---

## 📊 Key Features from Odoo

### **Employee Dashboard:**
- Current balance
- Remaining amount
- Used amount
- Active requests
- Monthly spend
- Weekly spend chart
- Daily heatmap
- Category breakdown

### **Request Management:**
- Create requests
- Add expense lines
- Select categories
- Attach receipts
- Add taxes
- Select vendors
- Submit for approval
- Cancel requests

### **Dedicated Advances:**
- Request dedicated advance
- View active advances
- Settle advances
- Track settlement status

---

## 🌟 Additional Features

### **Enhanced Mobile Features:**
- Push notifications (state changes, alerts)
- Offline mode with sync
- Camera integration with image processing
- Voice input (Arabic/English)
- Location services
- Biometric authentication

### **Analytics:**
- Personal reports
- Monthly spend analysis
- Category breakdown
- Location-based spending
- Smart alerts

### **Social:**
- Share reports
- Export to PDF/Excel
- Personal notes
- Collaboration features

---

## 📋 Team Requirements

### **Team:**
- Backend Developer: 1 person × 16 weeks
- Frontend Developer: 1 person × 16 weeks
- DevOps Engineer: 0.5 person × 8 weeks
- QA Engineer: 0.5 person × 8 weeks
- UI/UX Designer: 0.25 person × 4 weeks

---

## 🚀 Next Steps

1. Create project in Linear
2. Set up milestones and tasks
3. Generate UI/UX design with Google AI Studio
4. Begin implementation with Phase 1

---

## 📝 Documentation Links

- Architecture Document
- API Documentation
- Deployment Guide
- User Manual
- Supabase Setup Guide

---

**Project Status:** Planning Complete ✅
**Ready for Implementation:** Yes ✅
