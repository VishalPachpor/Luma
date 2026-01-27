# End-to-End Escrow Testing Guide

## Overview

This guide walks through testing the complete escrow flow from event creation to stake release/forfeit.

## Prerequisites

1. **Deployed Contract**: EventEscrow contract deployed to Sepolia testnet
2. **Environment Variables**: Set in `.env.local`:
   ```bash
   NEXT_PUBLIC_ESCROW_ADDRESS=<your-deployed-contract-address>
   ETH_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
   ESCROW_SIGNER_PRIVATE_KEY=<organizer-private-key>
   ```
3. **Test Wallets**: 
   - Organizer wallet (with ETH for gas)
   - Attendee wallet (with ETH for staking)
4. **Test Accounts**: Supabase accounts for organizer and attendee

---

## Test Flow Overview

```
1. Create Event (Organizer)
   ↓
2. Register for Event (Attendee)
   ↓
3. Stake ETH on-chain (Attendee)
   ↓
4. Verify Stake via API
   ↓
5. Check-in (Organizer)
   ↓
6. Release Stake (Backend)
   ↓
7. Verify Funds Released
```

---

## Step-by-Step Testing

### Step 1: Create Test Event

**As Organizer:**

1. Navigate to `/create-event`
2. Fill out event form:
   - Title: "Escrow Test Event"
   - Date: Set to future date (at least 2 hours from now for refund testing)
   - Location: "Test Venue"
   - Price: 0 (free event, staking is separate)
   - Status: `published`
3. Save event and note the `eventId`

**Verify:**
- Event appears in events list
- Event status is `published`

---

### Step 2: Register for Event

**As Attendee:**

1. Navigate to event page: `/events/[eventId]`
2. Click "RSVP" or "Register"
3. Fill registration form (if questions exist)
4. Submit registration

**Verify:**
- Guest record created in database
- Guest status is `pending` or `issued` (depending on `require_approval`)

**Check Database:**
```sql
SELECT id, event_id, user_id, status, stake_wallet_address 
FROM guests 
WHERE event_id = '<eventId>' 
ORDER BY created_at DESC 
LIMIT 1;
```

Note the `guestId` and ensure `stake_wallet_address` is set (or will be set when staking).

---

### Step 3: Stake ETH On-Chain

**As Attendee (with MetaMask/RainbowKit):**

You'll need to create a frontend component or use a script to call the contract. Here's the flow:

**Option A: Using Frontend Component (if exists)**

1. Navigate to event page
2. Click "Stake" button (if implemented)
3. Connect wallet
4. Enter stake amount (minimum 0.001 ETH)
5. Confirm transaction

**Option B: Using Hardhat Script**

Create a test script to stake:

```typescript
// test-stake.ts
import { ethers } from "ethers";
import { hashEventId } from "./src/lib/contracts/escrow";
import { ESCROW_ABI } from "./src/lib/contracts/escrow";

const ESCROW_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS!;
const RPC_URL = process.env.ETH_RPC_URL!;
const ATTENDEE_PRIVATE_KEY = "<attendee-private-key>";

async function stake() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(ATTENDEE_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet);

    const eventId = "<your-event-id>";
    const organizerAddress = "<organizer-wallet-address>";
    const eventStartTime = Math.floor(new Date("<event-date>").getTime() / 1000);
    const stakeAmount = ethers.parseEther("0.001"); // Minimum stake

    const eventIdHash = hashEventId(eventId);

    console.log("Staking...");
    console.log("Event ID:", eventId);
    console.log("Event ID Hash:", eventIdHash);
    console.log("Organizer:", organizerAddress);
    console.log("Amount:", ethers.formatEther(stakeAmount), "ETH");

    const tx = await contract.stake(eventIdHash, organizerAddress, eventStartTime, {
        value: stakeAmount
    });

    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("Confirmed in block:", receipt.blockNumber);
    console.log("✅ Stake successful!");

    return {
        txHash: tx.hash,
        walletAddress: wallet.address
    };
}

stake().catch(console.error);
```

**Verify:**
- Transaction confirmed on Sepolia
- Check on Etherscan: `https://sepolia.etherscan.io/tx/<txHash>`
- Event `Staked` emitted

---

### Step 4: Verify Stake via API

**Call the verification endpoint:**

```bash
curl -X POST http://localhost:3000/api/escrow/stake \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "<eventId>",
    "walletAddress": "<attendee-wallet-address>",
    "txHash": "<stake-tx-hash>",
    "guestId": "<guestId>"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "guestId": "<guestId>",
  "previousStatus": "approved",
  "newStatus": "staked",
  "stakeInfo": {
    "amount": "1000000000000000",
    "amountEth": "0.001",
    "organizer": "<organizer-address>",
    "status": 1,
    "stakedAt": "2026-01-24T...",
    "eventStartTime": "2026-01-24T..."
  }
}
```

**Verify:**
- Guest status updated to `staked` in database
- `stake_amount` and `stake_wallet_address` fields populated
- `stake_tx_hash` field populated

**Check Database:**
```sql
SELECT id, status, stake_amount, stake_wallet_address, stake_tx_hash
FROM guests
WHERE id = '<guestId>';
```

---

### Step 5: Check-in Attendee

**As Organizer:**

1. Navigate to event management: `/events/[eventId]/manage/guests`
2. Find the attendee with `staked` status
3. Click "Check In" or scan QR code
4. Confirm check-in

**Verify:**
- Guest status updated to `checked_in`
- Check-in timestamp recorded

**Check Database:**
```sql
SELECT id, status, checked_in_at
FROM guests
WHERE id = '<guestId>';
```

---

### Step 6: Release Stake (Automatic)

**The release should happen automatically via Inngest:**

