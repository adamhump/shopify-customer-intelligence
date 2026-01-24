# Production Setup Guide

Get Customer Intelligence running with real data.

---

## What You Have Now

After completing the deployment guide:

- Code deployed to Railway
- Shopify webhook endpoint active
- Slack integration working
- Claude AI configured
- Probabilistic scoring implemented

---

## 5-Minute Final Setup

### Step 1: Verify Brave Search API Key

1. Go to https://brave.com/search/api/
2. Log in to your account
3. Navigate to your dashboard
4. Verify your API key is active
5. Check your usage quota (2,000 free queries/month)

**Cost:** Free for first 2,000 queries/month. Higher usage costs about $5 per 1,000 queries.

### Step 2: Verify All Railway Variables

1. Go to https://railway.app/
2. Open your project
3. Click on your deployment
4. Go to "Variables" tab
5. Verify all variables are set:
   - `SLACK_WEBHOOK_URL`
   - `ANTHROPIC_API_KEY`
   - `BRAVE_API_KEY`
   - `SHOPIFY_STORE_DOMAIN`
   - `SHOPIFY_ADMIN_ACCESS_TOKEN`
   - `SHOPIFY_WEBHOOK_SECRET`
   - `ONLY_NEW_CUSTOMERS=true`

### Step 3: Test with a Real Order

1. Place a test order on your Shopify store
2. Check your Slack channel for the notification
3. Verify it includes:
   - Customer name and location
   - Enriched information (occupation, education if found)
   - Confidence level
   - Social profile links (if found)
   - Products ordered

---

## Expected Behavior

### High-Confidence Match (70%+ confidence)
```
*New Customer: Grace Sharkey*

Associate Professor of Gender Studies at University of Sydney, Australia.
PhD from University of Melbourne.

LinkedIn

Ordered: Product name
```

### Medium-Confidence Match (40-69% confidence)
```
*New Customer: Emily Sorkin*

Journalist at The New York Times covering education policy. Based in Washington DC.
(Confidence: 65%)

LinkedIn | Instagram

Ordered: Product name
```

### Low-Confidence / Private Individual (<40% confidence)
```
*New Customer: John Smith*

Boston, MA resident. Likely a college-educated professional given email domain.
Common name prevents specific identification.

Ordered: Product name
```

---

## Monitoring and Maintenance

### Check System Health

**Railway Logs:**
1. Go to Railway dashboard
2. Click your deployment
3. View "Logs" tab
4. Look for:
   - `Searching web with multiple strategies for: [Name]`
   - `Found X unique results across 6 queries`
   - `Slack notification sent successfully`
   - `Brave Search API error: 429` (rate limiting - bad)
   - `Error enriching customer data` (investigate)

**Slack Channel:**
- Every new customer should trigger a notification within 5-10 seconds
- Check that enriched information is showing up
- Look for confidence levels in parentheses

### Common Issues

#### Issue: No enriched information showing up
**Solution:**
- Check Railway logs for errors
- Verify `BRAVE_API_KEY` is set correctly
- Check `ANTHROPIC_API_KEY` is still valid
- Look for API rate limit errors (429)

#### Issue: Slack notifications not arriving
**Solution:**
- Verify `SLACK_WEBHOOK_URL` is correct in Railway variables
- Test webhook URL with curl:
  ```bash
  curl -X POST [SLACK_WEBHOOK_URL] \
    -H 'Content-Type: application/json' \
    -d '{"text": "Test notification"}'
  ```

#### Issue: Brave API rate limiting (429 errors)
**Solution:**
- System already has 500ms delays between queries
- If still hitting limits, reduce queries from 6 to 4 in enrichment.js
- Consider upgrading Brave API plan if order volume increases

#### Issue: Information seems inaccurate
**Solution:**
- Check confidence level - if <60%, system is explicitly uncertain
- Review Railway logs to see what search results were found
- Remember: System cannot find info for private individuals with no online presence
- Expected: ~30-40% of customers will have minimal/no enrichment data

---

## Cost Tracking

### Monthly Costs (400 customers/month)

| Service | Usage | Cost |
|---------|-------|------|
| Railway | Hosting | ~$5/month |
| Brave Search API | ~2,400 queries | ~$2-5/month |
| Anthropic Claude | ~3-5M tokens | ~$3-5/month |
| **Total** | - | **~$10-15/month** |

### Cost Optimization Tips

1. **Reduce queries per customer**: Change from 6 to 4 in enrichment.js (saves 33% on Brave costs)
2. **Filter test orders**: Add logic to skip enrichment for test orders (order value < $5)
3. **Cache results**: Store enrichment data in database, reuse for repeat customers

---

## Advanced Configuration

### Adjust Confidence Thresholds

Edit `index.js`, function `sendSlackNotification()`:

```javascript
// Only show enriched info if confidence >= 60%
if (enrichedData.confidence >= 60) {
  // Show full profile
} else {
  // Show basic info only
}
```

### Change Number of Search Queries

Edit `enrichment.js`, function `searchWebMultiStrategy()`:

```javascript
// Current: 6 queries
for (let i = 0; i < Math.min(queries.length, 6); i++) {

// Change to 4 queries (faster, cheaper):
for (let i = 0; i < Math.min(queries.length, 4); i++) {
```

### Switch to Better Claude Model

Edit `enrichment.js`:

```javascript
// Current (Haiku - fast and cheap):
model: 'claude-3-haiku-20240307',

// Change to Sonnet (better quality, higher cost):
model: 'claude-3-5-sonnet-20241022',
```

---

## Success Metrics

### Week 1
- [ ] System running without errors
- [ ] Slack notifications arriving for all orders
- [ ] At least 20% of customers show enriched information

### Week 2-4
- [ ] Track confidence score distribution
- [ ] Collect feedback from team on notification quality
- [ ] Monitor API costs vs. budget

### Month 2+
- [ ] Consider quality improvements (Sonnet model, additional search sources)
- [ ] Build analytics dashboard
- [ ] A/B test different notification formats

---

## What to Expect

### Realistic Performance Expectations

Based on testing:

- **20-30% of customers**: Strong match with occupation, education, social profiles (70%+ confidence)
- **40-50% of customers**: Partial match with some verified facts (40-69% confidence)
- **20-40% of customers**: Minimal/contextual information only (<40% confidence)

**This is normal.** Most e-commerce customers are private individuals without significant online presences.

### When to Consider Paid Data APIs

If you need higher success rates (60%+), consider:
- **Clearbit** ($99-999/month) - enriches 40-60% of customers
- **FullContact** ($99-599/month) - similar enrichment rates

**Trade-off:** These services are 10-50x more expensive but provide higher match rates.

---

## You're Ready!

Your customer intelligence system is now running in production. Place orders and watch your Slack channel for enriched customer insights.

Questions? Check the logs first, then review TROUBLESHOOTING.md.
