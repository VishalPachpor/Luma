# PlanX Codebase Analysis

## Executive Summary

**PlanX** (also referred to as "Pulse" or "Lumma" in some parts of the codebase) is a comprehensive event management platform built with Next.js 16, React 19, TypeScript, and Supabase. It provides a full-featured event discovery, hosting, ticketing, and payment system with support for both traditional (Stripe) and cryptocurrency payments (Solana, Ethereum).

---

## 1. Technology Stack

### Core Framework
- **Next.js 16** - App Router with Server Components
- **React 19** - Latest React with concurrent features
- **TypeScript 5.8** - Strict type checking enabled
- **Tailwind CSS 4.0** - Utility-first styling

### Backend & Database
- **Supabase** - PostgreSQL database, authentication, real-time subscriptions
- **Inngest** - Background job processing and event-driven workflows
- **Meilisearch** - Full-text search engine

### Payment Systems
- **Stripe** - Traditional payment processing
- **Solana** - Cryptocurrency payments via `@solana/web3.js`
- **Ethereum** - Cryptocurrency payments via `wagmi` and `viem`
- **RainbowKit** - Ethereum wallet connection UI

### State Management
- **Zustand** - Global client-side state
- **TanStack React Query** - Server state management and caching

### UI Libraries
- **Shadcn UI** - Component library
- **Radix UI** - Accessible primitives
- **Framer Motion** - Animations
- **Lucide React** - Icons
- **Three.js / React Three Fiber** - 3D visualizations (globe discovery)

### Additional Libraries
- **date-fns** - Date manipulation
- **Resend** - Email sending
- **html5-qrcode** - QR code scanning
- **qrcode.react** - QR code generation
- **maplibre-gl** - Map rendering

---

## 2. Project Architecture

### Architecture Pattern
The codebase follows a **hybrid architecture** combining:
- **Event-Driven Architecture (EDA)** - Domain events for workflow orchestration
- **CQRS-like patterns** - Separation of read/write models
- **Repository Pattern** - Data access abstraction
- **Service Layer** - Business logic encapsulation

### Key Architectural Components

#### 2.1 Domain Events System
Located in `src/core/domain-events/` and `src/lib/events/`:
- **Domain Events**: Canonical event definitions (`EVENT_PUBLISHED`, `TICKET_CHECKED_IN`, etc.)
- **Event Store**: Persists domain events with metadata (correlation IDs, actors, timestamps)
- **Event Bus**: Publishes events to Inngest for async processing

#### 2.2 Workflow Orchestrator
Located in `src/core/workflow/orchestrator.ts`:
- Central command processor
- Validates state transitions via state machine
- Enforces business rules (guards)
- Persists domain events
- Updates read models

#### 2.3 State Machine Engine
Located in `src/core/state-machine/`:
- **Event Lifecycle**: `draft → published → live → ended → archived`
- **Ticket Lifecycle**: `pending → issued → checked_in → refunded`
- Validates transitions and prevents invalid state changes

#### 2.4 Repository Pattern
Located in `src/lib/repositories/`:
- Abstraction layer for database access
- Repositories for: events, calendars, guests, tickets, invitations, orders, users, etc.
- Centralized query logic

#### 2.5 Service Layer
Located in `src/lib/services/`:
- Business logic encapsulation
- Key services:
  - `event.service.ts` - Event CRUD operations
  - `event-lifecycle.service.ts` - State machine transitions
  - `invite.service.ts` - Invitation management
  - `rsvp.service.ts` - Registration handling
  - `calendar.service.ts` - Calendar operations
  - `escrow.service.ts` - Crypto payment escrow
  - `permissions.service.ts` - Access control
  - `roles.service.ts` - Role management

---

## 3. Database Schema

### Core Tables

#### Users & Profiles
- `profiles` - Extended user profiles (synced from `auth.users`)
- Auto-created via trigger on user signup

#### Events
- `events` - Main event table with:
  - Basic info (title, description, date, location, coordinates)
  - Organizer relationship
  - Status lifecycle (`draft`, `published`, `live`, `ended`, `archived`)
  - Visibility (`public`, `private`)
  - Commerce fields (price, currency, capacity)
  - Rich content (metadata JSONB, registration questions, social links, agenda, hosts)
  - Theme customization (theme, themeColor, font)

#### Calendars
- `calendars` - Subscribable event feeds
- Branding (color, avatar, cover)
- Location (can be global or city-specific)
- Subscription system
- People CRM (audience management)
- Insights (analytics)
- Coupons (discount codes)

