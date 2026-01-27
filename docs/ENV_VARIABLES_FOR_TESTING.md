# Environment Variables Required for Testing

## Overview

This document lists all environment variables required for testing PlanX, organized by priority and feature area.

---

## Quick Reference

### Minimum Required (Basic Testing)
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Full Testing Setup
See sections below for complete list organized by feature.

---

## 1. Core Application (Required)

### Supabase Configuration
```bash
# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase Anonymous Key (public, safe for client-side)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role Key (server-side only, keep secret!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: Supabase URL (for server-side, if different)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to get**: Supabase Dashboard → Project Settings → API

**Priority**: 🔴 **REQUIRED** - Application won't work without these

---

## 2. Background Jobs (Required for Full Testing)

### Inngest Configuration
```bash
# Inngest Event Key
INNGEST_EVENT_KEY=your-inngest-event-key

# Inngest Signing Key (for webhook verification)
INNGEST_SIGNING_KEY=your-inngest-signing-key
```

**Where to get**: Inngest Dashboard → Settings → Keys

**Priority**: 🔴 **REQUIRED** - Background jobs (emails, lifecycle transitions) won't work

**Note**: For local development, Inngest dev server runs automatically with `npm run dev:all`

---

## 3. Payment Processing

### Stripe (Test Mode)
```bash
# Stripe Publishable Key (public, safe for client-side)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Secret Key (server-side only, keep secret!)
STRIPE_SECRET_KEY=sk_test_...

# Stripe Webhook Secret (for webhook verification)
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Where to get**: Stripe Dashboard → Developers → API Keys

**Priority**: 🟡 **OPTIONAL** - Only needed for Stripe payment testing

**Test Cards**:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

---

## 4. Blockchain Payments

### Ethereum Configuration
```bash
# Ethereum RPC URL (Sepolia testnet)
ETH_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
# Or use Infura: https://sepolia.infura.io/v3/YOUR_KEY

# WalletConnect Project ID (for RainbowKit)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id
```

**Where to get**: 
- Alchemy: https://www.alchemy.com/ → Create App → Get API Key
- Infura: https://infura.io/ → Create Project → Get API Key
- WalletConnect: https://cloud.walletconnect.com/ → Create Project

**Priority**: 🟡 **OPTIONAL** - Only needed for Ethereum payment testing

---

### Solana Configuration
```bash
# Solana RPC URL (Devnet for testing)
SOLANA_RPC_URL=https://api.devnet.solana.com
# Or use custom RPC: https://api.devnet.solana.com

# Platform wallet address for receiving SOL payments
NEXT_PUBLIC_SOLANA_WALLET_ADDRESS=your-solana-wallet-address
```

**Where to get**: 
- Public RPC: Use `https://api.devnet.solana.com` (free, rate-limited)
- Custom RPC: Create account at https://www.quicknode.com/ or similar

**Priority**: 🟡 **OPTIONAL** - Only needed for Solana payment testing

---

## 5. Escrow System (Required for Escrow Testing)

### Ethereum Escrow
```bash
# Deployed EventEscrow contract address
NEXT_PUBLIC_ESCROW_ADDRESS=0x...

# Organizer's private key (for releasing/forfeiting stakes)
# ⚠️ SECURITY: Never commit this to git! Use .env.local
ESCROW_SIGNER_PRIVATE_KEY=0x...

# Ethereum RPC URL (same as above)
ETH_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

**Where to get**: 
- Contract Address: After deploying EventEscrow.sol to Sepolia
- Private Key: From MetaMask or wallet (organizer's wallet)

**Priority**: 🟡 **OPTIONAL** - Only needed for escrow staking testing

**Security Note**: 
- ⚠️ **NEVER** commit private keys to git
- Use `.env.local` (already in `.gitignore`)
- Use test wallets only, never production keys

---

## 6. Email Sending (Optional)

### Resend Configuration
```bash
# Resend API Key
RESEND_API_KEY=re_...

# From Email Address
FROM_EMAIL=noreply@yourdomain.com
```

**Where to get**: Resend Dashboard → API Keys → Create API Key

**Priority**: 🟢 **OPTIONAL** - Only needed for invitation email testing

**Note**: Without this, invitations will be created but emails won't send

---

## 7. Search Engine (Optional)

### Meilisearch Configuration
```bash
# Meilisearch URL (local or hosted)
MEILISEARCH_URL=http://localhost:7700
# Or hosted: https://your-instance.meilisearch.com

