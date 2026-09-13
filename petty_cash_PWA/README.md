# AG-Cash

Progressive Web App for petty cash management - middleware between employees, AG-Cash application, Odoo, and existing petty-cash application.

## Overview

AG-Cash is a mobile-first PWA that allows employees to manage petty cash requests, advances, and expenses with:
- Independent AG-Cash authentication via Supabase
- Single shared Odoo API user for backend communication
- Mapping each AG-Cash user to corresponding Odoo employee
- RTL Arabic support with corporate fintech design
- Offline capabilities and real-time sync

## Tech Stack

- **Backend:** Node.js, TypeScript, Express
- **Frontend:** React, Vite, TypeScript
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage
- **Realtime:** Supabase Realtime
- **Caching:** Redis
- **Reverse Proxy:** Nginx
- **Odoo Integration:** XML-RPC/REST API
- **Deployment:** Docker, Docker Compose

## Project Structure

```
petty_cash_PWA/
├── backend/                 # Node.js/TypeScript API
│   ├── src/
│   │   ├── controllers/    # API route handlers
│   │   ├── services/       # Business logic
│   │   ├── models/         # Database models (Prisma)
│   │   ├── middleware/     # Express middleware
│   │   └── utils/          # Utility functions
│   ├── prisma/             # Prisma schema and migrations
│   └── package.json
├── frontend/               # React/Vue application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── utils/          # Utility functions
│   │   └── hooks/          # Custom React hooks
│   ├── public/             # Static assets
│   └── package.json
├── docker/                 # Docker configurations
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
├── shared/                 # Shared types and utilities
│   └── types/              # TypeScript type definitions
├── docs/                   # Documentation
└── README.md
```

## Design System

Based on Stitch designs with corporate fintech theme:
- **Primary Color:** Petroleum Teal (#235b54)
- **Dark Primary:** #01433d
- **Secondary:** #545f73
- **Typography:** Cairo, Tajawal (Arabic), Inter (numbers)
- **Layout:** RTL-first, mobile-first 4-column grid
- **Icons:** Material Symbols Outlined

## Getting Started

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- Supabase CLI
- Git

### Installation

1. Clone the repository
2. Copy `.env.example` to `.env.local`
3. Configure environment variables
4. Run `docker-compose up` to start all services
5. Access the application at `http://localhost:3000`

## Development

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Docker
```bash
docker-compose up
```

## Project Board

Track progress at: https://github.com/hawkeg/ag-cash/projects

## License

[Your License]
