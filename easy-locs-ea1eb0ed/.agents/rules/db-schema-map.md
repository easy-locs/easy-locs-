# Database Schema Map

## Architecture
- **Provider**: Supabase (PostgreSQL)
- **Multi-tenancy**: `org_id` column on all tenant-scoped tables
- **Security**: Row-Level Security (RLS) on all tables
- **Auth**: Supabase Auth with JWT

## Core Tables

### Organization & Users
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `orgs` | Organizations (landlords, agencies) | id, name, type, settings |
| `org_members` | User↔Org membership | user_id, org_id, role |
| `profiles` | User profiles | id (=auth.uid), full_name, avatar_url |

### Property Management
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `properties` | Real estate assets | id, org_id, address, type |
| `tenants` | Tenant records | id, org_id, property_id, user_id |
| `leases` | Rental contracts | id, org_id, property_id, tenant_id, start_date, end_date, rent_amount |

### Marketplace
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `concierge_services` | Service listings | id, org_id, title, price, category |
| `concierge_orders` | Service orders | id, org_id, service_id, status |
| `booking_requests` | Booking flow | id, org_id, property_id, status, dates |

### Communication
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `conversation_threads` | Chat threads | id, participants, type |
| `messages` | Individual messages | id, thread_id, sender_id, content, encrypted |

### Deals
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `deal_rooms` | Negotiation rooms | id, property_id, status |
| `deal_events` | Offer/counter-offer events | id, deal_room_id, type, amount |

### Wallet
| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `wallets` | User wallets | id, user_id, balance, currency |
| `wallet_transactions` | Transaction history | id, wallet_id, type, amount |

## RLS Policy Pattern
```sql
CREATE POLICY "org_isolation" ON table_name
  USING (org_id = (SELECT org_id FROM org_members WHERE user_id = auth.uid()));
```

## Migration Conventions
- Migrations live in `supabase/migrations/`
- File format: `YYYYMMDDHHMMSS_uuid.sql`
- Always include rollback comments
- Never modify existing migrations — create new ones

## Edge Functions
Located in `supabase/functions/`. Each function:
- Has its own directory with `index.ts`
- Uses Deno runtime
- Must validate JWT via `supabase.auth.getUser()`
- Shares utilities from `supabase/functions/_shared/`

## Rules for Agents
1. Never drop tables or columns — only add
2. Always add RLS policies for new tables
3. Migration files are append-only
4. Test migrations against a branch database first
5. Schema changes require Supabase Agent validation
6. Always include `org_id` for tenant-scoped tables