When a ticket is checked in, the `onTicketCheckedIn` function should:
1. Detect the stake
2. Call `releaseStakeOnCheckIn()` from escrow service
3. Execute `release()` on contract
4. Update guest record with release tx hash

**Verify Release:**

**Option A: Check Inngest Dashboard**
- Check if `app/ticket_checked_in` event was processed
- Verify `consumer-ticket-checkin-escrow` function executed

**Option B: Manual Release (if automatic fails)**

Call the escrow service directly:

```typescript
import { releaseStakeOnCheckIn } from '@/lib/services/escrow.service';

const result = await releaseStakeOnCheckIn(
    eventId,
    guestId,
    attendeeWalletAddress
);

console.log(result);
// { success: true, txHash: "0x..." }
```

**Verify:**
- Transaction confirmed on Sepolia
- Organizer wallet received ETH
- Guest record updated with `refund_tx_hash` (reused for release tx)

**Check Contract:**
```typescript
const stakeInfo = await contract.getStake(eventIdHash, attendeeAddress);
// stakeInfo.status should be 2 (Released)
```

---

### Step 7: Verify Funds Released

**Check Organizer Wallet:**

1. Check organizer wallet balance before/after
2. Verify increase equals stake amount (minus gas)

**Check Contract State:**
```typescript
const contract = getEscrowContract(RPC_URL, 11155111);
const stakeInfo = await contract.getStake(eventIdHash, attendeeAddress);
console.log("Status:", stakeInfo.status); // Should be 2 (Released)
```

---

## Additional Test Scenarios

### Test 8: Refund Flow (Before Event)

**As Attendee:**

1. Stake ETH (as in Step 3)
2. Before event start time - 1 hour, call `refund()`:

```typescript
const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet);
const eventIdHash = hashEventId(eventId);

const tx = await contract.refund(eventIdHash);
await tx.wait();
```

**Verify:**
- ETH returned to attendee wallet
- Stake status is `Refunded` (3)
- Guest status can be updated to `refunded` via API

---

### Test 9: Forfeit Flow (No-Show)

**Setup:**
1. Create event with past start time
2. Stake ETH
3. Don't check in
4. Wait for event to end

**As Organizer:**

Call forfeit:

```typescript
import { forfeitStakeForNoShow } from '@/lib/services/escrow.service';

const result = await forfeitStakeForNoShow(
    eventId,
    guestId,
    attendeeWalletAddress
);
```

**Verify:**
- ETH sent to organizer wallet
- Stake status is `Forfeited` (4)
- Guest status updated to `forfeited`

---

## API Endpoints Reference

### GET /api/escrow/stake
Get stake info for an attendee

```bash
curl "http://localhost:3000/api/escrow/stake?eventId=<eventId>&walletAddress=<address>"
```

### POST /api/escrow/stake
Verify stake and update guest status

```bash
curl -X POST http://localhost:3000/api/escrow/stake \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "<eventId>",
    "walletAddress": "<address>",
    "txHash": "<txHash>",
    "guestId": "<guestId>"
  }'
```

---

## Troubleshooting

### Issue: "No active stake found on-chain"

**Possible Causes:**
- Transaction not confirmed yet (wait for confirmations)
- Wrong event ID hash
- Wrong wallet address
- Contract not deployed or wrong address

**Solution:**
- Verify transaction on Etherscan
- Check event ID hash matches: `hashEventId(eventId)`
- Verify contract address in env vars

### Issue: "Guest record not found"

**Possible Causes:**
- Guest not created yet
- Wrong `guestId` or `walletAddress` doesn't match

**Solution:**
- Create guest record first (register for event)
- Ensure `stake_wallet_address` matches staking wallet

### Issue: Release/Forfeit fails

**Possible Causes:**
- No signer key configured (`ESCROW_SIGNER_PRIVATE_KEY`)
- Wrong organizer address
- Event hasn't ended (for forfeit)
- Refund cutoff passed (for refund)

**Solution:**
- Set `ESCROW_SIGNER_PRIVATE_KEY` in env
- Verify organizer address matches contract
- Check event timing constraints

---

## Database Schema Reference

### Guests Table (relevant fields)
```sql
- id: UUID (guest ID)
- event_id: UUID
- user_id: UUID
- status: TEXT ('pending', 'approved', 'staked', 'checked_in', etc.)
- stake_amount: DECIMAL
- stake_wallet_address: TEXT
- stake_tx_hash: TEXT
- refund_tx_hash: TEXT (also used for release/forfeit tx)
- checked_in_at: TIMESTAMPTZ
- forfeited_at: TIMESTAMPTZ
```

---

## Contract Functions Reference

### stake(bytes32 eventId, address organizer, uint256 eventStartTime)
- Payable function
- Minimum: 0.001 ETH
- Emits `Staked` event

### release(bytes32 eventId, address attendee)
- Only organizer or owner
- Requires status `Staked`
- Emits `Released` event

### refund(bytes32 eventId)
- Only attendee
- Must be before event start - 1 hour
- Emits `Refunded` event

### forfeit(bytes32 eventId, address attendee)
- Only organizer or owner
- Event must have started
- Emits `Forfeited` event

---

## Test Checklist

- [ ] Event created successfully
- [ ] Attendee registered for event
- [ ] ETH staked on-chain (tx confirmed)
- [ ] Stake verified via API
- [ ] Guest status updated to `staked`
- [ ] Check-in successful
- [ ] Stake released to organizer
- [ ] Funds received in organizer wallet
- [ ] Refund flow works (before cutoff)
- [ ] Forfeit flow works (after event)
- [ ] All contract events emitted correctly
- [ ] Database records updated correctly

---

## Next Steps

1. Create automated test suite using Hardhat
2. Add frontend UI for staking
3. Add real-time stake status display
4. Add notifications for stake events
5. Add analytics dashboard for escrow stats
