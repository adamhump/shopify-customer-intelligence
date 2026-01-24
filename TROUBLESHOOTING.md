# Troubleshooting Guide

Common issues and how to fix them.

---

## Issue: No Slack Alerts Appearing

### Symptom
You placed an order but nothing appeared in Slack.

### Diagnosis Steps

**Step 1: Check if Railway is running**
```bash
curl https://your-app.railway.app/health
```
Expected response: `{"status":"healthy"}`

If this fails:
- Railway app is down or URL is wrong
- Go to Railway dashboard and check deployment status

**Step 2: Check Railway logs**
1. Go to Railway dashboard
2. Click your service
3. Click "Deployments" tab
4. Click latest deployment
5. View logs

Look for:
- `Processing new customer: [Name]` - Webhook received
- `Slack notification sent successfully` - Alert sent
- Any error messages

**Step 3: Check Shopify webhook status**
1. Shopify Admin > Settings > Notifications
2. Scroll to Webhooks
3. Click on your webhook
4. Check for error messages
5. Look at "Recent deliveries" section

**Step 4: Test Slack webhook directly**
```bash
curl -X POST -H 'Content-type: application/json' \
--data '{"text":"Direct test from terminal"}' \
YOUR_SLACK_WEBHOOK_URL
```

If this works, the problem is not with Slack.

### Solutions

**Solution A: Webhook URL is wrong**
- Go to Shopify webhook settings
- Verify URL is: `https://your-app.railway.app/webhooks/orders/create`
- Must include `/webhooks/orders/create` at the end
- No trailing slash

**Solution B: SLACK_WEBHOOK_URL not set in Railway**
- Go to Railway > Variables
- Check `SLACK_WEBHOOK_URL` is set correctly
- Should start with `https://hooks.slack.com/services/`
- No quotes, spaces, or extra characters

**Solution C: Order wasn't from a "new" customer**
- The `ONLY_NEW_CUSTOMERS` variable filters for first-time customers only
- To test, either:
  - Use a new email address
  - Or set `ONLY_NEW_CUSTOMERS=false` in Railway variables

---

## Issue: "Shopify API credentials not configured" / New Customers Not Detected

### Symptom
Railway logs show:
```
Shopify API credentials not configured. Cannot verify order count.
Could not fetch order count from API, using webhook fallback
Customer example@email.com is not new (unknown orders), skipping...
```

### Why This Happens

Shopify's order webhook **does not include** `orders_count` or `total_spent` in the payload. The app needs to call the Shopify Admin API to verify if a customer is new (first order). Without the API credentials:
1. The API call fails
2. The fallback checks webhook data, which doesn't have order count
3. Customer is marked as "not new" and the alert is skipped

### Solution: Add Shopify Admin API Credentials

**Step 1: Create a Private App in Shopify**

1. Go to Shopify Admin > Settings > Apps and sales channels
2. Click "Develop apps" at the top
3. Click "Allow custom app development" if prompted
4. Click "Create an app"
5. Name it something like "Customer Alerts"
6. Click "Configure Admin API scopes"
7. Enable these scopes:
   - `read_customers` (required)
   - `read_orders` (optional, for future use)
8. Click "Save"
9. Click "Install app"
10. Click "Reveal token once" and copy the Admin API access token

**Step 2: Add to Railway Environment Variables**

1. Go to Railway Dashboard > Your Service > Variables
2. Add these two variables:

