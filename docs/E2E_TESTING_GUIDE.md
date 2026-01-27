# End-to-End Testing Guide

## Overview

This comprehensive guide covers end-to-end testing for all major flows in PlanX, including event management, ticketing, payments, escrow, invitations, and calendars.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Test Scenarios](#test-scenarios)
4. [Automated Testing](#automated-testing)
5. [Manual Testing](#manual-testing)
6. [Verification Steps](#verification-steps)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services

- [ ] **Supabase Project**: Database and authentication configured
- [ ] **Inngest Account**: Background job processing
- [ ] **Meilisearch Instance**: Search engine (optional for basic testing)
- [ ] **Stripe Account**: Payment processing (test mode)
- [ ] **Blockchain RPC**: Ethereum (Sepolia) and Solana (Devnet) endpoints
- [ ] **Resend Account**: Email sending (optional for basic testing)

### Required Tools

- [ ] Node.js 18+ installed
- [ ] npm or pnpm installed
- [ ] Git installed
- [ ] Browser with MetaMask/Phantom wallet extensions (for crypto testing)
- [ ] Supabase CLI (optional, for database management)

### Test Accounts

- [ ] **Organizer Account**: Supabase user for creating events
- [ ] **Attendee Account**: Supabase user for registering
- [ ] **Test Wallets**: 
  - Ethereum wallet (MetaMask) with Sepolia ETH
  - Solana wallet (Phantom) with Devnet SOL
  - Organizer wallet private key for escrow

---

## Environment Setup

### 1. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd PlanX

# Install dependencies
npm install

# Install contract dependencies (if testing escrow)
cd contracts
npm install
cd ..
```

### 2. Environment Variables

Create `.env.local` file in the root directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Inngest
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key

# Stripe (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Ethereum
ETH_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_ESCROW_ADDRESS=0x... # Deployed EventEscrow contract
ESCROW_SIGNER_PRIVATE_KEY=0x... # Organizer's private key

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_WALLET_ADDRESS=... # Platform wallet for receiving SOL

# Email (Optional)
RESEND_API_KEY=re_...

# Search (Optional)
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_MASTER_KEY=masterKey

# Testing (for automated scripts)
TEST_EVENT_ID=uuid-of-test-event
TEST_GUEST_ID=uuid-of-test-guest
TEST_ORGANIZER_KEY=0x... # Organizer private key
TEST_ATTENDEE_KEY=0x... # Attendee private key
```

### 3. Database Setup

```bash
# Apply migrations
supabase db push

# Or manually run SQL files from supabase/migrations/
```

### 4. Deploy Smart Contract (For Escrow Testing)

```bash
cd contracts

# Compile contract
npx hardhat compile

# Deploy to Sepolia testnet
npx hardhat run scripts/deploy.ts --network sepolia

# Note the deployed address and update NEXT_PUBLIC_ESCROW_ADDRESS
```

### 5. Start Development Servers

```bash
# Start Next.js only
npm run dev

# Start Next.js + Inngest dev server (recommended)
npm run dev:all
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Inngest Dashboard**: http://localhost:8288 (if using dev:all)

---

## Test Scenarios

### Scenario 1: Complete Event Lifecycle

**Goal**: Test event creation, publishing, and lifecycle transitions

#### Steps:

1. **Create Event**
   ```
   - Navigate to: http://localhost:3000/create-event
   - Fill event form:
     * Title: "E2E Test Event"
     * Date: Future date (2+ hours from now)
     * Location: "Test Venue"
     * Description: "Testing end-to-end flow"
     * Category: Select any category
   - Save as draft
   ```

2. **Verify Draft Status**
   ```sql
   SELECT id, title, status FROM events WHERE title = 'E2E Test Event';
   -- Should return status: 'draft'
   ```

3. **Publish Event**
   ```
   - Click "Publish" button
   - Verify status changes to 'published'
   ```

4. **Verify Published Status**
   ```sql
   SELECT id, title, status FROM events WHERE title = 'E2E Test Event';
   -- Should return status: 'published'
   ```

5. **Event Auto-Transition to Live**
   ```
   - Wait for event start time (or manually trigger via API)
   - Verify status changes to 'live'
   ```

6. **End Event**
   ```
   - After event time passes, verify status changes to 'ended'
   ```

**Verification**:
- [ ] Event created with draft status
- [ ] Event published successfully
- [ ] Event appears in public events list
- [ ] Event transitions to live at start time
- [ ] Event transitions to ended after completion

---

### Scenario 2: Registration/RSVP Flow

**Goal**: Test complete registration flow with approval workflow

#### Steps:

1. **Register for Event**
   ```
   - Navigate to: http://localhost:3000/events/[eventId]
   - Click "RSVP" or "Register"
   - Fill registration form (if questions exist)
   - Submit registration
   ```

2. **Verify Guest Record**
   ```sql
   SELECT id, event_id, user_id, status, qr_token 
   FROM guests 
   WHERE event_id = '<eventId>' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

3. **Approve Ticket** (if require_approval enabled)
   ```
   - Navigate to: http://localhost:3000/events/[eventId]/manage/guests
   - Find pending guest
   - Click "Approve"
   ```

4. **Verify Ticket Issued**
   ```sql
   SELECT id, status FROM guests WHERE id = '<guestId>';
   -- Should return status: 'approved' or 'issued'
   ```

5. **View Ticket**
   ```
   - Navigate to: http://localhost:3000/events/[eventId]/ticket
   - Verify QR code displayed
   ```

**Verification**:
- [ ] Guest record created
- [ ] QR token generated
- [ ] Ticket status updated correctly
- [ ] QR code displays correctly

---

### Scenario 3: Stripe Payment Flow

**Goal**: Test Stripe payment processing

#### Steps:

1. **Create Paid Event**
   ```
   - Create event with price > 0
   - Set payment method to Stripe
   ```

2. **Register with Payment**
   ```
   - Navigate to event page
   - Click "RSVP"
   - Select ticket tier
   - Click "Pay with Stripe"
   ```

3. **Complete Payment**
   ```
   - Use Stripe test card: 4242 4242 4242 4242
   - Expiry: Any future date
   - CVC: Any 3 digits
   - Complete payment
   ```

4. **Verify Payment**
   ```sql
   SELECT id, event_id, user_id, amount, status, payment_method 
   FROM orders 
   WHERE event_id = '<eventId>' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

5. **Verify Ticket Issued**
   ```sql
   SELECT id, status, order_id FROM guests WHERE order_id = '<orderId>';
   -- Should return status: 'issued'
   ```

**Verification**:
- [ ] Payment intent created
- [ ] Payment processed successfully
- [ ] Order record created
- [ ] Ticket issued automatically
- [ ] Guest linked to order

---

### Scenario 4: Solana Payment Flow

**Goal**: Test Solana cryptocurrency payment

#### Steps:

1. **Create Paid Event**
   ```
   - Create event with SOL price
   - Set payment method to Solana
   ```

2. **Connect Phantom Wallet**
   ```
   - Click "Pay with Solana"
   - Connect Phantom wallet
   - Ensure wallet has Devnet SOL
   ```

3. **Complete Payment**
   ```
   - Confirm transaction in Phantom
   - Wait for confirmation
   ```

4. **Verify Payment**
   ```bash
   # Check transaction on Solana Explorer
   # Verify via API
   curl "http://localhost:3000/api/payments/verify" \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
       "reference": "<tx-signature>",
       "amount": <amount>,
       "eventId": "<eventId>",
       "chain": "solana"
     }'
   ```

5. **Verify Ticket Issued**
   ```sql
   SELECT id, status FROM guests WHERE event_id = '<eventId>';
   ```

**Verification**:
- [ ] Wallet connected successfully
- [ ] Transaction sent to blockchain
- [ ] Transaction verified on-chain
- [ ] Order created
- [ ] Ticket issued

---

### Scenario 5: Ethereum Payment Flow

**Goal**: Test Ethereum cryptocurrency payment

#### Steps:

1. **Create Paid Event**
   ```
   - Create event with ETH price
   - Set payment method to Ethereum
   ```

2. **Connect MetaMask Wallet**
   ```
   - Click "Pay with Ethereum"
   - Connect MetaMask wallet
   - Ensure wallet has Sepolia ETH
   ```

3. **Complete Payment**
   ```
   - Confirm transaction in MetaMask
   - Wait for confirmation (3+ blocks)
   ```

4. **Verify Payment**
   ```bash
   # Check transaction on Etherscan
   # Verify via API
   curl "http://localhost:3000/api/payments/verify" \
     -X POST \
     -H "Content-Type: application/json" \
     -d '{
       "reference": "<tx-hash>",
       "amount": <amount>,
       "eventId": "<eventId>",
       "chain": "ethereum"
     }'
   ```

5. **Verify Ticket Issued**
   ```sql
   SELECT id, status FROM guests WHERE event_id = '<eventId>';
   ```

**Verification**:
- [ ] Wallet connected successfully
- [ ] Transaction sent to blockchain
- [ ] Transaction verified on-chain
- [ ] Order created
- [ ] Ticket issued

---

### Scenario 6: Escrow Staking Flow

**Goal**: Test complete escrow staking and release flow

#### Steps:

1. **Create Event**
   ```
   - Create event with future date (2+ hours from now)
   - Note the eventId
   ```

2. **Register for Event**
   ```
   - Register as attendee
   - Note the guestId
   ```

3. **Stake ETH** (Using Test Script)
   ```bash
   # Set environment variables
   export TEST_EVENT_ID="<eventId>"
   export TEST_GUEST_ID="<guestId>"
   export TEST_ORGANIZER_KEY="<organizer-key>"
   export TEST_ATTENDEE_KEY="<attendee-key>"

   # Run test script
   npx tsx test-escrow-flow.ts
   ```

   Or manually:
   ```bash
   cd contracts
   npx hardhat console --network sepolia
   
   # In console:
   const EventEscrow = await ethers.getContractFactory("EventEscrow");
   const escrow = await EventEscrow.attach(process.env.NEXT_PUBLIC_ESCROW_ADDRESS);
   const eventId = "<eventId>";
   const eventIdHash = ethers.keccak256(ethers.toUtf8Bytes(eventId));
   const organizer = "<organizer-address>";
   const eventStartTime = Math.floor(Date.now() / 1000) + 7200;
   const stakeAmount = ethers.parseEther("0.001");
   
   const tx = await escrow.stake(eventIdHash, organizer, eventStartTime, { value: stakeAmount });
   await tx.wait();
   console.log("Staked:", tx.hash);
   ```

4. **Verify Stake via API**
   ```bash
   curl -X POST http://localhost:3000/api/escrow/stake \
     -H "Content-Type: application/json" \
     -d '{
       "eventId": "<eventId>",
       "walletAddress": "<attendee-address>",
       "txHash": "<stake-tx-hash>",
       "guestId": "<guestId>"
     }'
   ```

5. **Verify Guest Status**
   ```sql
   SELECT id, status, stake_amount, stake_wallet_address, stake_tx_hash 
   FROM guests 
   WHERE id = '<guestId>';
   -- Should return status: 'staked'
   ```

6. **Check-in Attendee**
   ```bash
   # Get QR token from guest record
   SELECT qr_token FROM guests WHERE id = '<guestId>';
   
   # Check-in via API
   curl -X POST http://localhost:3000/api/checkin \
     -H "Content-Type: application/json" \
     -d '{
       "qrToken": "<qr-token>",
       "eventId": "<eventId>"
     }'
   ```

7. **Verify Escrow Release**
   ```
   - Check Inngest dashboard for 'app/ticket_checked_in' event
   - Verify 'consumer-ticket-checkin-escrow' function executed
   - Check contract: stake status should be 'Released' (2)
   - Check organizer wallet: balance should increase
   ```

**Verification**:
- [ ] ETH staked on-chain
- [ ] Stake verified via API
- [ ] Guest status updated to 'staked'
- [ ] Check-in successful
- [ ] Escrow released automatically
- [ ] Organizer received ETH

---

### Scenario 7: Check-in Flow

**Goal**: Test QR code check-in process

#### Steps:

1. **Prepare for Check-in**
   ```
   - Ensure event status is 'live'
   - Ensure guest status is 'issued' or 'staked'
   - Get QR token from guest record
   ```

2. **Scan QR Code** (Using QR Scanner Component)
   ```
   - Navigate to: http://localhost:3000/events/[eventId]/manage/guests
   - Click "Check In" or use QR scanner
   - Scan QR code from ticket
   ```

3. **Or Check-in via API**
   ```bash
   curl -X POST http://localhost:3000/api/checkin \
     -H "Content-Type: application/json" \
     -d '{
       "qrToken": "<qr-token>",
       "eventId": "<eventId>"
     }'
   ```

4. **Verify Check-in**
   ```sql
   SELECT id, status, checked_in_at 
   FROM guests 
   WHERE id = '<guestId>';
   -- Should return status: 'checked_in'
   ```

5. **Verify Escrow Release** (if staked)
   ```
   - Check Inngest dashboard
   - Verify escrow release transaction
   ```

**Verification**:
- [ ] QR token validated
- [ ] Guest status updated to 'checked_in'
- [ ] Check-in timestamp recorded
- [ ] Escrow released (if applicable)
- [ ] Domain event emitted

---

### Scenario 8: Invitation Flow

**Goal**: Test invitation sending and tracking

#### Steps:

1. **Send Invitation**
   ```
   - Navigate to: http://localhost:3000/events/[eventId]
   - Click "Invite"
   - Enter recipient email
   - Click "Send Invitation"
   ```

2. **Verify Invitation Created**
   ```sql
   SELECT id, event_id, email, status, tracking_token 
   FROM invitations 
   WHERE event_id = '<eventId>' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