#### Guests & Tickets
- `guests` - Event attendees (tickets)
- Status: `pending_approval`, `issued`, `checked_in`, `refunded`, `forfeited`
- QR token for check-in
- Links to orders and invitations

#### Invitations
- `invitations` - Smart invite system
- Status: `pending`, `sent`, `accepted`, `declined`
- Tracking tokens for email analytics
- Links to guests when RSVP occurs

#### Orders
- `orders` - Payment transactions
- Supports Stripe and crypto payments
- Links to guests/tickets

#### Tickets
- `ticket_tiers` - Pricing tiers for events
- `tickets` - Individual ticket instances

#### Other Tables
- `event_status_log` - Audit trail for status changes
- `event_log` - Event activity log
- `audit_logs` - System-wide audit trail
- `notifications` - User notifications
- `calendar_people` - CRM audience
- `calendar_insights` - Pre-computed analytics
- `calendar_coupons` - Discount codes
- `calendar_members` - Calendar team members
- `event_roles` - Role-based access control
- `qr_nonces` - Secure QR check-in tokens
- `domain_events` - Event store

### Migrations
Located in `supabase/migrations/`:
- 38 migration files tracking schema evolution
- Key migrations:
  - `010_full_migration.sql` - Complete schema setup
  - `011_smart_invites.sql` - Invitation system
  - `025_invitation_lifecycle.sql` - Invite tracking
  - `028_event_lifecycle.sql` - Event state machine
  - `029_ticket_lifecycle.sql` - Ticket state machine
  - `036_domain_events.sql` - Event store

---

## 4. Key Features

### 4.1 Event Management
- **Event Creation**: Rich event editor with themes, custom registration questions
- **Event Lifecycle**: State machine-driven status transitions
- **Event Discovery**: Search, filtering, category browsing, city exploration
- **3D Globe Discovery**: Interactive globe visualization (Three.js)
- **Event Hosting**: Multiple hosts per event with roles

### 4.2 Ticketing System
- **Ticket Tiers**: Multiple pricing tiers per event
- **Registration Questions**: Custom form fields (text, select, wallet address, social handles)
- **Approval Workflow**: Optional manual approval for registrations
- **QR Code Check-in**: Secure QR scanning with nonces
- **Ticket Status Tracking**: Full lifecycle management

### 4.3 Payment Processing
- **Stripe Integration**: Traditional card payments
- **Solana Payments**: Native SOL transfers via Phantom wallet
- **Ethereum Payments**: ETH transfers via MetaMask/RainbowKit
- **Payment Verification**: Blockchain transaction verification
- **Escrow System**: Smart contract escrow for crypto payments (EventEscrow.sol)

### 4.4 Calendar System
- **Subscribable Calendars**: Users can follow event calendars
- **Calendar Branding**: Custom colors, avatars, covers
- **People CRM**: Audience management and segmentation
- **Calendar Insights**: Analytics dashboard
- **Coupons**: Discount code management
- **Newsletters**: Email list management

### 4.5 Invitation System
- **Smart Invites**: Email-based invitations with tracking
- **Invite Lifecycle**: Track opens, clicks, RSVPs
- **Batch Invites**: Bulk invitation sending
- **Contact Book**: Reusable contact management
- **Invite Suggestions**: AI-powered recipient suggestions

### 4.6 Search & Discovery
- **Unified Search**: Cross-entity search (events, calendars, users, commands)
- **Meilisearch Integration**: Full-text search with ranking
- **Command Palette**: Cmd+K quick actions
- **Category Discovery**: Browse events by category
- **City Exploration**: Location-based discovery

### 4.7 Real-time Features
- **Event Chat**: Per-event chat rooms
- **Notifications**: Real-time notification system
- **Live Updates**: Supabase real-time subscriptions

### 4.8 Analytics & Insights
- **Event Dashboard**: Organizer analytics
- **Calendar Insights**: Pre-computed metrics
- **View Tracking**: Event view analytics
- **Audit Logs**: Complete activity trail

---

## 5. File Structure

