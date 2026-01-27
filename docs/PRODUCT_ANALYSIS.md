# PlanX Product Analysis

## Executive Summary

**PlanX** (also known as "Pulse" or "Lumma" in some parts of the codebase) is a comprehensive, modern event management platform that combines traditional web technologies with blockchain integration. It provides end-to-end event discovery, hosting, ticketing, and payment solutions with support for both fiat (Stripe) and cryptocurrency payments (Solana, Ethereum).

---

## 1. Product Overview

### Core Value Proposition
PlanX enables users to:
- **Discover** events through multiple channels (search, categories, cities, calendars, 3D globe)
- **Host** events with rich customization (themes, branding, registration questions, ticket tiers)
- **Manage** attendees with approval workflows, QR check-in, and analytics
- **Monetize** through flexible payment options (Stripe, Solana, Ethereum, Escrow staking)
- **Engage** audiences via calendars, invitations, newsletters, and chat

### Target Users
- **Event Organizers**: Create, manage, and monetize events
- **Event Attendees**: Discover, register, and attend events
- **Calendar Owners**: Build subscribable event feeds with branding and CRM features

---

## 2. Technology Stack

### Frontend
- **Next.js 16** - App Router with Server Components (React 19)
- **TypeScript 5.8** - Strict type checking
- **Tailwind CSS 4.0** - Utility-first styling
- **Shadcn UI + Radix UI** - Accessible component library
- **Framer Motion** - Animations
- **Three.js / React Three Fiber** - 3D globe visualization
- **Zustand** - Client-side state management
- **TanStack React Query** - Server state and caching

### Backend & Infrastructure
- **Supabase** - PostgreSQL database, authentication, real-time subscriptions
- **Inngest** - Background job processing and event-driven workflows
- **Meilisearch** - Full-text search engine
- **Resend** - Email sending service

### Payment Systems
- **Stripe** - Traditional card payments
- **Solana** - Native SOL transfers via Phantom wallet (`@solana/web3.js`)
- **Ethereum** - ETH transfers via MetaMask/RainbowKit (`wagmi`, `viem`)
- **Smart Contracts** - EventEscrow.sol for trustless escrow staking

### Blockchain Infrastructure
- **Hardhat** - Smart contract development and deployment
- **Ethers.js** - Ethereum interaction library
- **EventEscrow Contract** - Solidity escrow for attendance staking

---

## 3. Architecture Patterns

### 3.1 Event-Driven Architecture (EDA)
- **Domain Events**: Canonical events stored in `domain_events` table
- **Event Bus**: Publishes events to Inngest for async processing
- **Event Store**: Immutable audit trail of all state changes
- **Consumers**: Multiple Inngest functions react to domain events (fan-out pattern)

### 3.2 State Machine Pattern
- **Event Lifecycle**: `draft → published → live → ended → archived`
- **Ticket Lifecycle**: `pending → approved → staked → checked_in → refunded/forfeited`
- **Validation**: State transitions validated via state machine engine
- **Guards**: Business rules enforced before state changes

### 3.3 CQRS-like Pattern
- **Write Model**: Commands processed through orchestrator
- **Read Model**: Denormalized views in Supabase for fast queries
- **Separation**: Clear separation between write and read operations

### 3.4 Repository Pattern
- **Data Access Layer**: Abstracted database operations
- **Repositories**: Event, Calendar, Guest, Invitation, Order, User repositories
- **Benefits**: Testable, maintainable, consistent query patterns

### 3.5 Service Layer Pattern
- **Business Logic**: Encapsulated in service classes
- **Reusability**: Services used across API routes and server actions
- **Key Services**: Event, Calendar, Invite, RSVP, Escrow, Permissions, Roles

---

## 4. Core Features

### 4.1 Event Management

#### Event Creation
- Rich event editor with themes and customization
- Custom registration questions (text, select, wallet address, social handles)
- Multiple ticket tiers with pricing
- Multiple hosts per event with roles
- Event visibility (public/private)
- Theme customization (colors, fonts)

