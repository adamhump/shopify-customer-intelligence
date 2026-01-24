import express from 'express';
import fetch from 'node-fetch';
import crypto from 'crypto';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { enrichCustomerData } from './enrichment.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Persistent storage for processed webhook event IDs
const PROCESSED_EVENTS_FILE = path.join(process.cwd(), '.processed-webhooks.json');
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// Load processed events from disk
let processedEvents = new Map();
try {
  if (fs.existsSync(PROCESSED_EVENTS_FILE)) {
    const data = JSON.parse(fs.readFileSync(PROCESSED_EVENTS_FILE, 'utf8'));
    processedEvents = new Map(Object.entries(data));
    console.log(`Loaded ${processedEvents.size} processed webhook events from disk`);
  }
} catch (error) {
  console.error('Error loading processed events:', error.message);
}

// Save processed events to disk
function saveProcessedEvents() {
  try {
    const data = Object.fromEntries(processedEvents);
    fs.writeFileSync(PROCESSED_EVENTS_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving processed events:', error.message);
  }
}

// Clean up old entries every minute and save to disk
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, timestamp] of processedEvents.entries()) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      processedEvents.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`Cleaned ${cleaned} old webhook events`);
    saveProcessedEvents();
  }
}, 60 * 1000);

// Verify Shopify webhook signature
function verifyShopifyWebhook(req, res, buf) {
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  const hash = crypto
    .createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
    .update(buf)
    .digest('base64');

  if (hash !== hmac) {
    throw new Error('Invalid webhook signature');
  }
}

