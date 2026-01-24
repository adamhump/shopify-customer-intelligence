# Quick Start Guide

Get your customer alerts running in 5 minutes.

## Step 1: Set Up Slack (2 minutes)

1. Go to https://api.slack.com/apps
2. Click "Create New App" > "From scratch"
3. Name it "Customer Alerts"
4. Select your workspace
5. Click "Incoming Webhooks" in the sidebar
6. Toggle "Activate Incoming Webhooks" to ON
7. Click "Add New Webhook to Workspace"
8. Select the channel (e.g., #customer-alerts)
9. Copy the webhook URL (starts with `https://hooks.slack.com/services/...`)

## Step 2: Get API Keys (3 minutes)

**Claude API Key (Required)**
1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Go to API Keys
4. Create a new key and copy it

**Brave Search API Key (Required)**
1. Go to https://brave.com/search/api/
2. Sign up for free account
3. Copy your API key
4. Free tier: 2,000 searches/month

## Step 3: Install & Configure

```bash
# Clone the repo
git clone https://github.com/yourusername/shopify-customer-intelligence.git
cd shopify-customer-intelligence

# Install dependencies
npm install

# Copy example env file
cp .env.example .env

# Edit .env file with your credentials
nano .env
```

Add your credentials:
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
ANTHROPIC_API_KEY=sk-ant-your-key-here
BRAVE_API_KEY=your_brave_api_key_here
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_your_token_here
```

## Step 4: Test Locally

```bash
# Start the server
npm run dev
```

You should see:
```
Customer Intelligence agent running on port 3000
Webhook endpoint: http://localhost:3000/webhooks/orders/create
```

## Step 5: Deploy to Railway (Free & Easy)

1. Push your code to GitHub (don't commit .env!)
2. Go to https://railway.app
3. Sign in with GitHub
4. Click "New Project" > "Deploy from GitHub repo"
5. Select your repo
6. Add environment variables:
   - Click on the deployment
   - Go to "Variables" tab
   - Add all variables from your .env file

7. Railway will give you a URL like: `https://your-app.railway.app`

## Step 6: Configure Shopify Webhook

1. Go to your Shopify admin
2. Settings > Notifications
3. Scroll to "Webhooks" section
4. Click "Create webhook"
5. Set:
   - **Event**: Order creation
   - **Format**: JSON
   - **URL**: `https://your-app.railway.app/webhooks/orders/create`
6. Click "Save"

## Step 7: Create Shopify Admin App

To verify new customers, you need Admin API access:

1. Shopify Admin > Settings > Apps and sales channels
2. Click "Develop apps"
3. Click "Create an app"
4. Name it "Customer Intelligence"
5. Configure Admin API scopes:
   - Enable `read_customers`
6. Install the app
7. Copy the Admin API access token
8. Add to Railway environment variables

## Step 8: Test with Real Order

Place a test order on your Shopify store and watch your Slack channel!

## Troubleshooting

**Not receiving alerts?**
- Check Railway logs for errors
- Verify Shopify webhook is active
- Make sure all environment variables are set

**No enriched data?**
- Check ANTHROPIC_API_KEY is valid
- Check BRAVE_API_KEY is valid
- Verify you have API quota remaining

**Need help?**
- Check the logs in Railway dashboard
- Review TROUBLESHOOTING.md
- Verify all environment variables are set

## Next Steps

- Customize the alert format in `index.js`
- Add more data sources in `enrichment.js`
- Set up monitoring and alerts
- Review privacy compliance

## Cost Estimate

**Free/Low-Cost Setup:**
- Railway: ~$5/month for small apps
- Brave Search: Free 2,000 queries/month
- Claude API: Pay-as-you-go (~$3-5/month for 400 customers)
- Slack: Free

Most small stores can run this for under $15/month!