# Meilisearch Master Key
MEILISEARCH_MASTER_KEY=your-master-key
```

**Where to get**: 
- Local: Install Meilisearch locally or use Docker
- Hosted: https://www.meilisearch.com/cloud

**Priority**: 🟢 **OPTIONAL** - Only needed for search functionality testing

**Note**: Without this, search will fall back to database queries (slower)

---

## 8. Authentication (Optional)

### Google OAuth
```bash
# Google OAuth Client ID
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Google OAuth Client Secret
GOOGLE_CLIENT_SECRET=your-client-secret
```

**Where to get**: Google Cloud Console → APIs & Services → Credentials

**Priority**: 🟢 **OPTIONAL** - Only needed for Google OAuth testing

**Note**: Supabase handles OAuth, configure in Supabase Dashboard → Authentication → Providers

---

## 9. Application URLs

### App Configuration
```bash
# Application URL (for redirects, callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Production: https://yourdomain.com
```

**Priority**: 🟡 **RECOMMENDED** - Needed for OAuth callbacks and email links

---

## 10. Testing-Specific Variables

### For Automated Test Scripts
```bash
# Test Event ID (UUID of test event)
TEST_EVENT_ID=uuid-of-test-event

# Test Guest ID (UUID of test guest/ticket)
TEST_GUEST_ID=uuid-of-test-guest

# Test Organizer Private Key (for escrow testing)
TEST_ORGANIZER_KEY=0x...

# Test Attendee Private Key (for escrow testing)
TEST_ATTENDEE_KEY=0x...

# API Base URL (for test scripts)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**Priority**: 🟢 **OPTIONAL** - Only needed for automated test scripts

**Note**: These are used by `test-escrow-flow.ts` and `test-e2e-flow.sh`

---

## 11. Smart Contract Deployment (For Escrow)

### Hardhat Configuration (contracts/.env)
```bash
# Sepolia RPC URL
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Deployer Private Key (for contract deployment)
DEPLOYER_PRIVATE_KEY=0x...

# Etherscan API Key (for contract verification)
ETHERSCAN_API_KEY=your-etherscan-api-key
```

**Where to get**: 
- RPC: Same as ETH_RPC_URL above
- Etherscan: https://etherscan.io/apis → Create API Key

**Priority**: 🟡 **OPTIONAL** - Only needed for deploying contracts

---

## Complete .env.local Template

```bash
# ============================================
# CORE APPLICATION (REQUIRED)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ============================================
# BACKGROUND JOBS (REQUIRED)
# ============================================
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key

# ============================================
# PAYMENT PROCESSING (OPTIONAL)
# ============================================
# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Ethereum
ETH_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-project-id

# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_WALLET_ADDRESS=your-wallet-address

# ============================================
# ESCROW SYSTEM (OPTIONAL - For Escrow Testing)
# ============================================
NEXT_PUBLIC_ESCROW_ADDRESS=0x...
ESCROW_SIGNER_PRIVATE_KEY=0x... # ⚠️ Keep secret!

# ============================================
# EMAIL (OPTIONAL)
# ============================================
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@yourdomain.com

# ============================================
# SEARCH (OPTIONAL)
# ============================================
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_MASTER_KEY=masterKey

# ============================================
# AUTHENTICATION (OPTIONAL)
# ============================================
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# ============================================
# APPLICATION CONFIG (RECOMMENDED)
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ============================================
# TESTING (OPTIONAL - For Test Scripts)
# ============================================
TEST_EVENT_ID=uuid-of-test-event
TEST_GUEST_ID=uuid-of-test-guest
TEST_ORGANIZER_KEY=0x...
TEST_ATTENDEE_KEY=0x...
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## Priority Guide

### 🔴 Critical (App Won't Work Without)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 🟡 Important (Required for Specific Features)
- `INNGEST_EVENT_KEY` & `INNGEST_SIGNING_KEY` - Background jobs
- `ETH_RPC_URL` - Ethereum payments/escrow
- `NEXT_PUBLIC_ESCROW_ADDRESS` & `ESCROW_SIGNER_PRIVATE_KEY` - Escrow testing
- `STRIPE_SECRET_KEY` - Stripe payments
- `SOLANA_RPC_URL` - Solana payments

### 🟢 Optional (Nice to Have)
- `RESEND_API_KEY` - Email sending
- `MEILISEARCH_URL` - Search functionality
- `GOOGLE_CLIENT_ID` - Google OAuth
- `TEST_*` variables - Automated testing

---

## Testing Scenarios & Required Variables

### Scenario 1: Basic Event Management
**Required**:
- Supabase variables (all 3)
- Inngest variables (for lifecycle transitions)

### Scenario 2: Registration/RSVP
**Required**:
- Supabase variables
- Inngest variables

### Scenario 3: Stripe Payment
**Required**:
- Supabase variables
- Inngest variables
- Stripe variables (all 3)

### Scenario 4: Solana Payment
**Required**:
- Supabase variables
- Inngest variables
- `SOLANA_RPC_URL`
- `NEXT_PUBLIC_SOLANA_WALLET_ADDRESS`

### Scenario 5: Ethereum Payment
**Required**:
- Supabase variables
- Inngest variables
- `ETH_RPC_URL`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`