```
PlanX/
├── src/
│   ├── actions/              # Server actions (Next.js)
│   ├── app/                  # Next.js App Router pages
│   │   ├── api/              # API routes
│   │   ├── calendar/         # Calendar management pages
│   │   ├── events/           # Event pages
│   │   ├── create-event/     # Event creation
│   │   └── ...
│   ├── components/           # React components
│   │   ├── features/         # Feature-specific components
│   │   ├── modals/           # Modal components
│   │   └── ui/               # Reusable UI components
│   ├── contexts/             # React contexts
│   ├── core/                 # Core domain logic
│   │   ├── domain-events/    # Event definitions
│   │   ├── state-machine/    # State machine engine
│   │   └── workflow/         # Orchestrator
│   ├── hooks/                # Custom React hooks
│   ├── inngest/              # Background job functions
│   ├── lib/                  # Utility libraries
│   │   ├── contracts/        # Smart contract interfaces
│   │   ├── ethereum/         # Ethereum payment logic
│   │   ├── events/           # Event bus
│   │   ├── meilisearch/      # Search integration
│   │   ├── repositories/     # Data access layer
│   │   ├── services/          # Business logic
│   │   ├── solana/           # Solana payment logic
│   │   └── ...
│   ├── providers/            # App providers
│   ├── store/               # Zustand store
│   └── types/                # TypeScript definitions
├── contracts/                # Smart contracts (Hardhat)
│   └── EventEscrow.sol      # Escrow contract
├── supabase/
│   ├── migrations/          # Database migrations
│   └── schema.sql           # Base schema
└── ...
```

---

## 6. Key Workflows

### 6.1 Event Creation Flow
1. User navigates to `/create-event`
2. Fills out event form (title, date, location, etc.)
3. Optionally adds registration questions, ticket tiers, hosts
4. Saves as `draft`
5. Publishes → status changes to `published`
6. Event becomes visible and open for registration

### 6.2 Registration/RSVP Flow
1. User clicks RSVP on event page
2. If paid event → payment flow (Stripe/crypto)
3. Fills registration form (if questions exist)
4. If `require_approval` → status `pending_approval`
5. Organizer approves/rejects
6. Ticket issued → status `issued`
7. QR code generated for check-in

### 6.3 Payment Flow (Crypto)
1. User selects crypto payment option
2. Connects wallet (Phantom for Solana, MetaMask for Ethereum)
3. Transaction created and signed
4. Transaction sent to blockchain
5. Backend verifies transaction via RPC
6. Order created, ticket issued
7. Payment linked to guest record

### 6.4 Invitation Flow
1. Organizer sends invite via email
2. Invitation record created in DB
3. Inngest job queues email sending
4. Email sent with tracking token
5. Recipient opens email → tracked
6. Recipient clicks link → tracked
7. Recipient RSVPs → invitation linked to guest
8. Status updated to `accepted`

### 6.5 Check-in Flow
1. Event status transitions to `live` (automatic at start time)
2. Organizer scans QR code at venue
3. QR token validated (nonce check)
4. Guest status updated to `checked_in`
5. Domain event `TICKET_CHECKED_IN` emitted
6. Analytics updated

### 6.6 Event Lifecycle Automation
1. Cron job (Inngest) checks for events to start
2. Finds events with `published` status where `date <= now()`
3. Transitions to `live`
4. Similar process for ending events
5. Domain events emitted for each transition

---

## 7. Integration Points

### 7.1 Supabase
- **Authentication**: Email/password, OAuth providers
- **Database**: PostgreSQL with RLS (Row Level Security)
- **Real-time**: Subscriptions for live updates
- **Storage**: File uploads (images, avatars)

### 7.2 Inngest
- **Background Jobs**: Email sending, reminders, indexing
- **Scheduled Tasks**: Event lifecycle transitions, insights refresh
- **Event Consumers**: Process domain events asynchronously

### 7.3 Meilisearch
- **Indexing**: Events, calendars, users indexed for search
- **Search API**: Full-text search with filters and ranking
- **Reindexing**: Scheduled updates via Inngest

### 7.4 Stripe
- **Payment Intents**: Create payment sessions
- **Webhooks**: Handle payment confirmations
- **Customer Management**: Store payment methods

### 7.5 Blockchain (Solana/Ethereum)
- **RPC Connections**: Verify transactions
- **Wallet Integration**: Connect and sign transactions
- **Smart Contracts**: Escrow contract for secure payments

### 7.6 Resend
- **Email Sending**: Invitations, confirmations, reminders
- **Templates**: HTML email templates
- **Tracking**: Open and click tracking

---

## 8. State Management

### Client State (Zustand)
Located in `src/store/useStore.ts`:
- User authentication state
- UI state (view mode, active tab, search query)
- Selected event/category/city
- Modal states

