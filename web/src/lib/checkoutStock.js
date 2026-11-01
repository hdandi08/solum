export async function readCheckoutInventory(url, headers) {
  const response = await fetch(`${url}/functions/v1/get-inventory-status`, {
    headers, cache: 'no-store', signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Stock could not be checked.');
  const data = await response.json();
  if (!data.kits || typeof data.kits !== 'object') throw new Error('Stock could not be checked.');
  return data.kits;
}

export async function saveStockWaitlist(url, headers, form, kitId) {
  const response = await fetch(`${url}/functions/v1/join-waitlist`, {
    method: 'POST',
    headers: {
      ...(headers.apikey ? { Authorization: `Bearer ${headers.apikey}` } : {}),
      ...headers, 'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      email: form.email.trim().toLowerCase(),
      first_name: form.first_name?.trim() || null,
      last_name: form.last_name?.trim() || null,
      phone: form.phone?.trim() || null,
      source: `buy-soldout-${kitId}`,
    }),
  });
  const data = await response.json();
  if (response.status === 409 && data.code === 'already_on_waitlist') return { status: 'existing' };
  if (!response.ok || data.success !== true) {
    throw new Error(data.error || 'We could not save your details. Please try again.');
  }
  return { status: 'created' };
}