3. **Simulate Email Open** (Track via API)
   ```bash
   # Get tracking token from invitation
   SELECT tracking_token FROM invitations WHERE id = '<invitationId>';
   
   # Track email open
   curl "http://localhost:3000/api/invites/<tracking-token>/track?type=open"
   ```

4. **Simulate Email Click**
   ```bash
   curl "http://localhost:3000/api/invites/<tracking-token>/track?type=click"
   ```

5. **Recipient RSVPs**
   ```
   - Recipient clicks invitation link
   - Registers for event
   ```

6. **Verify Invitation Linked**
   ```sql
   SELECT id, invitation_id, status 
   FROM guests 
   WHERE invitation_id = '<invitationId>';
   ```

7. **Verify Invitation Status**
   ```sql
   SELECT id, status, opened_at, clicked_at, responded_at 
   FROM invitations 
   WHERE id = '<invitationId>';
   -- Should return status: 'accepted'
   ```

**Verification**:
- [ ] Invitation created
- [ ] Email sent (check Resend dashboard)
- [ ] Email open tracked
- [ ] Email click tracked
- [ ] RSVP linked to invitation
- [ ] Invitation status updated

---

### Scenario 9: Calendar Subscription Flow

**Goal**: Test calendar creation and subscription

#### Steps:

