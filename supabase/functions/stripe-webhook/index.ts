import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

const KIT_NAMES: Record<string, string> = {
  ground: 'GROUND', ritual: 'RITUAL', sovereign: 'SOVEREIGN',
};

// Deduct inventory for a kit order. order_type: 'first_box' | 'refill'
async function deductInventory(
  db: ReturnType<typeof createClient>,
  kit_id: string,
  order_type: 'first_box' | 'refill',
  reference_id: string,
) {
  try {
    const qtyField = order_type === 'first_box' ? 'first_box_qty' : 'refill_qty';

    const { data: kitProducts } = await db
      .from('kit_products')
      .select(`product_id, ${qtyField}`)
      .eq('kit_id', kit_id)
      .gt(qtyField, 0);

    if (!kitProducts?.length) return;

    for (const kp of kitProducts) {
      const qty = kp[qtyField] as number;

      // Decrement stock (floor at 0 — never go negative)
      const { data: product } = await db
        .from('products')
        .select('current_stock')
        .eq('id', kp.product_id)
        .single();

      const newStock = Math.max(0, (product?.current_stock ?? 0) - qty);

      await db.from('products')
        .update({ current_stock: newStock })
        .eq('id', kp.product_id);

      await db.from('inventory_transactions').insert({
        product_id: kp.product_id,
        transaction_type: 'outbound_order',
        quantity: -qty,
        reference_type: 'order',
        reference_id,
        notes: `${order_type === 'first_box' ? 'First box' : 'Refill'} — ${KIT_NAMES[kit_id] ?? kit_id} kit`,
        created_by: 'system',
      });
    }
  } catch (err) {
    // Never let inventory errors block order processing
    console.error('inventory_deduction_error', err);
  }
}

