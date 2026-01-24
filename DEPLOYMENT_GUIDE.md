# Complete Deployment Guide

This guide will walk you through every step to get your customer alerts running. Expected time: 20-30 minutes.

---

## Accounts You'll Need

1. **GitHub** (free) - To host your code
2. **Railway** (free) - To host your application
3. **Anthropic** (pay-as-you-go) - For Claude AI
4. **Brave** (free tier) - For web search
5. **Slack** (free) - For notifications
6. **Shopify Admin Access** - To configure webhooks

---

## Part 1: Prepare Your Code (5 minutes)

### Step 1.1: Clone or Fork the Repository

```bash
git clone https://github.com/yourusername/shopify-customer-intelligence.git
cd shopify-customer-intelligence
```

### Step 1.2: Create Your Own GitHub Repository

1. Go to https://github.com/new
2. Repository name: `shopify-customer-intelligence`
3. Description: `Shopify customer alerts with AI enrichment`
4. Visibility: **Private** (recommended)
5. Do NOT initialize with README (you already have files)
6. Click **Create repository**

### Step 1.3: Push to GitHub

```bash
# Set your remote
git remote set-url origin https://github.com/YOUR_USERNAME/shopify-customer-intelligence.git
git branch -M main
git push -u origin main
```

**Important**: Make sure `.env` is in `.gitignore` (it already is) so you don't commit secrets!

---

## Part 2: Set Up Slack Webhook (5 minutes)

### Step 2.1: Create Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"**
3. Select **"From scratch"**
4. App Name: `Customer Alerts`
5. Pick your workspace
6. Click **"Create App"**

### Step 2.2: Enable Incoming Webhooks

1. In the left sidebar, click **"Incoming Webhooks"**
2. Toggle the switch to **ON** (top right)
3. Scroll down and click **"Add New Webhook to Workspace"**
4. Select the channel where you want alerts (e.g., `#customer-alerts`)
   - If the channel doesn't exist, create it first in Slack
5. Click **"Allow"**

### Step 2.3: Copy Webhook URL

1. You'll see a webhook URL like:
   ```
   https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
   ```
2. **Copy this URL** - you'll need it later for Railway
3. Keep this tab open or save the URL somewhere safe

### Step 2.4: Test Your Webhook (Optional)

```bash
curl -X POST -H 'Content-type: application/json' \
--data '{"text":"Test from Customer Intelligence!"}' \
YOUR_WEBHOOK_URL_HERE
```

You should see a message appear in your Slack channel!

---

## Part 3: Get API Keys (10 minutes)

### Step 3.1: Anthropic Claude API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Go to **API Keys** section
4. Click **Create Key**
5. Copy the key (starts with `sk-ant-`)
6. Save it securely

### Step 3.2: Brave Search API Key

1. Go to https://brave.com/search/api/
2. Sign up for a free account
3. Navigate to your dashboard
4. Copy your API key
5. Free tier: 2,000 queries/month

---

## Part 4: Deploy to Railway (5 minutes)

### Step 4.1: Create Railway Account

1. Go to https://railway.app/
2. Click **"Login"** (top right)
3. Select **"Login with GitHub"**
4. Authorize Railway to access your GitHub account
5. You'll get $5 free credit per month (enough for this project)

### Step 4.2: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. If prompted, click **"Configure GitHub App"**
4. Select **"Only select repositories"**
5. Choose your `shopify-customer-intelligence` repository
6. Click **"Install & Authorize"**
7. Back in Railway, select your repo
8. Click on it to deploy

Railway will now start deploying your app!

### Step 4.3: Add Environment Variables

1. In your Railway project dashboard, click on your service
2. Click the **"Variables"** tab
3. Click **"+ New Variable"**
4. Add these variables one by one:

| Variable | Value |
|----------|-------|
| `SLACK_WEBHOOK_URL` | Your Slack webhook URL |
| `ANTHROPIC_API_KEY` | Your Claude API key |
| `BRAVE_API_KEY` | Your Brave Search API key |
| `ONLY_NEW_CUSTOMERS` | `true` |
| `SHOPIFY_WEBHOOK_SECRET` | `temporary` (update later) |
| `SHOPIFY_STORE_DOMAIN` | `your-store.myshopify.com` |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | Your Shopify token (get in Part 5) |