1. **Create Calendar**
   ```
   - Navigate to: http://localhost:3000/create-calendar
   - Fill calendar form:
     * Name: "Test Calendar"
     * Slug: "test-calendar"
     * Description: "Testing calendar"
     * Color: Select color
   - Save calendar
   ```

2. **Verify Calendar Created**
   ```sql
   SELECT id, name, slug, owner_id 
   FROM calendars 
   WHERE slug = 'test-calendar';
   ```

3. **Subscribe to Calendar**
   ```
   - Navigate to calendar page
   - Click "Subscribe"
   ```

4. **Verify Subscription**
   ```sql
   SELECT id, calendar_id, user_id 
   FROM calendar_subscriptions 
   WHERE calendar_id = '<calendarId>' AND user_id = '<userId>';
   ```

5. **Add Event to Calendar**
   ```
   - Navigate to event page
   - Click "Add to Calendar"
   - Select calendar
   ```

6. **Verify Event Linked**
   ```sql
   SELECT id, calendar_id, event_id 
   FROM calendar_events 
   WHERE calendar_id = '<calendarId>' AND event_id = '<eventId>';
   ```

**Verification**:
- [ ] Calendar created
- [ ] Subscription created
- [ ] Event added to calendar
- [ ] Calendar subscriber count updated