#### Event Lifecycle
- State machine-driven status transitions
- Automatic transitions (published → live at start time)
- Manual transitions (draft → published, live → ended)
- Status history tracking

#### Event Discovery
- **Search**: Full-text search via Meilisearch (events, calendars, users, commands)
- **Categories**: Browse events by category
- **Cities**: Location-based discovery
- **3D Globe**: Interactive globe visualization (Three.js)
- **Calendars**: Subscribe to event feeds
- **Command Palette**: Cmd+K quick actions

### 4.2 Ticketing System

#### Ticket Types
- **Free Tickets**: No payment required
- **Paid Tickets**: Stripe, Solana, or Ethereum payments
- **Staked Tickets**: ETH escrow staking for attendance commitment

#### Registration Flow
1. User clicks RSVP
2. Payment (if required) → Stripe/crypto verification
3. Registration form (if questions exist)
4. Approval workflow (if `require_approval` enabled)
5. Ticket issued → QR code generated
6. Check-in at venue → QR scan

#### Ticket Statuses
- `pending` - Awaiting approval
- `approved` - Approved, ready to attend
- `staked` - ETH staked for commitment
- `checked_in` - Attended event
- `refunded` - Cancelled before event
- `forfeited` - No-show, stake claimed by organizer
- `rejected` - Registration rejected
- `cancelled` - Cancelled by user

### 4.3 Payment Processing

#### Stripe Integration
- Payment Intents creation
- Webhook handling for confirmations
- Customer management
- Support for multiple currencies

#### Solana Payments
- Native SOL transfers via Phantom wallet
- Transaction verification via RPC
- Reference tracking for payment linking
- Devnet/Mainnet support

#### Ethereum Payments
- ETH transfers via MetaMask/RainbowKit
- Transaction verification via RPC
- Wallet connection UI (RainbowKit)
- Sepolia/Mainnet support

#### Escrow Staking System
- **Smart Contract**: EventEscrow.sol deployed on Ethereum
- **Stake Flow**: Attendee stakes ETH → Check-in → Release to organizer
- **Refund Flow**: Attendee can refund before event (1 hour cutoff)
- **Forfeit Flow**: Organizer claims stake for no-shows after event
- **Security**: Trustless, on-chain verification

### 4.4 Calendar System

#### Calendar Features
- **Subscribable Feeds**: Users can follow event calendars
- **Branding**: Custom colors, avatars, cover images
- **Location**: City-specific or global calendars
- **Privacy**: Public or private calendars

#### Calendar Management
- **People CRM**: Audience management and segmentation
- **Calendar Insights**: Pre-computed analytics dashboard
- **Coupons**: Discount code management
- **Newsletters**: Email list management
- **Team Members**: Multi-user calendar management

### 4.5 Invitation System

#### Smart Invites
- **Email-Based**: Send invitations via email
- **Tracking**: Open, click, and RSVP tracking
- **Batch Invites**: Bulk invitation sending
- **Contact Book**: Reusable contact management
- **AI Suggestions**: Recipient suggestions based on event

#### Invitation Lifecycle
- `pending` - Created, not sent
- `sent` - Email sent
- `accepted` - Recipient RSVP'd
- `declined` - Recipient declined

#### Email Tracking
- **Open Tracking**: Pixel-based email open detection
- **Click Tracking**: Link click tracking with tokens
- **Analytics**: Track invitation performance

### 4.6 Search & Discovery

#### Unified Search
- **Cross-Entity**: Search events, calendars, users, commands
- **Meilisearch**: Full-text search with ranking
- **Command Palette**: Cmd+K quick actions
- **Filters**: Category, date, location filters

#### Discovery Channels
- **Category Browse**: Browse by event category
- **City Exploration**: Location-based discovery
- **Calendar Feeds**: Subscribe to curated calendars
- **3D Globe**: Interactive globe visualization

### 4.7 Real-time Features

#### Event Chat
- Per-event chat rooms
- Real-time messaging via Supabase real-time
- Chat floating button for global access

#### Notifications
- Real-time notification system
- Notification bell component
- In-app notifications