### Scenario 6: Escrow Staking
**Required**:
- Supabase variables
- Inngest variables
- `ETH_RPC_URL`
- `NEXT_PUBLIC_ESCROW_ADDRESS`
- `ESCROW_SIGNER_PRIVATE_KEY`
- `TEST_EVENT_ID`, `TEST_GUEST_ID`, `TEST_ORGANIZER_KEY`, `TEST_ATTENDEE_KEY` (for automated tests)

### Scenario 7: Invitations
**Required**:
- Supabase variables
- Inngest variables
- `RESEND_API_KEY` (for email sending)

### Scenario 8: Search
**Required**:
- Supabase variables
- `MEILISEARCH_URL`
- `MEILISEARCH_MASTER_KEY`

---

## Setup Checklist

### Initial Setup
- [ ] Create `.env.local` file
- [ ] Add Supabase variables (required)
- [ ] Add Inngest variables (required)
- [ ] Verify `.env.local` is in `.gitignore`

### Payment Testing Setup
- [ ] Add Stripe variables (for Stripe testing)
- [ ] Add Ethereum RPC URL (for ETH/escrow testing)
- [ ] Add Solana RPC URL (for SOL testing)
- [ ] Add WalletConnect Project ID (for ETH wallet connection)

### Escrow Testing Setup
- [ ] Deploy EventEscrow contract to Sepolia
- [ ] Add `NEXT_PUBLIC_ESCROW_ADDRESS`
- [ ] Add `ESCROW_SIGNER_PRIVATE_KEY` (organizer's key)
- [ ] Add test variables (`TEST_EVENT_ID`, etc.)

### Optional Features
- [ ] Add Resend API key (for emails)
- [ ] Add Meilisearch variables (for search)
- [ ] Add Google OAuth (for Google login)

---

## Security Best Practices

### ⚠️ Never Commit Secrets
- ✅ Use `.env.local` (already in `.gitignore`)
- ❌ Never commit `.env` or `.env.local` to git
- ✅ Use test/development keys only
- ❌ Never use production keys in development

### 🔐 Private Keys
- ⚠️ `ESCROW_SIGNER_PRIVATE_KEY` - Keep secret!
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY` - Keep secret!
- ⚠️ `STRIPE_SECRET_KEY` - Keep secret!
- ⚠️ `DEPLOYER_PRIVATE_KEY` - Keep secret!

### ✅ Safe to Commit (Public Keys)
- ✅ `NEXT_PUBLIC_*` variables are safe (they're public)
- ✅ RPC URLs are safe (public endpoints)
- ✅ Contract addresses are safe (public on blockchain)

---

## Verification

### Check Environment Variables
```bash
# Using the test script
./test-e2e-flow.sh check-env

# Or manually
node -e "console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

### Test Connections
```bash
# Test Supabase connection
curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

# Test Inngest (if running locally)
curl http://localhost:8288/api/health

# Test Meilisearch (if running locally)
curl http://localhost:7700/health
```

---

## Troubleshooting

### "Missing Supabase environment variables"
- Check `.env.local` exists
- Verify variable names are correct (case-sensitive)
- Restart dev server after adding variables

### "Inngest functions not running"
- Check `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are set
- Run `npm run dev:all` (not just `npm run dev`)
- Check Inngest dashboard at http://localhost:8288

### "Payment verification failed"
- Check RPC URL is correct
- Verify transaction has enough confirmations (3+ blocks)
- Check transaction hash is valid

### "Escrow release not happening"
- Verify `ESCROW_SIGNER_PRIVATE_KEY` is set
- Check Inngest is running
- Verify organizer address matches contract
- Check Inngest dashboard for errors

---

## Quick Start Commands

```bash
# 1. Copy template
cp .env.example .env.local  # If you have a template

# 2. Edit .env.local with your values
nano .env.local  # or use your preferred editor

# 3. Verify variables are loaded
npm run dev  # Check console for warnings

# 4. Test with helper script
./test-e2e-flow.sh check-env
```

---

## Additional Resources

- **E2E Testing Guide**: `E2E_TESTING_GUIDE.md`
- **Escrow Testing**: `ESCROW_TESTING_GUIDE.md`
- **Quick Start**: `ESCROW_QUICK_START.md`
- **Product Analysis**: `PRODUCT_ANALYSIS.md`