async function sendConfirmationEmail(
  email: string,
  firstName: string,
  kitId: string,
  orderRef: string,
  isOneTime = false,
  dispatchDate?: string,
  arrivalDate?: string,
) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) { console.warn('RESEND_API_KEY not set — skipping email'); return; }

  const kitName = KIT_NAMES[kitId] ?? kitId.toUpperCase();

  const step3 = isOneTime
    ? `<tr><td style="background:#181C24;padding:20px 24px;border-bottom:1px solid #1e2530;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="32" style="font-size:22px;font-weight:700;color:#2E6DA4;vertical-align:top;padding-top:2px;">3</td>
                <td><p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#F0ECE2;">We'll check in at two weeks</p><p style="margin:0;font-size:13px;color:rgba(240,236,226,0.45);line-height:1.55;">Once you've had time to use the kit properly, we'll ask a few quick questions. Your feedback directly shapes what we build next.</p></td>
              </tr></table>
            </td></tr>`
    : `<tr><td style="background:#181C24;padding:20px 24px;border-bottom:1px solid #1e2530;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="32" style="font-size:22px;font-weight:700;color:#2E6DA4;vertical-align:top;padding-top:2px;">3</td>
                <td><p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#F0ECE2;">Refills every 30 days</p><p style="margin:0;font-size:13px;color:rgba(240,236,226,0.45);line-height:1.55;">Your first refill is charged 30 days from today — you saw the exact date at checkout. Every 30 days after that. You'll never run out.</p></td>
              </tr></table>
            </td></tr>`;

  const footerLine = isOneTime
    ? ``
    : `<p style="margin:4px 0 0;font-size:11px;color:rgba(240,236,226,0.2);">You can cancel any time from your account.</p>`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111111;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr><td style="background:#08090B;padding:32px 48px 26px;border-bottom:1px solid #181c24;">
          <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2ZXJzaW9uPSIxLjEiIHdpZHRoPSIzODAiIGhlaWdodD0iNzAiIHZpZXdCb3g9IjAgMCAzODAgNzAiPgogIDxkZWZzPgo8cGF0aCBpZD0iZm9udF84XzE2IiBkPSJNLjYxNDc0NjEgLjIwNzYyNjM1Qy42MTQ3NDYxIC4xNjQ5NjI3NyAuNjAyNzAxODcgLjEyNzI2MzM4IC41Nzg2MTMzIC4wOTQ1MjgyIC41NTQ1MjQ3IC4wNjE4MDMxOCAuNTIyNTQyMyAuMDM2ODkwNjY4IC40ODI2NjYwMyAuMDE5NzkwNjUgLjQ0Mjc4OTcgLjAwMjY5MDYzMyAuMzk4NjAwMjYtLjAwNTg1OTM3NSAuMzUwMDk3NjctLjAwNTg1OTM3NSAuMzA5NzMzMDctLjAwNTg1OTM3NSAuMjczMjc0NzYtLjAwMjExNTg4NTYgLjI0MDcyMjY2IC4wMDUzNzEwOTM5IC4yMDgxNzA1OCAuMDEyODU4MDczIC4xODExNTIzNSAuMDIzMTkzMzYgLjE1OTY2Nzk3IC4wMzYzNzY5NTQgLjEzODE4MzYgLjA0OTU2MDU0OCAuMTE5NzkxNjY3IC4wNjQyMDg5ODggLjEwNDQ5MjE5IC4wODAzMjIyNjkgLjA4OTE5MjcxIC4wOTY0MzU1NSAuMDc3MzkyNTggLjExNDI1NzgxIC4wNjkwOTE4IC4xMzM3ODkwNiAuMDYwNzkxMDE3IC4xNTMzMjAzMSAuMDU0NzY4ODggLjE3MTc5MzYzIC4wNTEwMjUzOSAuMTg5MjA4OTkgLjA0NzI4MTkwNCAuMjA2NjI0MzUgLjA0NTI0NzM5NiAuMjI0NjA5MzggLjA0NDkyMTg3NiAuMjQzMTY0MDZILjEzNDI3NzM1Qy4xNDExMTMyOCAuMTg4NDc2NTYgLjE2MzAwNDU2IC4xNDcxMzU0MiAuMTk5OTUxMTcgLjExOTE0MDYyOCAuMjM2ODk3NzggLjA5MTE0NTgzOSAuMjg1NDgxNzkgLjA3NzE0ODQ0IC4zNDU3MDMxMyAuMDc3MTQ4NDQgLjM3NzYwNDE3IC4wNzcxNDg0NCAuNDA2OTAxMDQgLjA4MTM5MDM4IC40MzM1OTM3NiAuMDg5ODc0MjcgLjQ2MDI4NjQ4IC4wOTgzNTgxNTggLjQ4MjUwMzI4IC4xMTIxNDE5MyAuNTAwMjQ0MTcgLjEzMTIyNTU5IC41MTc5ODUwNyAuMTUwMzE5NDEgLjUyNjg1NTQ5IC4xNzMyNDMyMSAuNTI2ODU1NDkgLjE5OTk5Njk1IC41MjY4NTU0OSAuMjE1NjUyNDcgLjUyMzM1NjE2IC4yMjk1OTkgLjUxNjM1NzQgLjI0MTgzNjU1IC41MDkzNTg3IC4yNTQwNzQxIC41MDA4OTUyIC4yNjM2OTczIC40OTA5NjY4IC4yNzA3MDYxOSAuNDgxMDM4NDMgLjI3NzcyNTIzIC40Njc3NzM0NSAuMjg0MTY5NTMgLjQ1MTE3MTg4IC4yOTAwMzkwNyAuNDM0NTcwMyAuMjk1OTE4OCAuNDE5NzU5MTMgLjMwMDM0ODkgLjQwNjczODI5IC4zMDMzMjk0OCAuMzkzNzE3NDUgLjMwNjMxMDA0IC4zNzcxOTcyOCAuMzEwMDU4NiAuMzU3MTc3NzQgLjMxNDU3NTIgLjMzNzE1ODIgLjMxOTEwMTk3IC4zMjIxMDI4OCAuMzIyNTM1MiAuMzEyMDExNzMgLjMyNDg3NDg5IC4yOTE1MDM5IC4zMjk2MjU0NyAuMjczOTI1NzkgLjMzMzcxNDggLjI1OTI3NzM1IC4zMzcxNDI5NSAuMjQ0NjI4OSAuMzQwNTcxMDkgLjIyODM1Mjg2IC4zNDU1MzUyOSAuMjEwNDQ5MjIgLjM1MjAzNTUzIC4xOTI1NDU1OCAuMzU4NTQ1OTQgLjE3NzQwODg2IC4zNjUyMTQwMyAuMTY1MDM5MDYgLjM3MjAzOTggLjE1MjY2OTI3IC4zNzg4NzU3NCAuMTQwMjE4MSAuMzg3MTcxNDMgLjEyNzY4NTU1IC4zOTY5MjY4OSAuMTE1MTUyOTkgLjQwNjY5MjUgLjEwNTE0MzIzIC40MTczNDgyNSAuMDk3NjU2MjUgLjQyODg5NDA1IC4wOTAxNjkyNyAuNDQwNDUwMDUgLjA4NDA2NTc2IC40NTM4NzI2OSAuMDc5MzQ1NyAuNDY5MTYyIC4wNzQ2MjU2NSAuNDg0NDUxMyAuMDcyMjY1NjI4IC41MDEwNDI2OSAuMDcyMjY1NjI4IC41MTg5MzYxOCAuMDcyMjY1NjI4IC41NTkzMjExIC4wODM0MTQ3MSAuNTk0NjU1MzYgLjEwNTcxMjg5IC42MjQ5Mzg5OSAuMTI4MDExMDcgLjY1NTIzMjcgLjE1ODEyMTc1IC42NzgyNzg2IC4xOTYwNDQ5MiAuNjk0MDc2NTYgLjIzMzk2ODEgLjcwOTg3NDQ4IC4yNzY2OTI3MyAuNzE3NzczNDYgLjMyNDIxODc2IC43MTc3NzM0NiAuMzk5NzM5NiAuNzE3NzczNDYgLjQ2MjA3NjggLjY5ODQ0NTYgLjUxMTIzMDQ5IC42NTk3OTAwNiAuNTYwMzg0MSAuNjIxMTQ0NiAuNTg3NzI3ODcgLjU2NjU3OTE5IC41OTMyNjE3IC40OTYwOTM3NkguNTAyNDQxNEMuNDk3NTU4NiAuNTM3OTQzNTcgLjQ3OTczNjM0IC41NzE1MTc5NyAuNDQ4OTc0NiAuNTk2ODE3IC40MTgyMTI5IC42MjIxMTYxIC4zNzc5Mjk3IC42MzQ3NjU2IC4zMjgxMjUgLjYzNDc2NTYgLjI3Nzk5NDc5IC42MzQ3NjU2IC4yMzc0Njc0NiAuNjI1MjE4NyAuMjA2NTQyOTcgLjYwNjEyNDkgLjE3NTYxODQ5IC41ODcwNDEyIC4xNjAxNTYyNSAuNTYwMzQ4NSAuMTYwMTU2MjUgLjUyNjA0Njc4IC4xNjAxNTYyNSAuNTE3OTU5NiAuMTYxMjk1NTggLjUxMDI3NDI2IC4xNjM1NzQyMiAuNTAyOTkwNyAuMTY1ODUyODYgLjQ5NTcxNzM5IC4xNjg3ODI1NSAuNDg5MjQ3NjYgLjE3MjM2MzI4IC40ODM1ODE1NSAuMTc1OTQ0MDIgLjQ3NzkxNTQ1IC4xODA3NDU0NCAuNDcyNDkzNSAuMTg2NzY3NTggLjQ2NzMxNTY4IC4xOTI3ODk3MiAuNDYyMTQ4MDUgLjE5ODU2NzcgLjQ1NzcwMjY1IC4yMDQxMDE1NiAuNDUzOTc5NSAuMjA5NjM1NDIgLjQ1MDI1NjM2IC4yMTY2MzQxMSAuNDQ2NjE0NiAuMjI1MDk3NjYgLjQ0MzA1NDIgLjIzMzU2MTIgLjQzOTQ5MzggLjI0MDk2NjggLjQzNjU3OTM5IC4yNDczMTQ0NiAuNDM0MzEwOSAuMjUzNjYyMSAuNDMyMDUyNiAuMjYxNjM3MzcgLjQyOTgzNSAuMjcxMjQwMjQgLjQyNzY1ODA5IC4yODA4NDMxIC40MjU0OTEzNCAuMjg4NTc0MjMgLjQyMzc2MiAuMjk0NDMzNiAuNDIyNDcwMSAuMzAwMjkyOTggLjQyMTE3ODIgLjMwNzk0MjczIC40MTk0OTk3NCAuMzE3MzgyOCAuNDE3NDM0NyAuMzI2ODIyOSAuNDE1Mzc5ODYgLjMzMzY1ODg1IC40MTM4NjQxNSAuMzM3ODkwNjMgLjQxMjg4NzU4IC4zNDU3MDMxMyAuNDExMTk4OTUgLjM1ODQ3OTg0IC40MDg0MjY5IC4zNzYyMjA3IC40MDQ1NzE1NCAuMzkzOTYxNTkgLjQwMDcxNjE3IC40MDg5MzU1NiAuMzk3NDU1ODUgLjQyMTE0MjU5IC4zOTQ3OTA2NiAuNDMzMzQ5NiAuMzkyMTM1NjMgLjQ0ODQwNDk1IC4zODgwOTcxNSAuNDY2MzA4NiAuMzgyNjc1MTggLjQ4NDIxMjI2IC4zNzcyNjM0IC40OTk0MzAzNCAuMzcxNjAyNCAuNTExOTYyOSAuMzY1NjkyMTUgLjUyNDQ5NTQgLjM1OTc4MTkgLjUzNzY3OSAuMzUxODIxOSAuNTUxNTEzNyAuMzQxODEyMTQgLjU2NTM0ODMgLjMzMTgwMjM4IC41NzY0OTc0IC4zMjA4MDU4OSAuNTg0OTYwOTYgLjMwODgyMjY0IC41OTM0MjQ1IC4yOTY4Mzk0IC42MDA1MDQ2IC4yODIxNDUxOCAuNjA2MjAxMiAuMjY0NzQgLjYxMTg5Nzc5IC4yNDczNDQ5NyAuNjE0NzQ2MSAuMjI4MzA3MDkgLjYxNDc0NjEgLjIwNzYyNjM1WiIvPgogICAgPHBhdGggaWQ9ImZvbnRfOF83IiBkPSJNLjU2NzYyNjk4IC4wMzgzNjA1OTdDLjUxNjM1NzQgLjAwODg4MDYxNSAuNDU3MzU2NzktLjAwNTg1OTM3NSAuMzkwNjI1LS4wMDU4NTkzNzUgLjMyMzg5MzIzLS4wMDU4NTkzNzUgLjI2NDg5MjU5IC4wMDg4ODA2MTUgLjIxMzYyMzA1IC4wMzgzNjA1OTcgLjE2MjM1MzUyIC4wNjc4NDA1NzkgLjEyMjM5NTgzOSAuMTA5OTM5NTc4IC4wOTM3NSAuMTY0NjU3NiAuMDY1MTA0MTY3IC4yMTkzODU3OSAuMDUwNzgxMjUgLjI4Mjc0NTM3IC4wNTA3ODEyNSAuMzU0NzM2MzQgLjA1MDc4MTI1IC40MjYwNzYyNyAuMDY0NDUzMTI4IC40ODkxMDUyMyAuMDkxNzk2ODc4IC41NDM4MjMyNyAuMTE5MTQwNjI4IC41OTg1NTE0OCAuMTU4NjEwMDMgLjY0MTIyNTE4IC4yMTAyMDUwOCAuNjcxODQ0NSAuMjYxODAwMTUgLjcwMjQ2MzggLjMyMTk0MDEgLjcxNzc3MzQ2IC4zOTA2MjUgLjcxNzc3MzQ2IC40NTkzMDk5IC43MTc3NzM0NiAuNTE5NDQ5OSAuNzAyNDYzOCAuNTcxMDQ0OSAuNjcxODQ0NSAuNjIyNjM5OTggLjY0MTIyNTE4IC42NjIxMDk0IC41OTg1NTE0OCAuNjg5NDUzMSAuNTQzODIzMjcgLjcxNjc5NjkgLjQ4OTEwNTIzIC43MzA0Njg3NyAuNDI2MDc2MjcgLjczMDQ2ODc3IC4zNTQ3MzYzNCAuNzMwNDY4NzcgLjI4Mjc0NTM3IC43MTYxNDU4IC4yMTkzODU3OSAuNjg3NSAuMTY0NjU3NiAuNjU4ODU0MiAuMTA5OTM5NTc4IC42MTg4OTY1IC4wNjc4NDA1NzkgLjU2NzYyNjk4IC4wMzgzNjA1OTdNLjU3NDk1MTIgLjU1NzA1MjZDLjUyOTg2NjUgLjYwODg2MTI5IC40Njg0MjQ0OCAuNjM0NzY1NiAuMzkwNjI1IC42MzQ3NjU2IC4zMTI4MjU1NCAuNjM0NzY1NiAuMjUxMzgzNDYgLjYwODg2MTI5IC4yMDYyOTg4MyAuNTU3MDUyNiAuMTYxMjE0MTkgLjUwNTI1NDEgLjEzODY3MTg4IC40Mzc4MTUzNSAuMTM4NjcxODggLjM1NDczNjM0IC4xMzg2NzE4OCAuMjcwMzU1MjMgLjE2MTEzMjgxIC4yMDI5OTI3NSAuMjA2MDU0NjkgLjE1MjY0ODkzIC4yNTA5NzY1NyAuMTAyMzE1MjcgLjMxMjUgLjA3NzE0ODQ0IC4zOTA2MjUgLjA3NzE0ODQ0IC40Njg3NSAuMDc3MTQ4NDQgLjUzMDI3MzQ2IC4xMDIzMTUyNyAuNTc1MTk1MyAuMTUyNjQ4OTMgLjYyMDExNzIgLjIwMjk5Mjc1IC42NDI1NzgxIC4yNzAzNTUyMyAuNjQyNTc4MSAuMzU0NzM2MzQgLjY0MjU3ODEgLjQzNzgxNTM1IC42MjAwMzU4IC41MDUyNTQxIC41NzQ5NTEyIC41NTcwNTI2WiIvPgogICAgPHBhdGggaWQ9ImZvbnRfOF8xNCIgZD0iTS4wNzMyNDIxOSAwVi43MDgwMDc4SC4xNjExMzI4MVYuMDgzMDA3ODFILjUxNzU3ODFWMEguMDczMjQyMTlaIi8+CiAgICA8cGF0aCBpZD0iZm9udF84XzE1IiBkPSJNLjM2MDM1MTU3IC4wNzcxNDg0NEMuMzkwNjI1IC4wNzcxNDg0NCAuNDE3MTU0OTUgLjA4MDQ4NTAyIC40Mzk5NDE0IC4wODcxNTgyIC40NjI3Mjc4OCAuMDkzODQxNTUgLjQ4MTI4MjU3IC4xMDI5NjYzMSAuNDk1NjA1NDggLjExNDUzMjQ3IC41MDk5Mjg0IC4xMjYwOTg2NCAuNTIxNDg0NCAuMTQwNTEzMSAuNTMwMjczNDYgLjE1Nzc3NTg4IC41MzkwNjI1IC4xNzUwMzg2NSAuNTQ1MTY2IC4xOTMxOTY2MSAuNTQ4NTg0IC4yMTIyNDk3NiAuNTUyMDAxOTggLjIzMTMxMzA3IC41NTM3MTA5NiAuMjUyNzM2NDMgLjU1MzcxMDk2IC4yNzY1MTk3OVYuNzA4MDA3OEguNjQxNjAxNTlWLjI3NjA3NzI4Qy42NDE2MDE1OSAuMDg4MTE5NTEgLjU0Nzg1MTU5LS4wMDU4NTkzNzUgLjM2MDM1MTU3LS4wMDU4NTkzNzUgLjE3MjUyNjA1LS4wMDU4NTkzNzUgLjA3ODYxMzI4IC4wODgxMTk1MSAuMDc4NjEzMjggLjI3NjA3NzI4Vi43MDgwMDc4SC4xNjY1MDM5Vi4yNzY1MTk3OUMuMTY2NTAzOSAuMjQ2MjI2IC4xNjk0MzM2IC4yMTk3NTcwOCAuMTc1MjkyOTcgLjE5NzExMzA0IC4xODExNTIzNSAuMTc0NDY5IC4xOTA5OTkzNSAuMTUzNzgzMTYgLjIwNDgzMzk5IC4xMzUwNTU1NCAuMjE4NjY4NjMgLjExNjMyNzkyIC4yMzg2MDY3NyAuMTAxOTk0ODM4IC4yNjQ2NDg0NSAuMDkyMDU2Mjc4IC4yOTA2OTAxIC4wODIxMTc3MTcgLjMyMjU5MTE3IC4wNzcxNDg0NCAuMzYwMzUxNTcgLjA3NzE0ODQ0WiIvPgogICAgPHBhdGggaWQ9ImZvbnRfOF8xIiBkPSJNLjA3NDIxODc1IDBWLjcwODAwNzhILjE2MjEwOTM4TC40MTU1MjczNSAuMDY0OTQxNDA5IC42Njg5NDUzIC43MDgwMDc4SC43NTY4MzU5NlYwSC42Njg5NDUzVi40NjI5NjY5M0wuNDg2MzI4MTMgMEguMzQ0NzI2NTdMLjE2MjEwOTM4IC40NzA5NDcyOFYwSC4wNzQyMTg3NVoiLz4KICA8L2RlZnM+Cjx1c2UgZGF0YS10ZXh0PSJTIiB4bGluazpocmVmPSIjZm9udF84XzE2IiB0cmFuc2Zvcm09Im1hdHJpeCg0Ny45NzA5MjYsMCwwLC00Ny45NzA5MjYsMTQuMzk0NTI5LDY2Ljg1NTQxKSIgZmlsbD0iI2ZmZmZmZiIvPgogIDx1c2UgZGF0YS10ZXh0PSJPIiB4bGluazpocmVmPSIjZm9udF84XzciIHRyYW5zZm9ybT0ibWF0cml4KDQ3Ljk3MDkyNiwwLDAsLTQ3Ljk3MDkyNiw5MS4yOTE5Miw2Ni44NTU0MSkiIGZpbGw9IiNmZmZmZmYiLz4KICA8dXNlIGRhdGEtdGV4dD0iTCIgeGxpbms6aHJlZj0iI2ZvbnRfOF8xNCIgdHJhbnNmb3JtPSJtYXRyaXgoNDcuOTcwOTI2LDAsMCwtNDcuOTcwOTI2LDE3My41MTQxLDY2Ljg1NTQxKSIgZmlsbD0iI2ZmZmZmZiIvPgogIDx1c2UgZGF0YS10ZXh0PSJVIiB4bGluazpocmVmPSIjZm9udF84XzE1IiB0cmFuc2Zvcm09Im1hdHJpeCg0Ny45NzA5MjYsMCwwLC00Ny45NzA5MjYsMjQ1LjEzNDcsNjYuODU1NDEpIiBmaWxsPSIjZmZmZmZmIi8+CiAgPHVzZSBkYXRhLXRleHQ9Ik0iIHhsaW5rOmhyZWY9IiNmb250XzhfMSIgdHJhbnNmb3JtPSJtYXRyaXgoNDcuOTcwOTI2LDAsMCwtNDcuOTcwOTI2LDMyNC43MTg0OSw2Ni44NTU0MSkiIGZpbGw9IiNmZmZmZmYiLz4KPC9zdmc+" alt="SOLUM" width="140" height="26" style="display:block;border:0;" />
          <p style="margin:10px 0 0;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:600;">Your body. Done right.</p>
        </td></tr>

        <!-- Hero -->
        <tr><td style="background:#08090B;padding:48px 48px 36px;">
          <p style="margin:0 0 8px;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:700;">Order Confirmed</p>
          <h1 style="margin:0 0 20px;font-size:44px;font-weight:700;letter-spacing:0.04em;color:#F0ECE2;text-transform:uppercase;line-height:0.95;">Ritual Begins,<br>${firstName}.</h1>
          <div style="width:48px;height:1px;background:#2E6DA4;margin-bottom:20px;"></div>
          <p style="margin:0;font-size:15px;color:rgba(240,236,226,0.65);line-height:1.7;">Your ${kitName} Kit is confirmed. Here's everything you need to know.</p>
        </td></tr>

        <!-- Order ref -->
        <tr><td style="background:#08090B;padding:0 48px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#181C24;border:1px solid #1e2530;">
            <tr><td style="padding:22px 28px;">
              <p style="margin:0 0 6px;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:rgba(240,236,226,0.35);font-weight:600;">Order Reference</p>
              <p style="margin:0 0 4px;font-size:30px;font-weight:700;letter-spacing:0.1em;color:#F0ECE2;">#${orderRef}</p>
              <p style="margin:0;font-size:11px;color:rgba(240,236,226,0.3);letter-spacing:1px;">Keep this for your records</p>
            </td></tr>
          </table>
        </td></tr>

        <!-- What happens next -->
        <tr><td style="background:#08090B;padding:0 48px 48px;">
          <p style="margin:0 0 20px;font-size:9px;letter-spacing:4px;text-transform:uppercase;color:#4A8FC7;font-weight:700;">What Happens Next</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1e2530;">
            <tr><td style="background:#181C24;padding:20px 24px;border-bottom:1px solid #1e2530;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="32" style="font-size:22px;font-weight:700;color:#2E6DA4;vertical-align:top;padding-top:2px;">1</td>
                <td><p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#F0ECE2;">Confirmation email</p><p style="margin:0;font-size:13px;color:rgba(240,236,226,0.45);line-height:1.55;">That's this one. You're all set.</p></td>
              </tr></table>
            </td></tr>
            <tr><td style="background:#181C24;padding:20px 24px;border-bottom:1px solid #1e2530;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="32" style="font-size:22px;font-weight:700;color:#2E6DA4;vertical-align:top;padding-top:2px;">2</td>
                <td><p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#F0ECE2;">${dispatchDate ? `Ships ${dispatchDate}` : 'Kit ships within 2 days'}</p><p style="margin:0;font-size:13px;color:rgba(240,236,226,0.45);line-height:1.55;">Your full ${kitName} Kit — tools and consumables.${arrivalDate ? ` Arrives by ${arrivalDate}.` : ''} You'll get a tracking email when it's on its way.</p></td>
              </tr></table>
            </td></tr>
            ${step3}
            <tr><td style="background:#181C24;padding:20px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="32" style="font-size:22px;font-weight:700;color:#2E6DA4;vertical-align:top;padding-top:2px;">4</td>
                <td><p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#F0ECE2;">Your ritual guide</p><p style="margin:0;font-size:13px;color:rgba(240,236,226,0.45);line-height:1.55;">Full step-by-step for your daily and weekly ritual. Scan the QR code in the box or go to <a href="https://bysolum.co.uk/ritual" style="color:#4A8FC7;text-decoration:none;">bysolum.co.uk/ritual</a></p></td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#08090B;border-top:1px solid #1e2530;padding:28px 48px 36px;">
          <p style="margin:0 0 6px;font-size:12px;color:rgba(240,236,226,0.35);line-height:1.7;">Questions? Email us at <a href="mailto:contact@bysolum.com" style="color:#4A8FC7;text-decoration:none;">contact@bysolum.com</a></p>
          <p style="margin:0;font-size:11px;color:rgba(240,236,226,0.2);letter-spacing:1px;">SOLUM &nbsp;·&nbsp; bysolum.co.uk &nbsp;·&nbsp; Your body. Done right.</p>
          ${footerLine}
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'SOLUM <no-reply@orders.bysolum.co.uk>',
      to: email,
      subject: `Order confirmed. Your ${kitName} Kit is on its way.`,
      html,
    }),
  }).catch(e => console.error('Resend error:', e));
}