### Server State (React Query)
- Event data fetching and caching
- Calendar data
- User data
- Optimistic updates for mutations

### Context Providers
- `SupabaseAuthContext` - Authentication state
- `UserSettingsContext` - User preferences
- `SolanaWalletProvider` - Wallet connection
- `NavbarThemeContext` - Theme management

---

## 9. Security Features

### Authentication & Authorization
- Supabase Auth with JWT tokens
- Row Level Security (RLS) policies
- Role-based access control (RBAC)
- Permission service for fine-grained access

### Payment Security
- QR nonces for check-in (prevents replay attacks)
- Blockchain transaction verification
- Escrow smart contracts
- Idempotent payment processing

### Data Security
- Input validation (Zod schemas)
- SQL injection prevention (parameterized queries)
- XSS prevention (React auto-escaping)
- CSRF protection (Next.js built-in)

---

## 10. Performance Optimizations

### Next.js Optimizations
- Server Components by default
- Dynamic imports for code splitting
- Image optimization (Next.js Image component)
- Route-based code splitting

### Database Optimizations
- Indexes on frequently queried columns
- Denormalized counts (attendees, subscribers)
- Pre-computed insights (calendar analytics)
- Efficient pagination

### Caching Strategy
- React Query caching
- Supabase query caching
- Static page generation where possible
- CDN for static assets

---

## 11. Testing & Quality

### Type Safety
- Strict TypeScript configuration
- Comprehensive type definitions
- Type-safe API routes
- Type-safe database queries (via generated types)

### Code Quality
- ESLint configuration
- Consistent code style
- Error handling patterns
- Logging for debugging

---

## 12. Deployment Considerations

### Environment Variables
- Supabase URL and keys
- Stripe keys
- Blockchain RPC URLs
- Inngest keys
- Resend API key
- Meilisearch URL and key

### Build Process
- Next.js build with TypeScript compilation
- Hardhat compilation for smart contracts
- Database migrations via Supabase CLI

### Monitoring
- Error logging (console-based, can integrate Sentry)
- Audit logs for compliance
- Analytics tracking

---

## 13. Known Architecture Patterns

### Event Sourcing (Partial)
- Domain events stored in `domain_events` table
- Event store for audit trail
- Read models updated from events

### CQRS (Partial)
- Separate read/write models
- Event-driven updates
- Optimistic concurrency control

### Repository Pattern
- Data access abstraction
- Testable business logic
- Consistent query patterns

### Service Layer Pattern
- Business logic encapsulation
- Reusable across API routes and server actions
- Clear separation of concerns

---

## 14. Future Considerations

### Scalability
- Current architecture supports horizontal scaling
- Database can be scaled via Supabase
- Inngest handles background job scaling
- Consider Redis for caching at scale

### Enhancements
- More payment providers
- Advanced analytics
- Mobile app (React Native)
- Web3 features (NFT tickets, DAO governance)

---

## 15. Key Files Reference

### Core Architecture
- `src/core/workflow/orchestrator.ts` - Workflow command processor
- `src/core/state-machine/engine.ts` - State machine logic
- `src/lib/events/domain-events.ts` - Domain event definitions
- `src/lib/events/event-bus.ts` - Event publishing

### Services
- `src/lib/services/event-lifecycle.service.ts` - Event state transitions
- `src/lib/services/invite.service.ts` - Invitation management
- `src/lib/services/rsvp.service.ts` - Registration handling

### Repositories
- `src/lib/repositories/event.repository.ts` - Event data access
- `src/lib/repositories/guest.repository.ts` - Guest/ticket data
- `src/lib/repositories/invitation.repository.ts` - Invitation data

### API Routes
- `src/app/api/events/[id]/rsvp/route.ts` - RSVP endpoint
- `src/app/api/payments/verify/route.ts` - Payment verification
- `src/app/api/events/[id]/invite/route.ts` - Invitation sending

### Components
- `src/components/features/events/EventRSVP.tsx` - RSVP form
- `src/components/features/checkout/CryptoCheckout.tsx` - Crypto payment UI
- `src/components/features/CommandPalette.tsx` - Cmd+K search

---

## Conclusion

PlanX is a sophisticated event management platform with a well-architected codebase following modern best practices. It combines traditional web technologies with blockchain integration, providing a comprehensive solution for event discovery, hosting, ticketing, and payments. The event-driven architecture with domain events and state machines ensures reliable workflow management, while the modular structure allows for maintainability and scalability.
