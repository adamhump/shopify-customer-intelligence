# Shopify Customer Intelligence

AI-powered customer intelligence for Shopify stores. Get instant Slack notifications when new customers place orders, enriched with publicly available information about who they are.

## What It Does

When a new customer places an order on your Shopify store, this agent:

1. **Detects new customers** - Uses the Shopify Admin API to verify first-time buyers
2. **Enriches customer data** - Searches the web and uses Claude AI to find:
   - Professional information (occupation, education)
   - Social media profiles (LinkedIn, Instagram)
   - Contextual insights based on location and email patterns
3. **Sends Slack alerts** - Posts a notification with all the enriched data

## Example Alert

```
*New Customer: Jane Smith*

Marketing Director at Acme Corp, based in San Francisco.
MBA from Stanford University.

Y *Confidence:* 85%
*How we found this:* LinkedIn profile exact match + location confirmed

*What we found:*
- Works at Acme Corp (LinkedIn)
- Lives in San Francisco Bay Area
- Active on professional networks

LinkedIn | Instagram

Ordered: Product Name (x2)
```

## Features

- **Probabilistic matching** - Shows confidence levels and reasoning
- **Graceful degradation** - Still provides useful info even when exact match isn't found
- **Duplicate prevention** - Uses Shopify Event IDs to prevent duplicate notifications
- **Transparent enrichment** - Shows what was found vs. what's missing

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/shopify-customer-intelligence.git
cd shopify-customer-intelligence
npm install
```

### 2. Configure Environment

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `SLACK_WEBHOOK_URL` - Your Slack incoming webhook URL
- `ANTHROPIC_API_KEY` - Your Claude API key
- `BRAVE_API_KEY` - Brave Search API key for web searches
- `SHOPIFY_STORE_DOMAIN` - Your store's myshopify.com domain
- `SHOPIFY_ADMIN_ACCESS_TOKEN` - Admin API access token

### 3. Deploy

**Option A: Railway (Recommended)**
```bash
# Push to GitHub, then deploy from Railway dashboard
```

**Option B: Docker**
```bash
docker-compose up -d
```

**Option C: Local**
```bash
npm start
```

### 4. Configure Shopify Webhook

1. Go to Shopify Admin > Settings > Notifications > Webhooks
2. Create webhook:
   - **Event:** Order creation
   - **Format:** JSON
   - **URL:** `https://your-app-url/webhooks/orders/create`

## Documentation

- [QUICKSTART.md](QUICKSTART.md) - 5-minute setup guide
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Complete deployment walkthrough
- [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md) - Production configuration
- [SETUP_CHECKLIST.md](SETUP_CHECKLIST.md) - Printable checklist
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues and solutions

## API Keys Required

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| [Anthropic Claude](https://console.anthropic.com/) | AI analysis | Pay-as-you-go |
| [Brave Search](https://brave.com/search/api/) | Web search | 2,000 queries/month |
| [Slack](https://api.slack.com/apps) | Notifications | Free |
| Shopify Admin API | Customer data | Included with store |

## Cost Estimate

For ~400 new customers/month:
- **Railway hosting:** ~$5/month
- **Brave Search:** ~$2-5/month
- **Claude API:** ~$3-5/month
- **Total:** ~$10-15/month

## How Enrichment Works

The system uses a multi-strategy search approach:

1. **Direct identity anchors** - Name + location searches
2. **Professional networks** - LinkedIn profile searches
3. **Academic sources** - University/education searches
4. **Social media** - Instagram and other platforms
5. **Adjacent signals** - Email username patterns

Claude AI then analyzes all results with probabilistic scoring to identify the most likely match while showing confidence levels.

## Privacy & Ethics

- Only uses publicly available information
- Shows confidence levels to indicate uncertainty
- Never stores enriched data (only passes through to Slack)
- Respects rate limits on all APIs

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

## License

MIT License - see [LICENSE](LICENSE)
