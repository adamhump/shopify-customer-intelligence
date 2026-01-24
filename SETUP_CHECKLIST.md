# Setup Checklist - Print This Out!

Use this checklist while following DEPLOYMENT_GUIDE.md

---

## Part 1: Prepare Code (5 min)

- [ ] Clone/fork the repository
- [ ] Create GitHub repo at https://github.com/new
  - Name: `shopify-customer-intelligence`
  - Visibility: Private
- [ ] Push code to your GitHub repo
- [ ] Verify code appears on GitHub

---

## Part 2: Slack Webhook (5 min)

- [ ] Go to https://api.slack.com/apps
- [ ] Click "Create New App" > "From scratch"
- [ ] Name it "Customer Alerts"
- [ ] Select your workspace
- [ ] Click "Incoming Webhooks" in sidebar
- [ ] Toggle switch to ON
- [ ] Click "Add New Webhook to Workspace"
- [ ] Select channel (or create #customer-alerts)
- [ ] Click "Allow"
- [ ] Copy webhook URL and save it:
  ```
  ________________________________________________
  ```
- [ ] Test webhook with curl (optional)

---

## Part 3: API Keys (10 min)

### Claude API
- [ ] Go to https://console.anthropic.com/
- [ ] Sign up or log in
- [ ] Create API key
- [ ] Copy and save it:
  ```
  ________________________________________________
  ```

### Brave Search API
- [ ] Go to https://brave.com/search/api/
- [ ] Sign up for free account
- [ ] Copy API key and save it:
  ```
  ________________________________________________
  ```

---

## Part 4: Deploy to Railway (5 min)

### Create Account
- [ ] Go to https://railway.app/
- [ ] Click "Login" > "Login with GitHub"
- [ ] Authorize Railway

### Deploy
- [ ] Click "New Project"
- [ ] Select "Deploy from GitHub repo"
- [ ] Configure GitHub App if needed
- [ ] Select your `shopify-customer-intelligence` repo
- [ ] Wait for deployment

### Add Variables
- [ ] Click on your service
- [ ] Click "Variables" tab
- [ ] Add these variables:

**SLACK_WEBHOOK_URL**
- [ ] Value: Your Slack webhook URL
- [ ] Click "Add"

**ANTHROPIC_API_KEY**
- [ ] Value: Your Claude API key
- [ ] Click "Add"

**BRAVE_API_KEY**
- [ ] Value: Your Brave Search API key
- [ ] Click "Add"

**ONLY_NEW_CUSTOMERS**
- [ ] Value: `true`
- [ ] Click "Add"

**SHOPIFY_WEBHOOK_SECRET**
- [ ] Value: `temporary` (we'll update this)
- [ ] Click "Add"

**SHOPIFY_STORE_DOMAIN**
- [ ] Value: `your-store.myshopify.com`
- [ ] Click "Add"

**SHOPIFY_ADMIN_ACCESS_TOKEN**
- [ ] Value: (get from Shopify in Part 5)
- [ ] Click "Add"

### Get URL
- [ ] Click "Settings" tab
- [ ] Scroll to "Networking"
- [ ] Click "Generate Domain"
- [ ] Copy your Railway URL and save it:
  ```
  ________________________________________________
  ```
- [ ] Test by visiting: `https://YOUR-URL/health`
- [ ] Should see: `{"status":"healthy"}`

---

## Part 5: Shopify Setup (10 min)

### Create Admin App
- [ ] Go to Shopify Admin > Settings > Apps and sales channels
- [ ] Click "Develop apps"
- [ ] Click "Create an app"
- [ ] Name it "Customer Intelligence"
- [ ] Configure Admin API scopes > Enable `read_customers`
- [ ] Click "Install app"
- [ ] Copy Admin API access token:
  ```
  ________________________________________________
  ```
- [ ] Add token to Railway as `SHOPIFY_ADMIN_ACCESS_TOKEN`

### Create Webhook
- [ ] Go to Shopify Admin > Settings > Notifications
- [ ] Scroll to "Webhooks" section
- [ ] Click "Create webhook"
- [ ] Event: "Order creation"
- [ ] Format: "JSON"
- [ ] URL: Your Railway URL + `/webhooks/orders/create`
  ```
  https://________________________________/webhooks/orders/create
  ```
- [ ] Webhook API version: Latest
- [ ] Click "Save webhook"

### Get Signing Secret
- [ ] Click on the webhook you just created
- [ ] Reveal/copy the "Signing secret"
- [ ] Save it temporarily:
  ```
  ________________________________________________
  ```

### Update Railway
- [ ] Go back to Railway dashboard
- [ ] Click on your service > Variables
- [ ] Edit `SHOPIFY_WEBHOOK_SECRET`
- [ ] Replace `temporary` with your actual secret
- [ ] Click checkmark to save
- [ ] Wait for redeploy (~30 seconds)

### Verify
- [ ] Back in Shopify, check webhook status
- [ ] Should show green checkmark

---

## Part 6: Test Everything (5 min)

### Live Test
- [ ] Go to your Shopify store
- [ ] Add product to cart
- [ ] Complete checkout as new customer
- [ ] Check Slack channel for alert
- [ ] Verify enriched data appears

### Check Logs
If no alert appears:
- [ ] Go to Railway > Your service > Deployments
- [ ] View logs for errors
- [ ] Look for "Processing new customer" message

---

## Final Verification

- [ ] GitHub repo is private and secure
- [ ] Slack alerts are posting to correct channel
- [ ] Customer enrichment is working
- [ ] Shopify webhook is active
- [ ] Railway app is running (health check passes)
- [ ] All environment variables are set correctly
- [ ] Test order produced an alert
- [ ] No errors in Railway logs

---

## Save Your Credentials

**Important:** Save these somewhere secure (password manager, encrypted note):

**Slack Webhook URL:**
```
____________________________________________________________
```

**Claude API Key:**
```
____________________________________________________________
```

**Brave Search API Key:**
```
____________________________________________________________
```

**Railway URL:**
```
____________________________________________________________
```

**Shopify Webhook Secret:**
```
____________________________________________________________
```

**Shopify Admin Access Token:**
```
____________________________________________________________
```

---

## Monthly Monitoring

Set a reminder to check:
- [ ] Railway usage (should be under $10)
- [ ] Brave API quota
- [ ] Webhook is still active in Shopify
- [ ] Alerts are still posting correctly

---

## You're Done!

Your customer alerts are now live and running 24/7.

Total time spent: ~30 minutes
Monthly cost: ~$10-15
Customer insights: Priceless
