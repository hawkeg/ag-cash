# Supabase Setup Guide

## Docker-based Supabase (Current Setup)

The project uses Docker Compose to run Supabase services locally:

### Services Included
- **PostgreSQL:** Database (port 5432)
- **Supabase Studio:** Admin UI (port 3000)
- **Auth:** Authentication service (port 9999)
- **Kong:** API Gateway (port 8000)
- **Realtime:** Real-time subscriptions (port 4000)
- **Storage:** File storage (port 5000)

### Starting Supabase Services

```bash
cd docker
docker-compose up -d
```

### Accessing Services

- **Supabase Studio:** http://localhost:3000
- **API Gateway:** http://localhost:8000
- **Database:** postgresql://postgres:postgres@localhost:5432/postgres

## Supabase CLI (Optional)

For advanced features like migrations and local development, install Supabase CLI:

### Installation

**Windows (PowerShell):**
```powershell
winget install Supabase.Supabase
```

**macOS:**
```bash
brew install supabase/tap/supabase
```

**Linux:**
```bash
curl -fsSL https://supabase.com/install.sh | bash
```

### Initialize Supabase Project

```bash
cd petty_cash_PWA
supabase init
```

### Start Local Development

```bash
supabase start
```

### Stopping

```bash
supabase stop
```

## Current Status

- ✅ Docker-based Supabase services configured
- ⏳ Supabase CLI not installed (optional for advanced features)
- ✅ Environment variables configured for Supabase connection
- ✅ Database schema ready for Prisma setup

## Next Steps

1. Set up Prisma ORM (next task)
2. Configure database schema
3. Run migrations