---

### Scenario 10: Search and Discovery

**Goal**: Test search functionality

#### Steps:

1. **Index Events** (if Meilisearch configured)
   ```bash
   # Trigger reindex via Inngest or API
   curl -X POST http://localhost:3000/api/search/reindex
   ```

2. **Search Events**
   ```
   - Navigate to: http://localhost:3000/discover
   - Use search bar or Command Palette (Cmd+K)
   - Search for event title
   ```

3. **Verify Search Results**
   ```
   - Verify events appear in results
   - Test filters (category, date, location)
   ```

4. **Test Command Palette**
   ```
   - Press Cmd+K (Mac) or Ctrl+K (Windows)
   - Search for events, calendars, users
   - Verify quick actions work
   ```

**Verification**:
- [ ] Events indexed
- [ ] Search returns results
- [ ] Filters work correctly
- [ ] Command palette functional

---

## Automated Testing

### Running Escrow Test Script

```bash
# Set environment variables
export TEST_EVENT_ID="<eventId>"
export TEST_GUEST_ID="<guestId>"
export TEST_ORGANIZER_KEY="<organizer-key>"
export TEST_ATTENDEE_KEY="<attendee-key>"
export NEXT_PUBLIC_ESCROW_ADDRESS="<contract-address>"
export ETH_RPC_URL="<rpc-url>"

# Run test script
npx tsx test-escrow-flow.ts
```

