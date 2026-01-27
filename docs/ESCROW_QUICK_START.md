# Quick Start: Testing Escrow Flow

## Prerequisites Checklist

- [ ] Contract deployed to Sepolia: `NEXT_PUBLIC_ESCROW_ADDRESS` set
- [ ] RPC URL configured: `ETH_RPC_URL` set (Alchemy/Infura)
- [ ] Signer key set: `ESCROW_SIGNER_PRIVATE_KEY` (organizer's private key)
- [ ] Test wallets funded with Sepolia ETH
- [ ] Next.js app running: `npm run dev`

## Quick Test (5 minutes)

### 1. Create Event
```bash
# Navigate to http://localhost:3000/create-event
# Create event with future date (2+ hours from now)
# Note the eventId from URL
```

### 2. Register for Event
```bash
# Navigate to http://localhost:3000/events/[eventId]
# Click RSVP/Register
# Note the guestId (check database or network tab)
```

### 3. Stake ETH (Using Test Script)
```bash
# Set environment variables
export TEST_EVENT_ID="<your-event-id>"
export TEST_GUEST_ID="<your-guest-id>"
export TEST_ORGANIZER_KEY="<organizer-private-key>"
export TEST_ATTENDEE_KEY="<attendee-private-key>"

# Run test script
npx tsx test-escrow-flow.ts
```

### 4. Verify Stake
```bash
# Check API response
curl "http://localhost:3000/api/escrow/stake?eventId=<eventId>&walletAddress=<attendee-address>"
```

### 5. Check-in & Release
```bash
# Use check-in API (or UI)
curl -X POST http://localhost:3000/api/checkin \
  -H "Content-Type: application/json" \
  -d '{
    "qrToken": "<qr-token>",
    "eventId": "<eventId>"
  }'

# Verify release happened (check Inngest dashboard or contract)
```

## Manual Testing Steps

### Step 1: Stake via Contract (Hardhat Console)

```bash
cd contracts
npx hardhat console --network sepolia

# In console:
const EventEscrow = await ethers.getContractFactory("EventEscrow");
const escrow = await EventEscrow.attach(process.env.NEXT_PUBLIC_ESCROW_ADDRESS);

const eventId = "<your-event-id>";
const eventIdHash = ethers.keccak256(ethers.toUtf8Bytes(eventId));
const organizer = "<organizer-address>";
const eventStartTime = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now
const stakeAmount = ethers.parseEther("0.001");

const tx = await escrow.stake(eventIdHash, organizer, eventStartTime, { value: stakeAmount });
await tx.wait();
console.log("Staked:", tx.hash);
```

### Step 2: Verify Stake API

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

### Step 3: Check-in (Triggers Release)

The check-in should automatically trigger the escrow release via Inngest. Verify:

1. Check Inngest dashboard for `app/ticket_checked_in` event
2. Verify `consumer-ticket-checkin-escrow` function executed
3. Check contract: stake status should be `Released` (2)
4. Check organizer wallet: balance should increase

## Environment Variables Template

```bash
# .env.local
NEXT_PUBLIC_ESCROW_ADDRESS=0x...
ETH_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ESCROW_SIGNER_PRIVATE_KEY=0x... # Organizer's private key

# For testing script
TEST_EVENT_ID=...
TEST_GUEST_ID=...
TEST_ORGANIZER_KEY=0x...
TEST_ATTENDEE_KEY=0x...
```

## Common Issues

### "No active stake found on-chain"
- Wait for transaction confirmations (3+ blocks)
- Verify event ID hash matches
- Check contract address is correct

### "Guest record not found"
- Register for event first
- Ensure `stake_wallet_address` matches staking wallet

### Release not happening
- Check `ESCROW_SIGNER_PRIVATE_KEY` is set
- Verify Inngest is running: `npm run dev:all`
- Check Inngest dashboard for errors

## Next Steps

1. **Add Frontend Staking UI**: Create component for users to stake directly
2. **Real-time Updates**: Show stake status in real-time
3. **Notifications**: Notify on stake/release/refund events
4. **Analytics**: Track escrow stats in dashboard
