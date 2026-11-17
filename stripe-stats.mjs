// Reads all completed, paid USD Checkout Sessions (Payment Links create these)
// and writes {"participants": N, "amount": USD} to stats.json.
// STRIPE_KEY comes from the repo secret – use a restricted key with
// "Checkout Sessions: Read" only.
import { writeFileSync } from 'node:fs';

const key = process.env.STRIPE_KEY;
if (!key) { console.error('STRIPE_KEY secret is missing'); process.exit(1); }

let participants = 0, cents = 0, startingAfter = null;
do {
  const url = new URL('https://api.stripe.com/v1/checkout/sessions');
  url.searchParams.set('limit', '100');
  url.searchParams.set('status', 'complete');
  if (startingAfter) url.searchParams.set('starting_after', startingAfter);

  const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  if (!r.ok) { console.error('Stripe error', r.status, await r.text()); process.exit(1); }
  const page = await r.json();

  for (const s of page.data) {
    if (s.payment_status === 'paid' && s.currency === 'usd') {
      participants += 1;
      cents += s.amount_total || 0;
    }
  }
  startingAfter = page.has_more ? page.data[page.data.length - 1].id : null;
} while (startingAfter);

const stats = { participants, amount: cents / 100 };
writeFileSync('stats.json', JSON.stringify(stats) + '\n');
console.log('stats.json:', stats);