### Test Script Output

The script will:
1. ✅ Stake ETH on-chain
2. ✅ Verify stake via API
3. ✅ Get stake status
4. ✅ Release stake (if uncommented)
5. ✅ Refund stake (if uncommented)

---

## Manual Testing

### Browser Testing Checklist

- [ ] **Event Creation**: Create, edit, delete events
- [ ] **Event Publishing**: Draft → Published → Live → Ended
- [ ] **Registration**: RSVP with/without payment
- [ ] **Payment**: Stripe, Solana, Ethereum payments
- [ ] **Escrow**: Stake, verify, release, refund
- [ ] **Check-in**: QR scan, manual check-in
- [ ] **Invitations**: Send, track, link to RSVP
- [ ] **Calendars**: Create, subscribe, add events
- [ ] **Search**: Search events, calendars, users
- [ ] **Notifications**: Real-time updates
- [ ] **Chat**: Event chat functionality

### API Testing Checklist

Use tools like Postman, curl, or httpie:

- [ ] `GET /api/events` - List events
- [ ] `GET /api/events/[id]` - Get event
- [ ] `POST /api/events/[id]/rsvp` - Register
- [ ] `POST /api/payments/verify` - Verify payment
- [ ] `POST /api/escrow/stake` - Verify stake
- [ ] `POST /api/checkin` - Check-in
- [ ] `POST /api/events/[id]/invite` - Send invite
- [ ] `GET /api/search` - Search

---

## Verification Steps

### Database Verification

```sql
-- Check event lifecycle
SELECT id, title, status, created_at, updated_at 
FROM events 
ORDER BY created_at DESC 
LIMIT 10;

-- Check guest registrations
SELECT id, event_id, user_id, status, checked_in_at 
FROM guests 
ORDER BY created_at DESC 
LIMIT 10;

-- Check orders
SELECT id, event_id, amount, status, payment_method 
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;

-- Check invitations
SELECT id, event_id, email, status, opened_at, clicked_at 
FROM invitations 
ORDER BY created_at DESC 
LIMIT 10;

-- Check domain events
SELECT id, event_type, payload, created_at 
FROM domain_events 
ORDER BY created_at DESC 
LIMIT 20;
```