| Variable | Value |
|----------|-------|
| `SHOPIFY_STORE_DOMAIN` | `your-store.myshopify.com` (just the domain, no https://) |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | `shpat_xxxxxxxxxxxx` (the token from step 1) |

3. Railway will automatically redeploy

**Step 3: Verify It Works**

Check Railway logs after the next order. You should see:
```
DEBUG - Actual orders_count from API: 1
Detected new customer via Shopify API (orders_count = 1)
Processing new customer: [Name]
```

### Note on the Access Token

- Tokens start with `shpat_`
- You can only see the token once when you create it
- If you lose it, you'll need to create a new app
- The token never expires unless you revoke it

---

## Issue: No Enriched Data (Occupation, Age, etc.)

### Symptom
Slack alert appears but only shows basic info (name, location). No occupation, age, or social profiles.

### Diagnosis Steps

**Step 1: Check if Brave API is configured**
1. Go to Railway dashboard > Variables
2. Make sure `BRAVE_API_KEY` is set

**Step 2: Test API key directly**
```bash
curl -H "X-Subscription-Token: YOUR_BRAVE_API_KEY" \
"https://api.search.brave.com/res/v1/web/search?q=test"
```

If you get an error:
- `401`: API key is invalid
- `429`: You've exceeded quota

**Step 3: Check Claude API key**
1. Verify `ANTHROPIC_API_KEY` is set in Railway variables
2. Make sure the key is valid at https://console.anthropic.com/

**Step 4: Check Railway logs for API errors**
Look for messages like:
- `BRAVE_API_KEY not configured`
- `ANTHROPIC_API_KEY not configured`
- `Brave Search API error: 429`

### Solutions

**Solution A: API key not set**
1. Go to Railway > Variables
2. Add missing API keys
3. Railway will redeploy automatically

**Solution B: Exceeded free tier quota**
- Brave: 2,000 queries/month free
- Claude: Pay-as-you-go (check billing)
- Wait until quota resets or upgrade plan

**Solution C: Customer name is too generic or uncommon**
- Common names like "John Smith" may not return good results
- Very uncommon names may not have public profiles
- This is expected - enrichment works best with unique names in specific locations

---

## Issue: Webhook Signature Verification Failing

### Symptom
Railway logs show: `Invalid webhook signature` or `403 Forbidden`

### Solution

**The signing secret doesn't match:**
1. Go to Shopify Admin > Settings > Notifications > Webhooks
2. Click on your webhook
3. Copy the "Signing secret" again
4. Go to Railway > Your service > Variables
5. Update `SHOPIFY_WEBHOOK_SECRET` with the exact secret
6. Make sure there are no extra spaces or quotes
7. Railway will redeploy automatically

**Temporarily disable verification for testing:**
1. Railway > Variables
2. Remove `SHOPIFY_WEBHOOK_SECRET` variable
3. This will skip verification (not recommended for production)
4. Add it back once you confirm the correct secret

---

## Issue: Railway App Not Starting

### Symptom
Railway shows "Deployment failed" or app keeps crashing

### Diagnosis Steps

**Check Railway logs:**
1. Railway dashboard > Your service > Deployments
2. Click on failed deployment
3. Look for error messages

### Common Errors & Solutions

**Error: `Cannot find module 'express'`**
- Dependencies didn't install
- Solution: Make sure package.json is committed:
  ```bash
  git add package.json package-lock.json
  git commit -m "Add package files"
  git push
  ```

**Error: `Module not found` or syntax errors**
- Code has a bug
- Check the specific error in logs
- Fix in your code, commit, and push

**App crashes immediately after starting**
- Missing environment variable
- Check Railway logs for which variable is causing the issue
- Add it in Railway > Variables

---

## Issue: Getting Alerts for Every Order (Not Just New Customers)

### Symptom
You get alerts for repeat customers too

### Solution

**Check the filter setting:**
1. Railway > Your service > Variables
2. Find `ONLY_NEW_CUSTOMERS`
3. Make sure it's set to `true` (not `false` or `1`)
4. Case sensitive: must be lowercase `true`

**How it works:**
- App calls Shopify Admin API to get customer's order count
- If `orders_count === 1`, it's a new customer
- If `ONLY_NEW_CUSTOMERS=true`, only first-time customers trigger alerts

---

## Issue: Railway Charging Money

### Symptom
Railway is charging more than expected

### Diagnosis

**Check usage:**
1. Railway dashboard
2. Click "Usage" in top right
3. See breakdown of costs

**Free tier includes:**
- $5/month credit
- 500 hours execution time
- Usually enough for this app!

### Solutions

**Solution A: You exceeded free tier**
- If you have multiple Railway projects, they share the $5 credit
- Consider deleting unused projects

**Solution B: Unexpected traffic**
- Someone might be spamming your webhook
- Check logs for unusual activity
- Add rate limiting if needed

---

## Issue: Social Profiles Not Found

### Symptom
No LinkedIn or Instagram links in Slack alerts

### Why This Happens

This is expected for many customers:
- Not everyone has LinkedIn
- Not everyone has public Instagram
- Some people use different names online
- Privacy settings hide profiles from search

### This is Normal

**The agent only finds:**
- Publicly accessible profiles
- Profiles that appear in search results
- Profiles with names matching the customer

**It cannot find:**
- Private accounts
- Profiles with different names
- Profiles not indexed by search engines

### Improve Results

Consider these options:
- Enrichment is "best effort"
- Even 30-40% success rate is valuable
- Professional data enrichment services (Clearbit, FullContact) have higher match rates but cost significantly more

---

## Testing Commands

### Test Slack webhook
```bash
curl -X POST -H 'Content-type: application/json' \
--data '{"text":"Test from terminal"}' \
https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Test Brave API
```bash
curl -H "X-Subscription-Token: YOUR_BRAVE_API_KEY" \
"https://api.search.brave.com/res/v1/web/search?q=test"
```

### Test Railway health
```bash
curl https://your-app.railway.app/health
```

---

## Getting Help

### Information to Gather

When asking for help, include:

1. **Railway logs** (last 50 lines)
2. **Environment variables** (hide the actual keys, just show they're set)
3. **Shopify webhook status** (screenshot)
4. **What you tried** and what happened
5. **Expected vs actual behavior**

### Where to Get Help

**Railway Issues:**
- Railway Discord: https://discord.gg/railway
- Railway Docs: https://docs.railway.app/

**Shopify Issues:**
- Shopify Developer Forums: https://community.shopify.com/
- Shopify Docs: https://shopify.dev/docs/api/admin-rest/

**API Issues:**
- Anthropic Docs: https://docs.anthropic.com/
- Brave Search API Docs: https://brave.com/search/api/

---

## Prevention Tips

### 1. Monitor Your Services Monthly

Set calendar reminders:
- Check Railway usage dashboard
- Check Brave API quota
- Verify webhooks are still active
- Test with a sample order

### 2. Set Up Alerts

**Railway:**
- Go to Usage > Set up billing alerts

### 3. Keep Backups

**Save these somewhere secure:**
- All API keys and secrets
- Railway URL
- Slack webhook URL
- This codebase

### 4. Document Custom Changes

If you modify the code:
- Add comments explaining why
- Keep notes of what you changed
- Test thoroughly before deploying

---

## Still Stuck?

If none of these solutions work:

1. **Start from scratch** - Sometimes fastest approach:
   - Delete Railway project
   - Delete Shopify webhook
   - Follow DEPLOYMENT_GUIDE.md again

2. **Check if it's a timing issue:**
   - Wait 5 minutes and try again
   - APIs can have temporary issues
   - Railway deployments take time

3. **Verify the basics:**
   - Is your internet working?
   - Are you logged into correct accounts?
   - Are you editing the right project?

4. **Test components individually:**
   - Test Slack webhook alone
   - Test Brave API alone
   - Test Railway alone
   - Find which component is failing

Good luck!
