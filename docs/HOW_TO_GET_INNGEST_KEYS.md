# How to Get Inngest Keys

## Overview

Inngest is used for background job processing (emails, event lifecycle transitions, reminders, etc.). The setup differs between local development and production.

---

## Local Development (No Keys Required!)

### Good News! 🎉

For **local development**, you **don't need Inngest keys**. The Inngest dev server runs automatically and doesn't require authentication.

### Setup for Local Development

1. **Start the dev server with Inngest**:
   ```bash
   npm run dev:all
   ```

2. **Access Inngest Dashboard**:
   - Open: http://localhost:8288
   - No login required for local dev
   - View function executions, logs, and events

3. **No environment variables needed**:
   - You can skip `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` for local testing
   - The dev server handles everything automatically

---

## Production/Cloud Deployment (Keys Required)

If you're deploying to production or using Inngest Cloud, you'll need to get keys.

### Step 1: Create Inngest Account

1. Go to https://www.inngest.com/
2. Click **"Sign Up"** or **"Get Started"**
3. Sign up with:
   - Email
   - GitHub (recommended)
   - Google

### Step 2: Sync Your App

Based on your dashboard, you need to sync your first Inngest app:

1. **Click "Get started"** or **"+ Sync new app"** button (top right)
2. **Follow the setup wizard**:
   - It will guide you through creating and syncing your app
   - Your app functions are already defined in `src/app/api/inngest/route.ts`

3. **For Local Development First** (Recommended):
   - Run `npm run dev:all` in your terminal
   - This starts the Inngest Dev Server locally
   - The app will automatically sync when you start your Next.js server
   - Access local dashboard at http://localhost:8288

4. **For Production Sync**:
   - Make sure your app is deployed and accessible
   - Inngest will discover your functions from the `/api/inngest` endpoint
   - Your app will appear in the dashboard once synced

### Step 3: Get Your Keys

After your app is synced, get your keys:

1. **Navigate to Integrations** (left sidebar):
   - Click on **"Integrations"** in the sidebar
   - Or go to your app settings

2. **Find Your Keys**:
   - **Event Key** (`INNGEST_EVENT_KEY`): Used to send events to Inngest
   - **Signing Key** (`INNGEST_SIGNING_KEY`): Used to verify webhook signatures
   - These are usually found in the app's settings or integrations page

3. **Alternative: Check App Settings**:
   - Click on your synced app
   - Look for **"Settings"** or **"Configuration"**
   - Keys should be listed there

4. **Copy the Keys**:
   ```
   Event Key: inngest_evt_xxxxxxxxxxxxx
   Signing Key: signkey-xxxxxxxxxxxxx
   ```

### Step 4: Add Keys to Environment

Add to your `.env.local` (for local testing with cloud) or production environment:

```bash
# Inngest Configuration
INNGEST_EVENT_KEY=inngest_evt_xxxxxxxxxxxxx
INNGEST_SIGNING_KEY=signkey-xxxxxxxxxxxxx
```

---

## Alternative: Using Inngest Cloud for Local Testing

If you want to test with Inngest Cloud (instead of local dev server):

### Option 1: Use Inngest Cloud Dashboard

1. Get your keys from Inngest dashboard (as above)
2. Add keys to `.env.local`
3. Run: `npm run dev` (not `dev:all`)
4. Inngest will connect to cloud instead of local dev server

### Option 2: Use Inngest Dev Server (Recommended)

1. **Don't set** `INNGEST_EVENT_KEY` or `INNGEST_SIGNING_KEY`
2. Run: `npm run dev:all`
3. Local dev server runs automatically
4. Access dashboard at http://localhost:8288

---

## Verifying Your Setup

### Check if Inngest is Running

```bash
# Check local dev server
curl http://localhost:8288/api/health

# Should return: {"status":"ok"}
```

### Check Environment Variables

```bash
# Using the test script
./test-e2e-flow.sh check-inngest

# Or manually
node -e "console.log('Inngest Event Key:', process.env.INNGEST_EVENT_KEY ? 'Set' : 'Not set')"
```

### Test Inngest Functions

1. **Start dev server**:
   ```bash
   npm run dev:all
   ```

2. **Open Inngest Dashboard**:
   - http://localhost:8288

3. **Trigger a test event**:
   - Create an event and publish it
   - Check dashboard for function executions
   - Look for `eventStartJob`, `sendInviteEmail`, etc.

---

## Troubleshooting

### "Inngest functions not running"