// Get actual customer order count from Shopify Admin API
async function getCustomerOrderCount(customerId) {
  if (!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
    console.warn('Shopify API credentials not configured. Cannot verify order count.');
    return null;
  }

  try {
    const url = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/customers/${customerId}.json`;
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Shopify API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.customer?.orders_count || null;
  } catch (error) {
    console.error('Error fetching customer from Shopify API:', error.message);
    return null;
  }
}

// Webhook endpoint for new orders (must come BEFORE express.json() middleware)
app.post('/webhooks/orders/create', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Verify webhook if secret is configured
    if (process.env.SHOPIFY_WEBHOOK_SECRET) {
      verifyShopifyWebhook(req, res, req.body);
    }

    // Parse the order data
    const order = JSON.parse(req.body.toString());

    // Check for duplicate webhooks using Shopify's Event ID (recommended by Shopify)
    const shopifyEventId = req.get('X-Shopify-Event-Id');
    if (shopifyEventId) {
      if (processedEvents.has(shopifyEventId)) {
        console.log(`Duplicate webhook detected (Event ID: ${shopifyEventId}), skipping...`);
        return res.status(200).send('OK');
      }
      // Mark as processed immediately to prevent race conditions
      processedEvents.set(shopifyEventId, Date.now());
      saveProcessedEvents();
    }

    // Check if this is a new customer
    const customer = order.customer;

    if (!customer) {
      console.log('Order has no customer data, skipping...');
      return res.status(200).send('OK');
    }

    // Debug logging
    console.log(`DEBUG - Customer email: ${customer.email}`);
    console.log(`DEBUG - Customer ID: ${customer.id}`);
    console.log(`DEBUG - orders_count from webhook: ${order.customer?.orders_count}`);
    console.log(`DEBUG - total_spent from webhook: ${order.customer?.total_spent}`);
    console.log(`DEBUG - order.total_price: ${order.total_price}`);
    if (shopifyEventId) {
      console.log(`DEBUG - Shopify Event ID: ${shopifyEventId}`);
    }

    // Get actual order count from Shopify Admin API
    const actualOrderCount = await getCustomerOrderCount(customer.id);
    console.log(`DEBUG - Actual orders_count from API: ${actualOrderCount}`);

    // Check if customer is new (first order)
    let isNewCustomer = false;

    if (actualOrderCount !== null) {
      // Use the API data (most reliable)
      isNewCustomer = actualOrderCount === 1;
      if (isNewCustomer) {
        console.log('Detected new customer via Shopify API (orders_count = 1)');
      }
    } else {
      // Fallback: use webhook data if API call failed
      console.log('Could not fetch order count from API, using webhook fallback');
      isNewCustomer = order.customer?.orders_count === 1 ||
                      order.customer?.total_spent === order.total_price;

      if (isNewCustomer) {
        console.log('Detected new customer via webhook data');
      }
    }

    if (!isNewCustomer && process.env.ONLY_NEW_CUSTOMERS === 'true') {
      console.log(`Customer ${customer.email} is not new (${actualOrderCount || 'unknown'} orders), skipping...`);
      return res.status(200).send('OK');
    }

    console.log(`Processing new customer: ${customer.first_name} ${customer.last_name}${shopifyEventId ? ` (Event ID: ${shopifyEventId})` : ''}`);

    // Enrich customer data (with fallback if enrichment fails)
    let enrichedData = {
      occupation: null,
      age: null,
      education: null,
      description: null,
      socialProfiles: [],
    };

    try {
      enrichedData = await enrichCustomerData({
        name: `${customer.first_name} ${customer.last_name}`,
        email: customer.email,
        city: order.shipping_address?.city || order.billing_address?.city,
        state: order.shipping_address?.province || order.billing_address?.province,
        country: order.shipping_address?.country || order.billing_address?.country,
      });
    } catch (enrichmentError) {
      console.error('Error during enrichment (will send basic notification):', enrichmentError.message);
    }

    // Send to Slack (always send, even if enrichment failed)
    await sendSlackNotification(order, customer, enrichedData);

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Format and send Slack notification
async function sendSlackNotification(order, customer, enrichedData) {
  const location = order.shipping_address?.city && order.shipping_address?.province
    ? `${order.shipping_address.city}, ${order.shipping_address.province}`
    : (order.billing_address?.city && order.billing_address?.province
      ? `${order.billing_address.city}, ${order.billing_address.province}`
      : 'Unknown location');

  // Build product list
  let productList = '';
  if (order.line_items && order.line_items.length > 0) {
    productList = order.line_items.map(item => {
      const quantity = item.quantity > 1 ? ` (x${item.quantity})` : '';
      return `${item.title}${quantity}`;
    }).join(', ');
  }

  // Build the alert message with full transparency
  let message = `*New Customer: ${customer.first_name} ${customer.last_name}*\n\n`;

  // Add main description
  if (enrichedData.description) {
    message += `${enrichedData.description}\n\n`;
  } else {
    message += `${location}\n\n`;
  }

  // Add confidence and reasoning (transparency!)
  if (enrichedData.confidence !== undefined) {
    const confidenceEmoji = enrichedData.confidence >= 70 ? 'Y' : enrichedData.confidence >= 40 ? '~' : '?';
    message += `${confidenceEmoji} *Confidence:* ${enrichedData.confidence}%\n`;
  }

  if (enrichedData.reasoning) {
    message += `*How we found this:* ${enrichedData.reasoning}\n\n`;
  }

  // Show what we know vs what we're missing
  if (enrichedData.whatWeKnow && enrichedData.whatWeKnow.length > 0) {
    message += `*What we found:*\n`;
    enrichedData.whatWeKnow.forEach(fact => {
      message += `- ${fact}\n`;
    });
    message += `\n`;
  }

  if (enrichedData.whatWeMissing && enrichedData.whatWeMissing.length > 0) {
    message += `*Missing info:*\n`;
    enrichedData.whatWeMissing.forEach(item => {
      message += `- ${item}\n`;
    });
    message += `\n`;
  }

  // Social profiles
  if (enrichedData.socialProfiles && enrichedData.socialProfiles.length > 0) {
    const profileLinks = enrichedData.socialProfiles.map(profile =>
      `<${profile.url}|${profile.platform}>`
    );
    message += profileLinks.join(' | ');
    message += `\n\n`;
  }

  // Products ordered
  if (productList) {
    message += `Ordered: ${productList}`;
  }

  const slackPayload = {
    text: `New Customer: ${customer.first_name} ${customer.last_name}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: message
        }
      }
    ]
  };

  // Add profile image if available
  if (enrichedData.imageUrl) {
    slackPayload.blocks.push({
      type: "image",
      image_url: enrichedData.imageUrl,
      alt_text: `${customer.first_name} ${customer.last_name}`
    });
  }

  // Add order details button
  if (order.order_status_url) {
    slackPayload.blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "View Order"
          },
          url: order.order_status_url
        }
      ]
    });
  }

  // Send to Slack
  const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(slackPayload),
  });

  if (!response.ok) {
    throw new Error(`Failed to send Slack notification: ${response.statusText}`);
  }

  console.log('Slack notification sent successfully');
}

// JSON middleware for other routes (must come AFTER webhook routes)
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.listen(PORT, () => {
  console.log(`Customer Intelligence agent running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhooks/orders/create`);
});