async function logEvent(
  supabase: ReturnType<typeof createClient>,
  stripe_event_id: string,
  event_type: string,
  customer_id: string | null,
  data: Record<string, unknown>
) {
  await supabase.from('events').insert({ stripe_event_id, event_type, customer_id, data });
}

async function sha256hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sendTikTokPurchaseEvent(opts: {
  email?: string | null;
  phone?: string | null;
  kitId?: string | null;
  kitName: string;
  amountPence: number;
  eventId: string;
}) {
  const accessToken = Deno.env.get('TIKTOK_EVENTS_ACCESS_TOKEN');
  if (!accessToken) { console.warn('TIKTOK_EVENTS_ACCESS_TOKEN not set — skipping TikTok event'); return; }

  const user: Record<string, string> = {};
  if (opts.email) user['email'] = await sha256hex(opts.email);
  if (opts.phone) user['phone_number'] = await sha256hex(opts.phone.replace(/\D/g, ''));

  try {
    const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
      method: 'POST',
      headers: { 'Authorization': `TikTok ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pixel_id: 'D8NHU2RC77UCVEHVNJNG',
        event: 'CompletePayment',
        event_time: Math.floor(Date.now() / 1000),
        event_id: opts.eventId,
        event_source: 'web',
        event_source_id: 'https://bysolum.co.uk',
        user,
        properties: {
          value: (opts.amountPence / 100).toFixed(2),
          currency: 'GBP',
          content_name: opts.kitName,
          content_type: 'product',
          content_id: opts.kitId ?? 'unknown',
        },
      }),
    });
    const result = await res.json();
    if (result.code !== 0) console.error('tiktok_events_api_error', JSON.stringify(result));
    else console.log('tiktok_events_api_ok', opts.eventId);
  } catch (err) {
    console.error('tiktok_events_api_throw', err.message);
  }
}

async function handleOneTimeOrderFromPI(
  pi: Stripe.PaymentIntent,
  supabase: ReturnType<typeof createClient>,
) {
  const { kit_id, first_name, last_name, source, email: metaEmail, phone, dispatch_date, arrival_date } = pi.metadata ?? {};
  const email = metaEmail?.trim().toLowerCase();
  const stripe_customer_id = pi.customer as string;

  if (!pi.id) throw new Error('one_time_order_from_pi_missing_id');

  // Idempotency: skip if already processed
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('stripe_payment_id', pi.id)
    .eq('order_type', 'first_box')
    .maybeSingle();
  if (existingOrder) return;

  // Upsert customer
  const { data: customer, error: customerErr } = await supabase
    .from('customers')
    .upsert({
      email,
      first_name,
      last_name: last_name || null,
      stripe_customer_id,
      kit_id,
    }, { onConflict: 'email' })
    .select()
    .single();

  if (!customer) throw new Error(`one_time_pi_customer_upsert_failed: ${customerErr?.message}`);

  // Insert order
  const { data: order, error: orderErr } = await supabase.from('orders').insert({
    customer_id: customer.id,
    subscription_id: null,
    stripe_payment_id: pi.id,
    kit_id,
    order_type: 'first_box',
    box_number: null,
    amount_pence: pi.amount,
    status: 'paid',
    source,
  }).select('id').single();

  if (orderErr) throw new Error(`one_time_pi_order_insert_failed: ${orderErr.message}`);

  // Deduct inventory
  if (kit_id && order?.id) {
    await deductInventory(supabase, kit_id, 'first_box', order.id);
  }

  // Mark lead completed
  await supabase.from('leads')
    .update({ checkout_status: 'completed', updated_at: new Date().toISOString() })
    .eq('stripe_session_id', pi.id);

  // Send confirmation email + TikTok server-side event
  if (email && order) {
    const orderRef = pi.id.slice(-8).toUpperCase();
    await sendConfirmationEmail(email, first_name ?? 'there', kit_id ?? '', orderRef, true, dispatch_date, arrival_date);
    await sendTikTokPurchaseEvent({ email, phone, kitId: kit_id, kitName: KIT_NAMES[kit_id ?? ''] ?? 'SOLUM', amountPence: pi.amount, eventId: pi.id });
  }

  // Store shipping address from pi.shipping
  const sh = pi.shipping;
  if (sh?.address && customer) {
    await supabase.from('addresses').upsert({
      customer_id: customer.id,
      stripe_session_id: pi.id,
      name: sh.name ?? '',
      line1: sh.address.line1 ?? '',
      line2: sh.address.line2 ?? null,
      city: sh.address.city ?? '',
      postcode: sh.address.postal_code ?? '',
      country: sh.address.country ?? 'GB',
      phone: phone ?? null,
      is_current: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'stripe_session_id' });
  }
}

async function handleOneTimeOrder(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof createClient>,
) {
  const { kit_id, first_name, last_name, source } = session.metadata ?? {};
  const email = (session.customer_details?.email ?? session.customer_email)?.trim().toLowerCase();
  const phone = session.customer_details?.phone ?? null;
  const stripe_customer_id = session.customer as string;

  // Upsert customer (no subscription fields)
  const { data: customer, error: customerErr } = await supabase
    .from('customers')
    .upsert({
      email,
      first_name,
      last_name: last_name || null,
      stripe_customer_id,
      kit_id,
    }, { onConflict: 'email' })
    .select()
    .single();

  if (!customer) throw new Error(`one_time_customer_upsert_failed: ${customerErr?.message}`);

  const paymentIntentId = session.payment_intent as string;
  if (!paymentIntentId) throw new Error('one_time_order_missing_payment_intent');

  // Idempotency: skip if this payment_intent was already processed
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id')
    .eq('stripe_payment_id', paymentIntentId)
    .eq('order_type', 'first_box')
    .maybeSingle();
  if (existingOrder) return;

  // Insert order with source, no subscription_id
  const { data: order, error: orderErr } = await supabase.from('orders').insert({
    customer_id: customer.id,
    subscription_id: null,
    stripe_payment_id: paymentIntentId,
    kit_id,
    order_type: 'first_box',
    box_number: null,
    amount_pence: session.amount_total ?? 0,
    status: 'paid',
    source,
  }).select('id').single();

  if (orderErr) throw new Error(`one_time_order_insert_failed: ${orderErr.message}`);

  // Deduct inventory
  if (kit_id && order?.id) {
    await deductInventory(supabase, kit_id, 'first_box', order.id);
  }

  // Mark lead completed
  await supabase.from('leads')
    .update({ checkout_status: 'completed', updated_at: new Date().toISOString() })
    .eq('stripe_session_id', session.id);

  // Send confirmation email + TikTok server-side event
  if (email && order) {
    const orderRef = session.id.slice(-8).toUpperCase();
    await sendConfirmationEmail(email, first_name ?? 'there', kit_id ?? '', orderRef, true);
    await sendTikTokPurchaseEvent({ email, phone, kitId: kit_id, kitName: KIT_NAMES[kit_id ?? ''] ?? 'SOLUM', amountPence: session.amount_total ?? 0, eventId: paymentIntentId });
  }

  // Store shipping address
  const sd = (session as any).collected_information?.shipping_details ?? session.shipping_details;
  if (sd?.address && customer) {
    await supabase.from('addresses').upsert({
      customer_id: customer.id,
      stripe_session_id: session.id,
      name: sd.name ?? '',
      line1: sd.address.line1 ?? '',
      line2: sd.address.line2 ?? null,
      city: sd.address.city ?? '',
      postcode: sd.address.postal_code ?? '',
      country: sd.address.country ?? 'GB',
      phone,
      is_current: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'stripe_session_id' });
  }
}

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature')!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { kit_id, first_name, last_name, birth_year, birth_month, first_charge_ts, monthly_pence } = session.metadata ?? {};
        const email = (session.customer_details?.email ?? session.customer_email)?.trim().toLowerCase();
        const phone = session.customer_details?.phone ?? null;
        const stripe_customer_id = session.customer as string;

        // One-time purchase: source present in metadata → skip subscription creation
        if (session.metadata?.source) {
          await handleOneTimeOrder(session, supabase);
          break;
        }

        // Payment mode: session.subscription is null — create subscription using saved card
        let stripe_subscription_id = session.subscription as string | null;
        if (!stripe_subscription_id && session.payment_intent) {
          try {
            const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string);
            const paymentMethodId = pi.payment_method as string;

            const recurringPrice = await stripe.prices.create({
              currency: 'gbp',
              unit_amount: parseInt(monthly_pence ?? '4800'),
              recurring: { interval: 'month' },
              product_data: { name: `SOLUM ${KIT_NAMES[kit_id ?? ''] ?? (kit_id ?? '').toUpperCase()} — Monthly Refill` },
            });

            const trialEnd = first_charge_ts
              ? parseInt(first_charge_ts)
              : Math.floor(Date.now() / 1000) + 30 * 24 * 3600;

            const stripeSub = await stripe.subscriptions.create({
              customer: stripe_customer_id,
              items: [{ price: recurringPrice.id }],
              trial_end: trialEnd,
              default_payment_method: paymentMethodId,
              metadata: { kit_id: kit_id ?? '', birth_year: birth_year?.toString() ?? '', birth_month: birth_month?.toString() ?? '' },
            });
            stripe_subscription_id = stripeSub.id;
          } catch (subErr) {
            console.error('SUBSCRIPTION_CREATE_ERROR', subErr.message, { stripe_customer_id, kit_id });
            // Don't throw — order is still recorded, admin can fix manually
          }
        }

        // Upsert customer
        const { data: customer, error: customerErr } = await supabase
          .from('customers')
          .upsert({
            email,
            first_name,
            last_name,
            birth_year: birth_year ? parseInt(birth_year) : null,
            birth_month: birth_month ? parseInt(birth_month) : null,
            stripe_customer_id,
            kit_id,
            subscribed_at: new Date().toISOString(),
          }, { onConflict: 'email' })
          .select()
          .single();

        if (!customer) throw new Error(`customer_upsert_failed: ${customerErr?.message} — email=${email} stripe_cid=${stripe_customer_id}`);

        // Look up any previous subscriptions for this customer to track returning customers
        const { data: previousSubs } = await supabase
          .from('subscriptions')
          .select('id, subscription_number')
          .eq('customer_id', customer.id)
          .order('subscription_number', { ascending: false })
          .limit(1);

        const previousSub = previousSubs?.[0] ?? null;
        const subscriptionNumber = previousSub ? previousSub.subscription_number + 1 : 1;

        // Upsert subscription record — idempotent so webhook replays don't crash
        const { data: sub } = await supabase
          .from('subscriptions')
          .upsert({
            customer_id: customer.id,
            stripe_subscription_id,
            kit_id,
            status: 'active',
            months_active: 0,
            subscription_number: subscriptionNumber,
            previous_subscription_id: previousSub?.id ?? null,
            payment_status: 'active',
            last_payment_at: new Date().toISOString(),
          }, { onConflict: 'stripe_subscription_id' })
          .select()
          .single();

        // Set next_payment_due from the subscription's trial_end (= first billing date)
        if (sub) {
          try {
            const stripeSub = await stripe.subscriptions.retrieve(stripe_subscription_id);
            if (stripeSub.trial_end) {
              await supabase.from('subscriptions').update({
                next_payment_due: new Date(stripeSub.trial_end * 1000).toISOString(),
              }).eq('id', sub.id);
            }
          } catch { /* non-critical */ }
        }

        // Create first_box order only if it doesn't already exist
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('subscription_id', sub?.id)
          .eq('order_type', 'first_box')
          .maybeSingle();

        let firstBoxOrderId: string | null = existingOrder?.id ?? null;
        if (!existingOrder) {
          const { data: newOrder } = await supabase.from('orders').insert({
            customer_id: customer.id,
            subscription_id: sub?.id,
            stripe_payment_id: session.payment_intent as string,
            kit_id,
            order_type: 'first_box',
            box_number: null,
            amount_pence: session.amount_total ?? 0,
            status: 'paid',
          }).select('id').single();
          firstBoxOrderId = newOrder?.id ?? null;
        }

        // Log first-box payment attempt
        if (session.payment_status === 'paid' && customer) {
          await supabase.from('payment_attempts').insert({
            customer_id: customer.id,
            order_id: firstBoxOrderId,
            stripe_invoice_id: (session.invoice as string) ?? null,
            stripe_payment_intent_id: (session.payment_intent as string) ?? null,
            amount_pence: session.amount_total ?? 0,
            status: 'succeeded',
            attempt_number: 1,
          }).select();
        }

        // Deduct first-box inventory
        if (kit_id && sub?.id) {
          await deductInventory(supabase, kit_id, 'first_box', sub.id);
        }

        // Mark lead as completed
        await supabase.from('leads')
          .update({ checkout_status: 'completed', updated_at: new Date().toISOString() })
          .eq('stripe_session_id', session.id);

        // Send confirmation email + TikTok server-side event — only on first processing
        if (email && !existingOrder) {
          const orderRef = session.id.slice(-8).toUpperCase();
          await sendConfirmationEmail(email, first_name ?? 'there', kit_id, orderRef, false);
          await sendTikTokPurchaseEvent({ email, phone, kitId: kit_id, kitName: KIT_NAMES[kit_id ?? ''] ?? 'SOLUM', amountPence: session.amount_total ?? 0, eventId: session.payment_intent as string ?? session.id });
        }

        // Store shipping address (null guard + idempotency via stripe_session_id unique index)
        // Stripe API 2026-02+ moved shipping_details into collected_information; fall back to top-level for older sessions
        const sd = (session as any).collected_information?.shipping_details ?? session.shipping_details;
        if (sd?.address && customer) {
          const { error: addrErr } = await supabase.from('addresses').upsert({
            customer_id:       customer.id,
            stripe_session_id: session.id,
            name:              sd.name ?? '',
            line1:             sd.address.line1 ?? '',
            line2:             sd.address.line2 ?? null,
            city:              sd.address.city ?? '',
            postcode:          sd.address.postal_code ?? '',
            country:           sd.address.country ?? 'GB',
            phone:             phone,
            is_current:        true,
            updated_at:        new Date().toISOString(),
          }, { onConflict: 'stripe_session_id' });
          if (addrErr) console.error('address_insert_error', JSON.stringify(addrErr));
        } else {
          console.warn('No shipping_details on session', session.id);
        }

        break;
      }

      case 'payment_intent.succeeded': {
        // Fires for integrated checkout (non-redirect flow using PaymentElement)
        const pi = event.data.object as Stripe.PaymentIntent;

        // Only process intents created by our checkout (has kit_id metadata)
        if (!pi.metadata?.kit_id) break;

        // One-time order (first_batch / gift / tiktok_shop) — no subscription
        const oneTimeSources = ['first_batch', 'gift', 'tiktok_shop'];
        if (pi.metadata?.source && oneTimeSources.includes(pi.metadata.source)) {
          await handleOneTimeOrderFromPI(pi, supabase);
          break;
        }

        const { kit_id, email, first_name, last_name, birth_year, birth_month, first_charge_ts, monthly_pence, phone } = pi.metadata;
        const stripe_customer_id = pi.customer as string;

        // Upsert customer
        const { data: customer, error: customerErr } = await supabase
          .from('customers')
          .upsert({
            email: email?.trim().toLowerCase(),
            first_name,
            last_name: last_name || null,
            birth_year: birth_year ? parseInt(birth_year) : null,
            birth_month: birth_month ? parseInt(birth_month) : null,
            phone: phone || null,
            stripe_customer_id,
            kit_id,
            subscribed_at: new Date().toISOString(),
          }, { onConflict: 'email' })
          .select()
          .single();

        if (!customer) {
          console.error('PI_CUSTOMER_UPSERT_FAILED', customerErr?.message, { stripe_customer_id });
          break;
        }

        // Create Stripe subscription using saved card
        let stripe_subscription_id: string | null = null;
        try {
          const paymentMethodId = pi.payment_method as string;
          const recurringPrice = await stripe.prices.create({
            currency: 'gbp',
            unit_amount: parseInt(monthly_pence ?? '4800'),
            recurring: { interval: 'month' },
            product_data: { name: `SOLUM ${KIT_NAMES[kit_id ?? ''] ?? (kit_id ?? '').toUpperCase()} — Monthly Refill` },
          });
          const trialEnd = first_charge_ts
            ? parseInt(first_charge_ts)
            : Math.floor(Date.now() / 1000) + 30 * 24 * 3600;
          const stripeSub = await stripe.subscriptions.create({
            customer: stripe_customer_id,
            items: [{ price: recurringPrice.id }],
            trial_end: trialEnd,
            default_payment_method: paymentMethodId,
            metadata: { kit_id: kit_id ?? '', birth_year, birth_month },
          });
          stripe_subscription_id = stripeSub.id;
        } catch (subErr) {
          console.error('PI_SUBSCRIPTION_CREATE_ERROR', subErr.message, { stripe_customer_id, kit_id });
        }

        // Look up prior subscriptions for numbering
        const { data: previousSubs } = await supabase
          .from('subscriptions')
          .select('id, subscription_number')
          .eq('customer_id', customer.id)
          .order('subscription_number', { ascending: false })
          .limit(1);

        const subscriptionNumber = previousSubs?.[0] ? previousSubs[0].subscription_number + 1 : 1;

        const { data: sub } = await supabase
          .from('subscriptions')
          .upsert({
            customer_id: customer.id,
            stripe_subscription_id,
            kit_id,
            status: 'active',
            months_active: 0,
            subscription_number: subscriptionNumber,
            payment_status: 'active',
            last_payment_at: new Date().toISOString(),
          }, { onConflict: 'stripe_subscription_id' })
          .select()
          .single();

        // Set next_payment_due from trial_end
        if (sub && stripe_subscription_id) {
          try {
            const stripeSub = await stripe.subscriptions.retrieve(stripe_subscription_id);
            if (stripeSub.trial_end) {
              await supabase.from('subscriptions').update({
                next_payment_due: new Date(stripeSub.trial_end * 1000).toISOString(),
              }).eq('id', sub.id);
            }
          } catch { /* non-critical */ }
        }

        // Check idempotency — don't double-create orders on webhook replay
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('id')
          .eq('stripe_payment_id', pi.id)
          .eq('order_type', 'first_box')
          .maybeSingle();

        if (!existingOrder) {
          await supabase.from('orders').insert({
            customer_id: customer.id,
            subscription_id: sub?.id,
            stripe_payment_id: pi.id,
            kit_id,
            order_type: 'first_box',
            box_number: null,
            amount_pence: pi.amount,
            status: 'paid',
          });
        }

        // Deduct inventory
        if (kit_id && sub?.id) {
          await deductInventory(supabase, kit_id, 'first_box', sub.id);
        }

        // Mark lead completed
        await supabase.from('leads')
          .update({ checkout_status: 'completed', updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', stripe_customer_id);

        // Send confirmation email + TikTok server-side event
        if (!existingOrder) {
          const orderRef = pi.id.slice(-8).toUpperCase();
          await sendConfirmationEmail(email?.trim().toLowerCase() ?? '', first_name ?? 'there', kit_id ?? '', orderRef, false);
          await sendTikTokPurchaseEvent({ email: email?.trim().toLowerCase(), phone, kitId: kit_id, kitName: KIT_NAMES[kit_id ?? ''] ?? 'SOLUM', amountPence: pi.amount, eventId: pi.id });
        }

        // Store address from pi.shipping
        const piShipping = pi.shipping;
        if (piShipping?.address && customer) {
          await supabase.from('addresses').upsert({
            customer_id:       customer.id,
            stripe_session_id: pi.id,
            name:              piShipping.name ?? '',
            line1:             piShipping.address.line1 ?? '',
            line2:             piShipping.address.line2 ?? null,
            city:              piShipping.address.city ?? '',
            postcode:          piShipping.address.postal_code ?? '',
            country:           piShipping.address.country ?? 'GB',
            phone:             phone || null,
            is_current:        true,
            updated_at:        new Date().toISOString(),
          }, { onConflict: 'stripe_session_id' });
        }

        break;
      }

      case 'invoice.paid': {
        // Fires each month after the first — create a refill order and increment months_active
        const invoice = event.data.object as Stripe.Invoice;
        const stripe_subscription_id = invoice.subscription as string;

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*, customers(*)')
          .eq('stripe_subscription_id', stripe_subscription_id)
          .single();

        if (!sub) break;

        // Don't double-count the first invoice (covered by checkout.session.completed)
        if (invoice.billing_reason === 'subscription_create') break;

        const months_active = sub.months_active + 1;

        await supabase
          .from('subscriptions')
          .update({
            months_active,
            current_period_start: new Date(invoice.period_start * 1000).toISOString(),
            current_period_end:   new Date(invoice.period_end   * 1000).toISOString(),
          })
          .eq('id', sub.id);

        const { data: refillOrder } = await supabase.from('orders').insert({
          customer_id: sub.customer_id,
          subscription_id: sub.id,
          stripe_payment_id: invoice.payment_intent as string,
          kit_id: sub.kit_id,
          order_type: 'refill',
          box_number: months_active,
          amount_pence: invoice.amount_paid,
          status: 'paid',
        }).select().single();

        // Deduct refill inventory
        if (sub.kit_id && refillOrder?.id) {
          await deductInventory(supabase, sub.kit_id, 'refill', refillOrder.id);
        }

        // Log payment attempt
        await supabase.from('payment_attempts').insert({
          customer_id: sub.customer_id,
          order_id: refillOrder?.id ?? null,
          stripe_invoice_id: invoice.id,
          stripe_payment_intent_id: invoice.payment_intent as string ?? null,
          amount_pence: invoice.amount_paid,
          status: 'succeeded',
          attempt_number: invoice.attempt_count ?? 1,
        }).select();

        // Reset payment health on subscription
        await supabase.from('subscriptions').update({
          payment_status: 'active',
          consecutive_failures: 0,
          last_payment_at: new Date().toISOString(),
          next_payment_due: new Date(invoice.period_end * 1000).toISOString(),
        }).eq('id', sub.id);

        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'customer.subscription.paused': {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from('subscriptions')
          .update({ status: 'paused' })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'customer.subscription.resumed': {
        const sub = event.data.object as Stripe.Subscription;
        await supabase
          .from('subscriptions')
          .update({ status: 'active' })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const stripe_subscription_id = invoice.subscription as string;

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id, customer_id, consecutive_failures')
          .eq('stripe_subscription_id', stripe_subscription_id)
          .single();

        if (!sub) break;

        // Fetch failure details from the payment intent
        let failure_code: string | null = null;
        let failure_message: string | null = null;
        if (invoice.payment_intent) {
          try {
            const pi = await stripe.paymentIntents.retrieve(invoice.payment_intent as string);
            failure_code = pi.last_payment_error?.decline_code ?? pi.last_payment_error?.code ?? null;
            failure_message = pi.last_payment_error?.message ?? null;
          } catch { /* non-critical */ }
        }

        const attemptNumber = invoice.attempt_count ?? 1;
        const newFailures = (sub.consecutive_failures ?? 0) + 1;

        // Log the failed attempt — upsert to survive webhook replays
        await supabase.from('payment_attempts').upsert({
          customer_id: sub.customer_id,
          stripe_invoice_id: invoice.id,
          stripe_payment_intent_id: invoice.payment_intent as string ?? null,
          amount_pence: invoice.amount_due,
          status: 'failed',
          attempt_number: attemptNumber,
          failure_code,
          failure_message,
        }, { onConflict: 'stripe_invoice_id,attempt_number' });

        const paymentStatus = newFailures >= 4 ? 'unpaid' : 'past_due';
        await supabase.from('subscriptions').update({
          payment_status: paymentStatus,
          consecutive_failures: newFailures,
        }).eq('id', sub.id);

        // All retries exhausted — escalate to payment_issues
        if (newFailures >= 4) {
          const { data: existingIssue } = await supabase
            .from('payment_issues')
            .select('id')
            .eq('stripe_invoice_id', invoice.id)
            .eq('issue_type', 'all_retries_failed')
            .maybeSingle();

          if (!existingIssue) {
            await supabase.from('payment_issues').insert({
              customer_id: sub.customer_id,
              stripe_invoice_id: invoice.id,
              issue_type: 'all_retries_failed',
              total_attempts: attemptNumber,
              last_failure_code: failure_code,
            });
          }
        }

        break;
      }

      case 'invoice.payment_action_required': {
        // 3DS/SCA required (common with UK cards) — same treatment as failed until customer authenticates
        const invoice = event.data.object as Stripe.Invoice;
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', invoice.subscription as string);
        break;
      }

      case 'customer.subscription.updated': {
        // Kit upgrade/downgrade or any subscription change — keep kit_id in sync
        const sub = event.data.object as Stripe.Subscription;
        const kit_id = sub.metadata?.kit_id;
        const update: Record<string, string> = { status: sub.status };
        if (kit_id) update.kit_id = kit_id;
        await supabase
          .from('subscriptions')
          .update(update)
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        const disputePiId = dispute.payment_intent as string;

        await supabase
          .from('orders')
          .update({ status: 'disputed' })
          .eq('stripe_payment_id', disputePiId);

        // Look up customer via order
        const { data: disputeOrder } = await supabase
          .from('orders')
          .select('customer_id')
          .eq('stripe_payment_id', disputePiId)
          .maybeSingle();

        if (disputeOrder?.customer_id) {
          const { data: existingDispute } = await supabase
            .from('payment_issues')
            .select('id')
            .eq('stripe_invoice_id', disputePiId)
            .eq('issue_type', 'disputed')
            .maybeSingle();

          if (!existingDispute) {
            await supabase.from('payment_issues').insert({
              customer_id: disputeOrder.customer_id,
              stripe_invoice_id: disputePiId,
              issue_type: 'disputed',
              total_attempts: 1,
              last_failure_code: dispute.reason,
            });
          }
        }

        await logEvent(supabase, event.id, event.type, disputeOrder?.customer_id ?? null, {
          dispute_id: dispute.id, reason: dispute.reason, amount_pence: dispute.amount,
        });
        break;
      }

      // ── Behavioural events ──────────────────────────────────────

      case 'payment_intent.payment_failed': {
        // Card declined — capture the decline reason on the lead
        const intent = event.data.object as Stripe.PaymentIntent;
        const decline_reason =
          intent.last_payment_error?.decline_code ??
          intent.last_payment_error?.code ??
          'unknown';
        await supabase.from('leads')
          .update({
            checkout_status: 'payment_failed',
            decline_reason,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', intent.customer as string)
          .eq('checkout_status', 'initiated');
        break;
      }

      case 'checkout.session.expired': {
        // High-intent abandonment — went to Stripe, didn't complete
        const session = event.data.object as Stripe.Checkout.Session;
        await supabase.from('leads')
          .update({ checkout_status: 'expired', updated_at: new Date().toISOString() })
          .eq('stripe_session_id', session.id);
        await logEvent(supabase, event.id, event.type, null, {
          kit_id: session.metadata?.kit_id,
          email: session.customer_details?.email ?? session.customer_email,
        });
        break;
      }

      case 'billing_portal.session.created': {
        // Customer opened billing portal — potential churn signal
        const portal = event.data.object as { customer: string; return_url?: string };
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('stripe_customer_id', portal.customer)
          .single();
        await logEvent(supabase, event.id, event.type, customer?.id ?? null, {
          stripe_customer_id: portal.customer,
        });
        break;
      }

      case 'payment_method.attached': {
        // Customer added / updated card — often recovering from past_due
        const pm = event.data.object as Stripe.PaymentMethod;
        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('stripe_customer_id', pm.customer as string)
          .single();
        // Restore active status if they were past_due
        if (customer) {
          await supabase
            .from('subscriptions')
            .update({ status: 'active' })
            .eq('customer_id', customer.id)
            .eq('status', 'past_due');
        }
        await logEvent(supabase, event.id, event.type, customer?.id ?? null, {
          card_brand: pm.card?.brand, card_last4: pm.card?.last4,
        });
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await supabase
          .from('orders')
          .update({ status: 'refunded' })
          .eq('stripe_payment_id', charge.payment_intent as string);
        await logEvent(supabase, event.id, event.type, null, {
          amount_refunded_pence: charge.amount_refunded, reason: charge.refunds?.data[0]?.reason,
        });
        break;
      }

      case 'invoice.upcoming': {
        // 7 days before renewal — useful for pre-shipment comms and loyalty prompts
        const invoice = event.data.object as Stripe.Invoice;
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('id, customer_id, months_active, kit_id')
          .eq('stripe_subscription_id', invoice.subscription as string)
          .single();
        await logEvent(supabase, event.id, event.type, sub?.customer_id ?? null, {
          subscription_id: sub?.id,
          months_active: sub?.months_active,
          kit_id: sub?.kit_id,
          next_box_number: (sub?.months_active ?? 0) + 1,
          amount_pence: invoice.amount_due,
        });
        break;
      }

      case 'customer.updated': {
        // Address or email changed — keep shipping details in sync
        const cust = event.data.object as Stripe.Customer;
        const update: Record<string, string | null> = {};
        if (typeof cust.email === 'string') update.email = cust.email;
        if (cust.name) {
          const parts = cust.name.trim().split(' ');
          update.first_name = parts[0];
          update.last_name  = parts.slice(1).join(' ') || null;
        }
        if (Object.keys(update).length > 0) {
          await supabase.from('customers').update(update).eq('stripe_customer_id', cust.id);
        }
        await logEvent(supabase, event.id, event.type, null, { stripe_customer_id: cust.id });
        break;
      }

      case 'charge.dispute.funds_withdrawn':
      case 'charge.dispute.closed': {
        const dispute = event.data.object as Stripe.Dispute;
        await logEvent(supabase, event.id, event.type, null, {
          dispute_id: dispute.id,
          status: dispute.status,
          outcome: (dispute as Record<string, unknown>).outcome ?? null,
        });
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err) {
    console.error(err);
    return new Response(`Handler error: ${err.message}`, { status: 500 });
  }
});