**Local Development**:
- ✅ Make sure you're running `npm run dev:all` (not just `npm run dev`)
- ✅ Check Inngest dashboard at http://localhost:8288
- ✅ Verify functions are registered (should see list of functions)

**Production**:
- ✅ Check `INNGEST_EVENT_KEY` is set correctly
- ✅ Check `INNGEST_SIGNING_KEY` is set correctly
- ✅ Verify keys are from the correct Inngest app
- ✅ Check Inngest Cloud dashboard for errors

### "Cannot connect to Inngest"

**Local**:
- Check if port 8288 is available
- Try: `lsof -i :8288` to see if port is in use
- Restart: `npm run dev:all`

**Cloud**:
- Verify internet connection
- Check Inngest Cloud status: https://status.inngest.com/
- Verify keys are correct

### "Functions not appearing in dashboard"

- Make sure functions are exported in `src/app/api/inngest/route.ts`
- Restart dev server
- Check browser console for errors
- Verify Inngest client is initialized correctly

---

## Inngest Dashboard Features

### Local Dev Dashboard (http://localhost:8288)

- **Functions**: View all registered functions
- **Events**: See events being sent/received
- **Runs**: View function execution history
- **Logs**: Check function logs and errors
- **Replay**: Replay failed function runs

### Cloud Dashboard (https://app.inngest.com/)

- Same features as local dashboard
- **Analytics**: Function performance metrics
- **Alerts**: Set up alerts for failures
- **Teams**: Collaborate with team members
- **Environments**: Manage dev/staging/prod

---

## Key Types Explained

### Event Key (`INNGEST_EVENT_KEY`)

- **Purpose**: Authenticates your app when sending events to Inngest
- **Format**: `inngest_evt_xxxxxxxxxxxxx`
- **Usage**: Used by `inngest.send()` calls
- **Security**: Can be public (used client-side or server-side)

### Signing Key (`INNGEST_SIGNING_KEY`)

- **Purpose**: Verifies webhook signatures from Inngest
- **Format**: `signkey-xxxxxxxxxxxxx`
- **Usage**: Used by Inngest SDK to verify requests
- **Security**: Keep secret (server-side only)

---

## Quick Reference

### For Local Development
```bash
# No keys needed!
npm run dev:all
# Access dashboard at http://localhost:8288
# App will auto-sync when server starts
```

### For Production
```bash
# 1. Sync your app first (click "+ Sync new app" in dashboard)
# 2. Get keys from Integrations or App Settings
# 3. Add to environment:
INNGEST_EVENT_KEY=inngest_evt_xxxxx
INNGEST_SIGNING_KEY=signkey-xxxxx
```

## Step-by-Step: Getting Keys from Dashboard

Based on your current dashboard view:

1. **First, sync your app**:
   - Click **"+ Sync new app"** (top right) or **"Get started"** button
   - Or run `npm run dev:all` locally first to test

2. **After app is synced**:
   - Click on **"Integrations"** in the left sidebar (you can see it in your dashboard)
   - Or click on your app name → Settings
   - Look for **"API Keys"** or **"Keys"** section

3. **Copy the keys**:
   - Event Key → `INNGEST_EVENT_KEY`
   - Signing Key → `INNGEST_SIGNING_KEY`

4. **Add to `.env.local`**:
   ```bash
   INNGEST_EVENT_KEY=your-event-key-here
   INNGEST_SIGNING_KEY=your-signing-key-here
   ```

### Check Setup
```bash
# Test local dev server
curl http://localhost:8288/api/health

# Test with helper script
./test-e2e-flow.sh check-inngest
```

---

## Additional Resources

- **Inngest Docs**: https://www.inngest.com/docs
- **Inngest Dashboard**: https://app.inngest.com/
- **Inngest Status**: https://status.inngest.com/
- **Getting Started Guide**: https://www.inngest.com/docs/getting-started

---

## Summary

### Local Development ✅
- **No keys needed**
- Run `npm run dev:all`
- Access dashboard at http://localhost:8288
- Everything works automatically!

### Production/Cloud 🌐
- **Keys required**
- Sign up at https://www.inngest.com/
- Get keys from Settings → Keys
- Add to environment variables
- Deploy and test!

---

## Next Steps

1. **For local testing**: Just run `npm run dev:all` - no keys needed!
2. **For production**: Sign up at Inngest, get keys, add to `.env.local`
3. **Verify**: Check dashboard and test function executions
4. **Monitor**: Use dashboard to monitor function runs and debug issues