### Inngest Dashboard Verification

1. Navigate to: http://localhost:8288
2. Check function executions
3. Verify event processing
4. Check for errors

### Blockchain Verification

**Ethereum (Sepolia)**:
- Check transactions on: https://sepolia.etherscan.io
- Verify contract calls
- Check wallet balances

**Solana (Devnet)**:
- Check transactions on: https://explorer.solana.com/?cluster=devnet
- Verify transfers
- Check wallet balances

---

## Troubleshooting

### Common Issues

#### 1. "No active stake found on-chain"
**Solution**:
- Wait for transaction confirmations (3+ blocks)
- Verify event ID hash matches
- Check contract address in env vars

#### 2. "Guest record not found"
**Solution**:
- Register for event first
- Ensure `stake_wallet_address` matches staking wallet
- Check guest ID is correct

#### 3. Release not happening
**Solution**:
- Check `ESCROW_SIGNER_PRIVATE_KEY` is set
- Verify Inngest is running: `npm run dev:all`
- Check Inngest dashboard for errors
- Verify organizer address matches contract

#### 4. Payment verification failing
**Solution**:
- Wait for blockchain confirmations
- Verify RPC endpoint is correct
- Check transaction hash is valid
- Ensure amount matches

#### 5. Email not sending
**Solution**:
- Check `RESEND_API_KEY` is set
- Verify email template exists
- Check Inngest function executed
- Check Resend dashboard for errors

#### 6. Search not working
**Solution**:
- Verify Meilisearch is running
- Check `MEILISEARCH_URL` and `MEILISEARCH_MASTER_KEY`
- Trigger reindex: `POST /api/search/reindex`
- Check Meilisearch dashboard

### Debug Commands

```bash
# Check environment variables
node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"

# Test Supabase connection
npx supabase status

# Test Inngest connection
curl http://localhost:8288/api/health

# Test Meilisearch connection
curl http://localhost:7700/health

# Check database connection
psql $DATABASE_URL -c "SELECT NOW();"
```

### Logs to Check

1. **Next.js Console**: Check for API errors
2. **Inngest Dashboard**: Check function executions
3. **Browser Console**: Check for frontend errors
4. **Database Logs**: Check for query errors
5. **Blockchain Explorer**: Check transaction status

---

## Test Data Setup

### Create Test Users

```sql
-- Create organizer user (via Supabase Auth UI or API)
-- Note: Users are created via Supabase Auth, profiles auto-created

-- Create test profiles (if needed)
INSERT INTO profiles (id, email, display_name)
VALUES 
  ('organizer-id', 'organizer@test.com', 'Test Organizer'),
  ('attendee-id', 'attendee@test.com', 'Test Attendee');
```

### Create Test Events

```sql
-- Create test event
INSERT INTO events (id, title, description, date, location, organizer_id, status, price)
VALUES (
  gen_random_uuid(),
  'Test Event',
  'Test Description',
  NOW() + INTERVAL '2 hours',
  'Test Venue',
  'organizer-id',
  'published',
  0.00
);
```

---

## Next Steps

1. **Automated Test Suite**: Create comprehensive test suite with Jest/Playwright
2. **CI/CD Integration**: Add tests to CI/CD pipeline
3. **Performance Testing**: Load testing for high-traffic scenarios
4. **Security Testing**: Penetration testing and security audits
5. **Monitoring**: Set up error tracking (Sentry) and analytics

---

## Additional Resources

- **Escrow Testing**: See `ESCROW_TESTING_GUIDE.md`
- **Quick Start**: See `ESCROW_QUICK_START.md`
- **Product Analysis**: See `PRODUCT_ANALYSIS.md`
- **Codebase Analysis**: See `CODEBASE_ANALYSIS.md`

---

## Support

For issues or questions:
1. Check troubleshooting section
2. Review logs and error messages
3. Check Inngest dashboard for background job errors
4. Verify environment variables are set correctly
5. Check database and blockchain connections