#### Live Updates
- Supabase real-time subscriptions
- Live event status updates
- Real-time guest list updates

### 4.8 Analytics & Insights

#### Event Dashboard
- Attendee count
- Check-in count
- Revenue tracking
- View analytics

#### Calendar Insights
- Subscriber growth
- Event performance
- Engagement metrics
- Pre-computed analytics

#### Audit Logs
- Complete activity trail
- Domain events store
- Status change history

---

## 5. Database Schema

### Core Tables

#### Users & Profiles
- `profiles` - Extended user profiles (synced from `auth.users`)
- Auto-created via trigger on user signup

#### Events
- `events` - Main event table
  - Basic info (title, description, date, location, coordinates)
  - Organizer relationship
  - Status lifecycle
  - Visibility settings
  - Commerce fields (price, currency, capacity)
  - Rich content (metadata JSONB, registration questions, social links, agenda, hosts)
  - Theme customization

#### Calendars
- `calendars` - Subscribable event feeds
  - Branding (color, avatar, cover)
  - Location (global or city-specific)
  - Subscription system
  - People CRM
  - Insights
  - Coupons

#### Guests & Tickets
- `guests` - Event attendees (tickets)
  - Status lifecycle
  - QR token for check-in
  - Links to orders and invitations
  - Escrow fields (stake_amount, stake_wallet_address, stake_tx_hash)

#### Invitations
- `invitations` - Smart invite system
  - Status lifecycle
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

---

## 6. Key Workflows

### 6.1 Event Creation Flow
```
1. User navigates to /create-event
2. Fills out event form (title, date, location, etc.)
3. Optionally adds registration questions, ticket tiers, hosts
4. Saves as draft
5. Publishes → status changes to published
6. Event becomes visible and open for registration
```

### 6.2 Registration/RSVP Flow
```
1. User clicks RSVP on event page
2. If paid event → payment flow (Stripe/crypto)
3. Fills registration form (if questions exist)
4. If require_approval → status pending_approval
5. Organizer approves/rejects
6. Ticket issued → status issued
7. QR code generated for check-in
```

### 6.3 Payment Flow (Crypto)
```
1. User selects crypto payment option
2. Connects wallet (Phantom for Solana, MetaMask for Ethereum)
3. Transaction created and signed
4. Transaction sent to blockchain
5. Backend verifies transaction via RPC
6. Order created, ticket issued
7. Payment linked to guest record
```

### 6.4 Escrow Staking Flow
```
1. User registers for event
2. Guest record created (status: pending or approved)
3. User stakes ETH on-chain via contract
4. Frontend calls POST /api/escrow/stake
5. Backend verifies stake on-chain
6. Guest status updated to staked
7. User checks in (QR scan or manual)
8. POST /api/checkin updates status to checked_in
9. Inngest event app/ticket_checked_in triggered
10. Consumer calls releaseStakeOnCheckIn()
11. Contract release() called
12. ETH sent to organizer wallet
```

### 6.5 Invitation Flow
```
1. Organizer sends invite via email
2. Invitation record created in DB
3. Inngest job queues email sending
4. Email sent with tracking token
5. Recipient opens email → tracked
6. Recipient clicks link → tracked
7. Recipient RSVPs → invitation linked to guest
8. Status updated to accepted
```

### 6.6 Check-in Flow
```
1. Event status transitions to live (automatic at start time)
2. Organizer scans QR code at venue
3. QR token validated (nonce check)
4. Guest status updated to checked_in
5. Domain event TICKET_CHECKED_IN emitted
6. Analytics updated
7. If staked ticket → escrow released automatically
```

### 6.7 Event Lifecycle Automation
```
1. Cron job (Inngest) checks for events to start
2. Finds events with published status where date <= now()
3. Transitions to live
4. Similar process for ending events
5. Domain events emitted for each transition
```

---

## 7. API Structure

### Core API Routes