### Step 4.4: Get Your Railway URL

1. Click the **"Settings"** tab
2. Scroll down to **"Networking"**
3. Under "Public Networking", click **"Generate Domain"**
4. Railway will generate a URL like: `your-app-production.up.railway.app`
5. **Copy this URL** - you'll need it for Shopify
6. Test it by visiting: `https://your-app-production.up.railway.app/health`
   - You should see: `{"status":"healthy"}`

---

## Part 5: Configure Shopify (10 minutes)

### Step 5.1: Create Shopify Admin App

1. Go to Shopify Admin > Settings > Apps and sales channels
2. Click "Develop apps" at the top
3. Click "Allow custom app development" if prompted
4. Click "Create an app"
5. Name it "Customer Intelligence"
6. Click "Configure Admin API scopes"
7. Enable these scopes:
   - `read_customers` (required)
   - `read_orders` (optional, for future use)
8. Click "Save"
9. Click "Install app"
10. Click "Reveal token once" and copy the Admin API access token
11. **Add this token to Railway** as `SHOPIFY_ADMIN_ACCESS_TOKEN`

### Step 5.2: Create Webhook

1. Go to Shopify Admin > Settings > Notifications
2. Scroll down to the **"Webhooks"** section at the bottom
3. Click **"Create webhook"**
4. Fill out the form:
   - **Event**: Select **"Order creation"**
   - **Format**: Select **"JSON"**
   - **URL**: Enter your Railway URL with the endpoint:
     ```
     https://your-app-production.up.railway.app/webhooks/orders/create
     ```
   - **Webhook API version**: Select the latest version
5. Click **"Save webhook"**

### Step 5.3: Get Webhook Signing Secret

1. After saving, click on the webhook you just created
2. You'll see a field called **"Signing secret"**
3. Click to reveal/copy the signing secret
4. **Update Railway** with the real `SHOPIFY_WEBHOOK_SECRET`

Railway will automatically redeploy with the new variable.

---

## Part 6: Test Everything (5 minutes)

### Step 6.1: Place a Test Order

1. Go to your Shopify store
2. Add a product to cart
3. Use a new email address (to trigger "new customer" logic)
4. Complete the checkout
5. Within seconds, you should see an alert in your Slack channel!

### Step 6.2: Check Railway Logs

If you don't see the alert:

1. Go to Railway dashboard
2. Click on your service
3. Click the **"Deployments"** tab
4. Click on the latest deployment
5. View the logs to see what happened

Look for:
- `Processing new customer: [Name]`
- `Enriching data for: [Name]`
- `Slack notification sent successfully`

---

## Part 7: Troubleshooting

### No Slack Alert Appearing

**Check 1: Is Railway running?**
- Visit: `https://your-app.railway.app/health`
- Should return: `{"status":"healthy"}`

**Check 2: Check Shopify webhook status**
- Go to Shopify > Settings > Notifications > Webhooks
- Click on your webhook
- Check for any error messages

**Check 3: Check Railway logs**
- Railway dashboard > Your service > Deployments > View logs

**Check 4: Verify environment variables**
- Railway dashboard > Your service > Variables
- Make sure all variables are set correctly

### Enrichment Not Working

**Check API keys:**
- Verify `ANTHROPIC_API_KEY` is correct
- Verify `BRAVE_API_KEY` is correct
- Check you haven't exceeded free tier limits

---

## Summary Checklist

Before going live, verify:

- [ ] GitHub repo created and code pushed
- [ ] Slack webhook created and URL saved
- [ ] Claude API key obtained
- [ ] Brave Search API key obtained
- [ ] Railway project deployed
- [ ] All environment variables set in Railway
- [ ] Railway URL generated and tested
- [ ] Shopify Admin app created with `read_customers` scope
- [ ] Shopify webhook created and active
- [ ] Shopify signing secret added to Railway
- [ ] Test order placed successfully
- [ ] Slack alert received with enriched data

---

## Congratulations!

Your customer intelligence agent is now live. Every time a new customer places an order, you'll get a detailed alert in Slack with their enriched information.

The system will:
- Run 24/7 automatically
- Cost ~$10-15/month for typical usage
- Enrich every customer with public data
- Alert your team instantly
- Show confidence levels for transparency
