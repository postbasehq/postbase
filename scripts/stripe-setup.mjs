// Creates the Postbase products + prices in Stripe (idempotent) and prints the
// env lines to paste. Run: `node --env-file=.env.local scripts/stripe-setup.mjs`
// Requires STRIPE_SECRET_KEY (use a TEST key first: sk_test_...).
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is not set. Add your Stripe test secret key to .env.local.");
  process.exit(1);
}
const stripe = new Stripe(key);

// Yearly = 10× monthly (2 months free). Amounts in cents.
const PLANS = [
  { key: "creator", name: "Postbase Creator", monthly: 2900, yearly: 29000 },
  { key: "team", name: "Postbase Team", monthly: 3900, yearly: 39000 },
  { key: "growth", name: "Postbase Growth", monthly: 5900, yearly: 59000 },
];

async function findOrCreateProduct(p) {
  const found = await stripe.products.search({
    query: `metadata['postbase_plan']:'${p.key}'`,
  });
  if (found.data[0]) return found.data[0];
  return stripe.products.create({ name: p.name, metadata: { postbase_plan: p.key } });
}

async function findOrCreatePrice(product, lookupKey, amount, interval) {
  const found = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  if (found.data[0]) return found.data[0];
  return stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency: "usd",
    recurring: { interval },
    lookup_key: lookupKey,
    transfer_lookup_key: true,
  });
}

const env = {};
for (const p of PLANS) {
  const product = await findOrCreateProduct(p);
  const month = await findOrCreatePrice(product, `postbase_${p.key}_month`, p.monthly, "month");
  const year = await findOrCreatePrice(product, `postbase_${p.key}_year`, p.yearly, "year");
  env[`STRIPE_PRICE_${p.key.toUpperCase()}_MONTH`] = month.id;
  env[`STRIPE_PRICE_${p.key.toUpperCase()}_YEAR`] = year.id;
  console.error(`✓ ${product.name}: ${month.id} / ${year.id}`);
}

console.log("\n# Price ids — paste into .env.local and Vercel:");
for (const [k, v] of Object.entries(env)) console.log(`${k}=${v}`);