#### Events
- `GET /api/events` - List events
- `GET /api/events/[id]` - Get event details
- `POST /api/events/[id]/rsvp` - Register for event
- `POST /api/events/[id]/invite` - Send invitation
- `GET /api/events/[id]/guests` - Get attendees
- `POST /api/events/[id]/guests/approve` - Approve ticket
- `POST /api/events/[id]/guests/reject` - Reject ticket
- `GET /api/events/[id]/dashboard` - Event analytics

#### Payments
- `POST /api/payments/verify` - Verify blockchain transaction
- `GET /api/payments/config` - Get payment configuration

#### Escrow
- `POST /api/escrow/stake` - Verify stake and update guest status
- `GET /api/escrow/stake` - Get stake info

#### Check-in
- `POST /api/checkin` - Check in attendee (triggers escrow release if staked)

#### Calendars
- `GET /api/calendars` - List calendars
- `GET /api/calendars/[id]` - Get calendar details
- `POST /api/calendars/subscriptions` - Subscribe/unsubscribe

#### Invitations
- `GET /api/invites` - List invitations
- `POST /api/invites/batch` - Batch send invitations
- `GET /api/invites/[token]/track` - Track email opens/clicks

#### Search
- `GET /api/search` - Search events
- `GET /api/search/unified` - Unified search (events, calendars, users)

#### Inngest
- `POST /api/inngest` - Inngest webhook endpoint

---

## 8. Security Features

### Authentication & Authorization
- **Supabase Auth**: JWT tokens, email/password, OAuth (Google)
- **Row Level Security (RLS)**: Database-level access control
- **Role-Based Access Control (RBAC)**: Fine-grained permissions
- **Permission Service**: Centralized permission checking

### Payment Security
- **QR Nonces**: Secure QR check-in tokens (prevents replay attacks)
- **Blockchain Verification**: On-chain transaction verification
- **Escrow Smart Contracts**: Trustless escrow system
- **Idempotent Processing**: Prevents duplicate payments

### Data Security
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection Prevention**: Parameterized queries
- **XSS Prevention**: React auto-escaping
- **CSRF Protection**: Next.js built-in

---

## 9. Performance Optimizations

### Next.js Optimizations
- **Server Components**: Default to Server Components
- **Dynamic Imports**: Code splitting for large components
- **Image Optimization**: Next.js Image component with WebP
- **Route-Based Code Splitting**: Automatic code splitting

### Database Optimizations
- **Indexes**: On frequently queried columns
- **Denormalized Counts**: Attendees, subscribers counts
- **Pre-computed Insights**: Calendar analytics pre-computed
- **Efficient Pagination**: Cursor-based pagination

### Caching Strategy
- **React Query**: Client-side caching
- **Supabase Query Caching**: Server-side caching
- **Static Page Generation**: Where possible
- **CDN**: For static assets

---

## 10. Integration Points

### Supabase
- **Authentication**: Email/password, OAuth providers
- **Database**: PostgreSQL with RLS
- **Real-time**: Subscriptions for live updates
- **Storage**: File uploads (images, avatars)

### Inngest
- **Background Jobs**: Email sending, reminders, indexing
- **Scheduled Tasks**: Event lifecycle transitions, insights refresh
- **Event Consumers**: Process domain events asynchronously

### Meilisearch
- **Indexing**: Events, calendars, users indexed for search
- **Search API**: Full-text search with filters and ranking
- **Reindexing**: Scheduled updates via Inngest

### Stripe
- **Payment Intents**: Create payment sessions
- **Webhooks**: Handle payment confirmations
- **Customer Management**: Store payment methods

### Blockchain (Solana/Ethereum)
- **RPC Connections**: Verify transactions
- **Wallet Integration**: Connect and sign transactions
- **Smart Contracts**: Escrow contract for secure payments

### Resend
- **Email Sending**: Invitations, confirmations, reminders
- **Templates**: HTML email templates
- **Tracking**: Open and click tracking

---

## 11. State Management

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

## 12. Smart Contracts

### EventEscrow.sol
**Purpose**: Trustless escrow for event attendance staking

**Key Functions**:
- `stake()` - Attendee stakes ETH for event
- `release()` - Organizer releases stake on check-in
- `refund()` - Attendee refunds before event (1 hour cutoff)
- `forfeit()` - Organizer claims stake for no-shows

**Stake Statuses**:
- `None` - No stake exists
- `Staked` - Funds locked
- `Released` - Funds sent to organizer (successful check-in)
- `Refunded` - Funds returned to attendee (cancellation)
- `Forfeited` - Funds sent to organizer (no-show)

**Security Features**:
- Minimum stake amount (0.001 ETH)
- Refund cutoff (1 hour before event)
- Only organizer/owner can release/forfeit
- Only attendee can refund

---

## 13. File Structure

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
│   │   ├── services/         # Business logic
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

## 14. Environment Variables

### Required
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `INNGEST_EVENT_KEY` - Inngest event key
- `INNGEST_SIGNING_KEY` - Inngest signing key

### Payment Providers
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `SOLANA_RPC_URL` - Solana RPC endpoint
- `ETH_RPC_URL` - Ethereum RPC endpoint
- `NEXT_PUBLIC_ESCROW_ADDRESS` - EventEscrow contract address
- `ESCROW_SIGNER_PRIVATE_KEY` - Organizer's private key for escrow

### Email
- `RESEND_API_KEY` - Resend API key

### Search
- `MEILISEARCH_URL` - Meilisearch URL
- `MEILISEARCH_MASTER_KEY` - Meilisearch master key

---

## 15. Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Run Next.js dev server
npm run dev

# Run with Inngest dev server
npm run dev:all

# Build for production
npm run build

# Start production server
npm start
```

### Database Migrations
```bash
# Apply migrations via Supabase CLI
supabase db push

# Or manually via SQL files in supabase/migrations/
```

### Smart Contract Deployment
```bash
cd contracts
npx hardhat compile
npx hardhat deploy --network sepolia
```

---

## 16. Testing

### Escrow Testing
- Comprehensive testing guide: `ESCROW_TESTING_GUIDE.md`
- Quick start: `ESCROW_QUICK_START.md`
- Automated test script: `test-escrow-flow.ts`

### Test Scenarios
- Event creation and publishing
- Registration and payment flows
- Escrow staking and release
- Check-in and QR scanning
- Invitation sending and tracking
- Calendar subscriptions

---

## 17. Future Considerations

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
- Multi-language support (i18n)
- Advanced search filters
- Event recommendations

---

## 18. Key Strengths

1. **Modern Tech Stack**: Latest Next.js, React, TypeScript
2. **Event-Driven Architecture**: Scalable, maintainable
3. **State Machine Pattern**: Reliable state transitions
4. **Blockchain Integration**: Crypto payments and escrow
5. **Rich Feature Set**: Comprehensive event management
6. **Type Safety**: Strict TypeScript throughout
7. **Performance**: Optimized with caching and code splitting
8. **Security**: Multiple layers of security

---

## 19. Areas for Improvement

1. **Testing**: More comprehensive test coverage
2. **Documentation**: API documentation (OpenAPI/Swagger)
3. **Monitoring**: Error tracking (Sentry integration)
4. **Analytics**: More detailed analytics dashboards
5. **Mobile**: Native mobile app
6. **Internationalization**: Multi-language support
7. **Accessibility**: Enhanced a11y features
8. **Performance**: Further optimization opportunities

---

## Conclusion

PlanX is a sophisticated, production-ready event management platform that successfully combines traditional web technologies with blockchain integration. The architecture is well-designed with clear separation of concerns, event-driven workflows, and robust state management. The platform provides comprehensive features for event discovery, hosting, ticketing, and payments, making it a complete solution for event organizers and attendees.

The codebase follows modern best practices, uses TypeScript for type safety, and implements security measures at multiple layers. The integration of smart contracts for escrow staking adds a unique Web3 dimension to the platform, enabling trustless attendance commitments.

Overall, PlanX represents a mature, scalable, and feature-rich event management solution with strong technical foundations and clear potential for future enhancements.
