// deno-lint-ignore-file no-import-prefix -- Match the repository's pinned Deno test dependency.
import {
  assertEquals,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildConversionOrder,
  createAwinConversionWorker,
  type DeliveryRepository,
  type OutboxRow,
  parseConversionResponse,
  resolveAwinConversionEndpoint,
  sendConversionBatch,
} from "./awinConversionApi.ts";
import { encryptAwc } from "./awinOutbox.ts";
import { createAwinConversionRepository } from "../awin-conversion-worker/index.ts";

const ENCRYPTION_SECRET = "development-secret-development-secret";
const WORKER_SECRET = "worker-secret-worker-secret-worker-secret";
const API_KEY = "development-api-key";
const NOW = Date.parse("2026-08-12T12:00:00.000Z");

function order(overrides: Partial<OutboxRow> = {}): OutboxRow {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    order_ref: "pi_123",
    amount_pence: 7_083,
    currency: "GBP",
    channel: "aw",
    commission_group: "DEFAULT",
    voucher_code: null,
    awc_ciphertext: "set-by-test",
    attempt_count: 1,
    created_at: "2026-08-12T11:59:45.000Z",
    ...overrides,
  };
}

type StoredTransition =
  | { state: "processing"; row: OutboxRow }
  | {
    state: "accepted";
    row: OutboxRow;
    status: 202;
    batchId: string;
    nextReconcileAt: string;
  }
  | {
    state: "sent";
    row: OutboxRow;
    status: number;
    batchId?: string;
    transactionId?: string;
  }
  | {
    state: "retry" | "dead_letter";
    row: OutboxRow;
    status?: number;
    errorCode: string;
    nextAttemptAt?: string;
  };

class MemoryRepository implements DeliveryRepository {
  readonly stored = new Map<string, StoredTransition>();
  claimInput?: { limit: number; workerId: string; leaseSeconds: number };

  constructor(private readonly rows: OutboxRow[]) {
    for (const row of rows) {
      this.stored.set(row.id, { state: "processing", row });
    }
  }

  claim(input: { limit: number; workerId: string; leaseSeconds: number }) {
    this.claimInput = input;
    return Promise.resolve(this.rows.slice(0, input.limit));
  }

  complete(input: {
    id: string;
    workerId: string;
    status: number;
    batchId?: string;
    transactionId?: string;
  }) {
    const current = this.stored.get(input.id);
    if (!current || current.state !== "processing") {
      return Promise.resolve(false);
    }
    this.stored.set(input.id, {
      state: "sent",
      row: current.row,
      status: input.status,
      ...(input.batchId ? { batchId: input.batchId } : {}),
      ...(input.transactionId ? { transactionId: input.transactionId } : {}),
    });
    return Promise.resolve(true);
  }

  retry(input: {
    id: string;
    workerId: string;
    state: "retry" | "dead_letter";
    nextAttemptAt?: string;
    status?: number;
    errorCode: string;
  }) {
    const current = this.stored.get(input.id);
    if (!current || current.state !== "processing") {
      return Promise.resolve(false);
    }
    this.stored.set(input.id, {
      state: input.state,
      row: current.row,
      ...(input.status ? { status: input.status } : {}),
      errorCode: input.errorCode,
      ...(input.nextAttemptAt ? { nextAttemptAt: input.nextAttemptAt } : {}),
    });
    return Promise.resolve(true);
  }

  accept(input: {
    id: string;
    workerId: string;
    status: 202;
    batchId: string;
    nextReconcileAt: string;
  }) {
    const current = this.stored.get(input.id);
    if (!current || current.state !== "processing") {
      return Promise.resolve(false);
    }
    this.stored.set(input.id, {
      state: "accepted",
      row: current.row,
      status: input.status,
      batchId: input.batchId,
      nextReconcileAt: input.nextReconcileAt,
    });
    return Promise.resolve(true);
  }
}

function jsonRequest(body: unknown, authorization = `Bearer ${WORKER_SECRET}`) {
  return new Request("https://worker.test/awin-conversion-worker", {
    method: "POST",
    headers: {
      authorization,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

Deno.test("builds the authenticated AWIN order payload from immutable outbox amount", () => {
  assertEquals(
    buildConversionOrder({
      orderRef: "pi_123",
      amountPence: 7_083,
      currency: "GBP",
      channel: "aw",
      awc: "129171_click",
      commissionGroup: "DEFAULT",
      customerAcquisition: "NEW",
      voucherCode: "RITUAL10",
    }),
    {
      orderReference: "pi_123",
      amount: 70.83,
      channel: "aw",
      currency: "GBP",
      awc: "129171_click",
      customerAcquisition: "NEW",
      voucher: "RITUAL10",
      commissionGroups: [{ code: "DEFAULT", amount: 70.83 }],
      custom: { "1": "solum-outbox-v1" },
    },
  );
});

Deno.test("parses 206 outcomes independently per order reference", () => {
  const outcomes = parseConversionResponse(206, {
    batchId: "batch-1",
    successfulOrders: [{ orderReference: "pi_ok", correlationId: "c1" }],
    failedOrders: [{
      order: { orderReference: "pi_bad" },
      errors: [{ field: "awc", message: "invalid" }],
    }],
  });

  assertEquals(outcomes.get("pi_ok")?.state, "sent");
  assertEquals(outcomes.get("pi_bad")?.state, "dead_letter");
});

Deno.test("omits unknown acquisition and absent voucher and rejects invalid payload fields", () => {
  const built = buildConversionOrder({
    orderRef: "pi_ABC123",
    amountPence: 1,
    currency: "GBP",
    channel: "email",
    awc: "129171_click",
    commissionGroup: "DEFAULT",
  });
  assertEquals(built.amount, 0.01);
  assertEquals(built.commissionGroups[0].amount, 0.01);
  assertEquals("customerAcquisition" in built, false);
  assertEquals("voucher" in built, false);
  assertThrows(
    () =>
      buildConversionOrder({
        orderRef: "pi_ABC123",
        amountPence: 100,
        currency: "GBP",
        channel: "aw",
        awc: "129171_click",
        commissionGroup: "DEFAULT",
        voucherCode: "  ",
      }),
    TypeError,
    "voucher",
  );
  assertThrows(
    () =>
      buildConversionOrder({
        orderRef: "pi_ABC123",
        amountPence: 100,
        currency: "GBP",
        channel: "aw",
        awc: "129171_click",
        commissionGroup: "DEFAULT",
        customerAcquisition: "UNKNOWN" as never,
      }),
    TypeError,
    "customerAcquisition",
  );
});

Deno.test("parses 200, 202, and conflicting 206 entries without leaking provider errors", () => {
  assertEquals(
    parseConversionResponse(200, {
      batchId: "batch-200",
      successfulOrders: [{ orderReference: "pi_ok", correlationId: "c-ok" }],
    }).get("pi_ok"),
    {
      state: "sent",
      status: 200,
      batchId: "batch-200",
      providerTransactionId: "c-ok",
    },
  );

  assertEquals(
    parseConversionResponse(202, {
      batchId: "batch-202",
      pendingOrders: [{ orderReference: "pi_pending" }],
    }).get("pi_pending"),
    { state: "processing", status: 202, batchId: "batch-202" },
  );

  const conflict = parseConversionResponse(206, {
    batchId: "batch-206",
    successfulOrders: [{ orderReference: "pi_conflict" }],
    failedOrders: [{
      orderReference: "pi_conflict",
      message: "raw provider secret detail",
    }],
  }).get("pi_conflict");
  assertEquals(conflict, {
    state: "retry",
    status: 206,
    errorCode: "UNKNOWN_PROVIDER_RESPONSE",
    batchId: "batch-206",
  });
  assertEquals(JSON.stringify(conflict).includes("raw provider"), false);
});

Deno.test("sends the exact authenticated request and covers each claimed reference once", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  const result = await sendConversionBatch({
    orders: [
      buildConversionOrder({
        orderRef: "pi_ok",
        amountPence: 5_000,
        currency: "GBP",
        channel: "aw",
        awc: "129171_click",
        commissionGroup: "DEFAULT",
      }),
      buildConversionOrder({
        orderRef: "pi_missing",
        amountPence: 2_000,
        currency: "GBP",
        channel: "ppc",
        awc: "129171_other",
        commissionGroup: "NEW",
      }),
    ],
    apiKey: API_KEY,
    endpoint: "https://api.awin.com/s2s/advertiser/129171/orders",
    fetch: (url, init) => {
      requestUrl = String(url);
      requestInit = init;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            batchId: "batch-1",
            successfulOrders: [{
              orderReference: "pi_ok",
              correlationId: "c1",
            }],
            failedOrders: [],
          }),
          { status: 206, headers: { "content-type": "application/json" } },
        ),
      );
    },
  });

  assertEquals(requestUrl, "https://api.awin.com/s2s/advertiser/129171/orders");
  assertEquals(requestInit?.method, "POST");
  const headers = new Headers(requestInit?.headers);
  assertEquals(headers.get("content-type"), "application/json");
  assertEquals(headers.get("x-api-key"), API_KEY);
  assertEquals(requestUrl.includes(API_KEY), false);
  assertEquals(JSON.parse(String(requestInit?.body)), {
    orders: [
      {
        orderReference: "pi_ok",
        amount: 50,
        channel: "aw",
        currency: "GBP",
        awc: "129171_click",
        commissionGroups: [{ code: "DEFAULT", amount: 50 }],
        custom: { "1": "solum-outbox-v1" },
      },
      {
        orderReference: "pi_missing",
        amount: 20,
        channel: "ppc",
        currency: "GBP",
        awc: "129171_other",
        commissionGroups: [{ code: "NEW", amount: 20 }],
        custom: { "1": "solum-outbox-v1" },
      },
    ],
  });
  assertEquals([...result.outcomes.keys()].sort(), ["pi_missing", "pi_ok"]);
  assertEquals(result.outcomes.get("pi_ok")?.state, "sent");
  assertEquals(result.outcomes.get("pi_missing"), {
    state: "retry",
    status: 206,
    errorCode: "UNKNOWN_PROVIDER_RESPONSE",
    batchId: "batch-1",
  });
});

Deno.test("classifies 200/202/400/401/403/408/425/429/5xx and malformed responses safely", async () => {
  const cases: Array<{
    status: number;
    body: string;
    state: string;
    errorCode?: string;
  }> = [
    {
      status: 200,
      body: "{}",
      state: "retry",
      errorCode: "UNKNOWN_PROVIDER_RESPONSE",
    },
    { status: 202, body: '{"batchId":"batch-ok"}', state: "processing" },
    {
      status: 202,
      body: "{}",
      state: "retry",
      errorCode: "UNKNOWN_PROVIDER_RESPONSE",
    },
    {
      status: 400,
      body: '{"message":"sensitive validation detail"}',
      state: "dead_letter",
      errorCode: "VALIDATION_FAILED",
    },
    { status: 401, body: "{}", state: "dead_letter", errorCode: "AUTH_FAILED" },
    { status: 403, body: "{}", state: "dead_letter", errorCode: "AUTH_FAILED" },
    {
      status: 408,
      body: "{}",
      state: "retry",
      errorCode: "UNKNOWN_PROVIDER_RESPONSE",
    },
    {
      status: 425,
      body: "{}",
      state: "retry",
      errorCode: "UNKNOWN_PROVIDER_RESPONSE",
    },
    { status: 429, body: "{}", state: "retry", errorCode: "RATE_LIMITED" },
    { status: 500, body: "{}", state: "retry", errorCode: "PROVIDER_5XX" },
    {
      status: 503,
      body: "not-json",
      state: "retry",
      errorCode: "PROVIDER_5XX",
    },
    {
      status: 206,
      body: "not-json",
      state: "retry",
      errorCode: "UNKNOWN_PROVIDER_RESPONSE",
    },
  ];

  for (const testCase of cases) {
    const result = await sendConversionBatch({
      orders: [buildConversionOrder({
        orderRef: "pi_123",
        amountPence: 100,
        currency: "GBP",
        channel: "aw",
        awc: "129171_click",
        commissionGroup: "DEFAULT",
      })],
      apiKey: API_KEY,
      endpoint: "https://api.awin.com/s2s/advertiser/129171/orders",
      fetch: () =>
        Promise.resolve(
          new Response(testCase.body, { status: testCase.status }),
        ),
    });
    const outcome = result.outcomes.get("pi_123");
    assertEquals(outcome?.state, testCase.state, `status ${testCase.status}`);
    assertEquals(
      outcome && "errorCode" in outcome ? outcome.errorCode : undefined,
      testCase.errorCode,
      `status ${testCase.status}`,
    );
    assertEquals(
      JSON.stringify(outcome).includes("sensitive validation"),
      false,
    );
  }
});

Deno.test("honors HTTP-date Retry-After values and caps excessive provider delays", async () => {
  const cases = [
    {
      retryAfter: new Date(NOW + 120_000).toUTCString(),
      expectedDelayMs: 120_000,
    },
    { retryAfter: "604801", expectedDelayMs: 6 * 24 * 60 * 60 * 1_000 },
  ];

  for (const testCase of cases) {
    const result = await sendConversionBatch({
      orders: [buildConversionOrder({
        orderRef: "pi_123",
        amountPence: 100,
        currency: "GBP",
        channel: "aw",
        awc: "129171_click",
        commissionGroup: "DEFAULT",
      })],
      apiKey: API_KEY,
      endpoint: "https://api.awin.com/s2s/advertiser/129171/orders",
      now: () => NOW,
      fetch: () =>
        Promise.resolve(
          new Response("{}", {
            status: 429,
            headers: { "retry-after": testCase.retryAfter },
          }),
        ),
    });
    assertEquals(result.outcomes.get("pi_123"), {
      state: "retry",
      status: 429,
      errorCode: "RATE_LIMITED",
      retryAfterMs: testCase.expectedDelayMs,
    });
  }
});

Deno.test("rejects an oversized declared provider body before reading it", async () => {
  let canceled = false;
  const body = new ReadableStream<Uint8Array>({
    cancel() {
      canceled = true;
    },
  });
  const result = await sendConversionBatch({
    orders: [buildConversionOrder({
      orderRef: "pi_123",
      amountPence: 100,
      currency: "GBP",
      channel: "aw",
      awc: "129171_click",
      commissionGroup: "DEFAULT",
    })],
    apiKey: API_KEY,
    endpoint: "https://api.awin.com/s2s/advertiser/129171/orders",
    fetch: () =>
      Promise.resolve(
        new Response(body, {
          status: 500,
          headers: { "content-length": "65537" },
        }),
      ),
  });

  assertEquals(canceled, true);
  assertEquals(result.outcomes.get("pi_123"), {
    state: "retry",
    status: 500,
    errorCode: "PROVIDER_5XX",
  });
});

Deno.test("cancels a chunked provider response that crosses the byte cap", async () => {
  let canceled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(65_537));
    },
    cancel() {
      canceled = true;
    },
  });
  const result = await sendConversionBatch({
    orders: [buildConversionOrder({
      orderRef: "pi_123",
      amountPence: 100,
      currency: "GBP",
      channel: "aw",
      awc: "129171_click",
      commissionGroup: "DEFAULT",
    })],
    apiKey: API_KEY,
    endpoint: "https://api.awin.com/s2s/advertiser/129171/orders",
    fetch: () => Promise.resolve(new Response(body, { status: 500 })),
  });

  assertEquals(canceled, true);
  assertEquals(result.outcomes.get("pi_123"), {
    state: "retry",
    status: 500,
    errorCode: "PROVIDER_5XX",
  });
});

Deno.test("aborts an AWIN request after exactly five seconds", async () => {
  let timeoutMs = 0;
  let cleared = false;
  await assertRejects(
    () =>
      sendConversionBatch({
        orders: [buildConversionOrder({
          orderRef: "pi_123",
          amountPence: 100,
          currency: "GBP",
          channel: "aw",
          awc: "129171_click",
          commissionGroup: "DEFAULT",
        })],
        apiKey: API_KEY,
        endpoint: "https://api.awin.com/s2s/advertiser/129171/orders",
        fetch: (_url, init) =>
          new Promise((_resolve, reject) => {
            if (init?.signal?.aborted) {
              reject(new DOMException("aborted", "AbortError"));
              return;
            }
            init?.signal?.addEventListener(
              "abort",
              () => reject(new DOMException("aborted", "AbortError")),
            );
          }),
        setTimeout: (callback, ms) => {
          timeoutMs = ms;
          callback();
          return 1;
        },
        clearTimeout: () => {
          cleared = true;
        },
      }),
    DOMException,
    "aborted",
  );
  assertEquals(timeoutMs, 5_000);
  assertEquals(cleared, true);
});

Deno.test("allows the base URL override only for the exact development project ref", () => {
  assertEquals(
    resolveAwinConversionEndpoint(
      "https://rodvvmfzkyjsqbufkjbc.supabase.co",
      "https://127.0.0.1:9443/",
    ),
    "https://127.0.0.1:9443/s2s/advertiser/129171/orders",
  );
  assertEquals(
    resolveAwinConversionEndpoint(
      "https://production.supabase.co",
      "https://attacker.invalid",
    ),
    "https://api.awin.com/s2s/advertiser/129171/orders",
  );
  assertEquals(
    resolveAwinConversionEndpoint(
      "https://rodvvmfzkyjsqbufkjbc.attacker.invalid",
      "http://127.0.0.1:9443",
    ),
    "https://api.awin.com/s2s/advertiser/129171/orders",
  );
  for (const override of [undefined, "http://127.0.0.1:9443", "not a URL"]) {
    assertThrows(
      () =>
        resolveAwinConversionEndpoint(
          "https://rodvvmfzkyjsqbufkjbc.supabase.co",
          override,
        ),
      TypeError,
      "AWIN_CONVERSION_API_BASE_URL",
    );
  }
});

Deno.test("maps delivery transitions to the hardened outbox RPCs", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const repository = createAwinConversionRepository({
    rpc(name, args) {
      calls.push({ name, args });
      if (name === "claim_awin_conversion_batch") {
        return Promise.resolve({ data: [order()], error: null });
      }
      return Promise.resolve({ data: true, error: null });
    },
  });

  assertEquals(
    await repository.claim({
      limit: 2,
      workerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      leaseSeconds: 60,
    }),
    [order()],
  );
  assertEquals(
    await repository.complete({
      id: "11111111-1111-4111-8111-111111111111",
      workerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      status: 200,
      batchId: "batch-200",
    }),
    true,
  );
  assertEquals(
    await repository.retry({
      id: "11111111-1111-4111-8111-111111111111",
      workerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      state: "retry",
      nextAttemptAt: "2026-08-12T12:00:15.000Z",
      status: 429,
      errorCode: "RATE_LIMITED",
    }),
    true,
  );

  assertEquals(calls, [
    {
      name: "claim_awin_conversion_batch",
      args: {
        p_limit: 2,
        p_worker_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        p_lease_seconds: 60,
      },
    },
    {
      name: "complete_awin_conversion",
      args: {
        p_id: "11111111-1111-4111-8111-111111111111",
        p_worker_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        p_http_status: 200,
        p_batch_id: "batch-200",
        p_provider_transaction_id: null,
      },
    },
    {
      name: "retry_awin_conversion",
      args: {
        p_id: "11111111-1111-4111-8111-111111111111",
        p_worker_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        p_state: "retry",
        p_next_attempt_at: "2026-08-12T12:00:15.000Z",
        p_http_status: 429,
        p_error_code: "RATE_LIMITED",
      },
    },
  ]);
});

Deno.test("maps accepted AWIN batches to the reconciliation RPC", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const repository = createAwinConversionRepository({
    rpc(name, args) {
      calls.push({ name, args });
      return Promise.resolve({ data: true, error: null });
    },
  });

  assertEquals(
    await repository.accept({
      id: "11111111-1111-4111-8111-111111111111",
      workerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      status: 202,
      batchId: "batch-202",
      nextReconcileAt: "2026-08-12T12:15:00.000Z",
    }),
    true,
  );
  assertEquals(calls, [{
    name: "accept_awin_conversion_batch",
    args: {
      p_id: "11111111-1111-4111-8111-111111111111",
      p_worker_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      p_http_status: 202,
      p_batch_id: "batch-202",
      p_next_reconcile_at: "2026-08-12T12:15:00.000Z",
    },
  }]);
});

Deno.test("worker rejects non-POST, bad bearer credentials, malformed bodies, and invalid limits", async () => {
  const repository = new MemoryRepository([]);
  const handler = createAwinConversionWorker({
    repository,
    apiKey: API_KEY,
    encryptionKey: ENCRYPTION_SECRET,
    workerSecret: WORKER_SECRET,
    supabaseUrl: "https://production.supabase.co",
    now: () => NOW,
    fetch: () => Promise.reject(new Error("must not send")),
  });
  const cases = [
    {
      request: new Request("https://worker.test", { method: "GET" }),
      status: 405,
    },
    { request: jsonRequest({}, "Bearer wrong"), status: 401 },
    { request: jsonRequest({}, "Basic nope"), status: 401 },
    {
      request: new Request("https://worker.test", {
        method: "POST",
        headers: {
          authorization: `Bearer ${WORKER_SECRET}`,
          "content-type": "application/json",
        },
        body: "{",
      }),
      status: 400,
    },
    { request: jsonRequest({ limit: 0 }), status: 400 },
    { request: jsonRequest({ limit: 101 }), status: 400 },
    { request: jsonRequest({ limit: 1.5 }), status: 400 },
    { request: jsonRequest({ limit: "1" }), status: 400 },
    { request: jsonRequest({ extra: true }), status: 400 },
    {
      request: new Request("https://worker.test", {
        method: "POST",
        headers: {
          authorization: `Bearer ${WORKER_SECRET}`,
          "content-type": "application/json",
          "content-length": "2048",
        },
        body: JSON.stringify({ padding: "x".repeat(1_100) }),
      }),
      status: 400,
    },
  ];

  for (const testCase of cases) {
    const response = await handler(testCase.request);
    assertEquals(response.status, testCase.status);
    assertEquals(await response.json(), {
      claimed: 0,
      accepted: 0,
      sent: 0,
      retried: 0,
      dead_letter: 0,
    });
    assertEquals(response.headers.has("access-control-allow-origin"), false);
  }
  assertEquals(repository.claimInput, undefined);
});

Deno.test("worker claims, waits for minimum age, decrypts, sends, and transitions every row", async () => {
  const encrypted = await encryptAwc("129171_click", ENCRYPTION_SECRET);
  const rows = [
    order({
      awc_ciphertext: encrypted,
      created_at: "2026-08-12T11:59:55.000Z",
    }),
    order({
      id: "22222222-2222-4222-8222-222222222222",
      order_ref: "pi_bad",
      awc_ciphertext: "v1.not-valid.not-valid",
      created_at: "2026-08-12T11:59:56.000Z",
    }),
  ];
  const repository = new MemoryRepository(rows);
  let waitedMs = 0;
  let sentPayload: unknown;
  const handler = createAwinConversionWorker({
    repository,
    apiKey: API_KEY,
    encryptionKey: ENCRYPTION_SECRET,
    workerSecret: WORKER_SECRET,
    supabaseUrl: "https://production.supabase.co",
    now: () => NOW,
    randomUUID: () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    sleep: (ms) => {
      waitedMs = ms;
      return Promise.resolve();
    },
    jitterMs: () => 0,
    fetch: (_url, init) => {
      sentPayload = JSON.parse(String(init?.body));
      return Promise.resolve(
        new Response(
          JSON.stringify({
            batchId: "batch-safe",
            successfulOrders: [{
              orderReference: "pi_123",
              correlationId: "tx-safe",
            }],
          }),
          { status: 200 },
        ),
      );
    },
  });

  const response = await handler(jsonRequest({ limit: 2 }));
  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    claimed: 2,
    accepted: 0,
    sent: 1,
    retried: 0,
    dead_letter: 1,
  });
  assertEquals(repository.claimInput, {
    limit: 2,
    workerId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    leaseSeconds: 60,
  });
  assertEquals(waitedMs, 5_000);
  assertEquals(sentPayload, {
    orders: [{
      orderReference: "pi_123",
      amount: 70.83,
      channel: "aw",
      currency: "GBP",
      awc: "129171_click",
      commissionGroups: [{ code: "DEFAULT", amount: 70.83 }],
      custom: { "1": "solum-outbox-v1" },
    }],
  });
  assertEquals(repository.stored.get(rows[0].id)?.state, "sent");
  assertEquals(repository.stored.get(rows[1].id), {
    state: "dead_letter",
    row: rows[1],
    errorCode: "VALIDATION_FAILED",
  });
});

Deno.test("worker sends NEW acquisition only when the immutable group confirms it", async () => {
  const encrypted = await encryptAwc("129171_click", ENCRYPTION_SECRET);
  const newCustomer = order({
    awc_ciphertext: encrypted,
    commission_group: "NEW",
  });
  const repository = new MemoryRepository([newCustomer]);
  let sentPayload: unknown;
  const handler = createAwinConversionWorker({
    repository,
    apiKey: API_KEY,
    encryptionKey: ENCRYPTION_SECRET,
    workerSecret: WORKER_SECRET,
    supabaseUrl: "https://production.supabase.co",
    now: () => NOW,
    fetch: (_url, init) => {
      sentPayload = JSON.parse(String(init?.body));
      return Promise.resolve(
        new Response(
          JSON.stringify({
            successfulOrders: [{ orderReference: "pi_123" }],
          }),
          { status: 200 },
        ),
      );
    },
  });

  assertEquals((await handler(jsonRequest({}))).status, 200);
  assertEquals(sentPayload, {
    orders: [{
      orderReference: "pi_123",
      amount: 70.83,
      channel: "aw",
      currency: "GBP",
      awc: "129171_click",
      customerAcquisition: "NEW",
      commissionGroups: [{ code: "NEW", amount: 70.83 }],
      custom: { "1": "solum-outbox-v1" },
    }],
  });
});

Deno.test("worker retains a sanitized 202 batch acceptance for reconciliation", async () => {
  const encrypted = await encryptAwc("129171_click", ENCRYPTION_SECRET);
  const row202 = order({ awc_ciphertext: encrypted });
  const repository = new MemoryRepository([row202]);
  const handler = createAwinConversionWorker({
    repository,
    apiKey: API_KEY,
    encryptionKey: ENCRYPTION_SECRET,
    workerSecret: WORKER_SECRET,
    supabaseUrl: "https://production.supabase.co",
    now: () => NOW,
    fetch: () =>
      Promise.resolve(new Response('{"batchId":"batch-202"}', { status: 202 })),
  });

  assertEquals(await (await handler(jsonRequest({}))).json(), {
    claimed: 1,
    accepted: 1,
    sent: 0,
    retried: 0,
    dead_letter: 0,
  });
  assertEquals(repository.stored.get(row202.id), {
    state: "accepted",
    row: row202,
    status: 202,
    batchId: "batch-202",
    nextReconcileAt: "2026-08-12T12:15:00.000Z",
  });
});

Deno.test("worker retries network failures and unresolved partial items without leaking details", async () => {
  const encrypted = await encryptAwc("129171_click", ENCRYPTION_SECRET);
  const first = order({ awc_ciphertext: encrypted });
  const second = order({
    id: "22222222-2222-4222-8222-222222222222",
    order_ref: "pi_456",
    awc_ciphertext: encrypted,
  });
  const repository = new MemoryRepository([first, second]);
  const handler = createAwinConversionWorker({
    repository,
    apiKey: API_KEY,
    encryptionKey: ENCRYPTION_SECRET,
    workerSecret: WORKER_SECRET,
    supabaseUrl: "https://production.supabase.co",
    now: () => NOW,
    jitterMs: () => 0,
    fetch: () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            batchId: "batch-partial",
            successfulOrders: [{ orderReference: "pi_123" }],
            failedOrders: [],
            message: "must never leave the boundary",
          }),
          { status: 206 },
        ),
      ),
  });

  const response = await handler(jsonRequest({ limit: 2 }));
  assertEquals(await response.json(), {
    claimed: 2,
    accepted: 0,
    sent: 1,
    retried: 1,
    dead_letter: 0,
  });
  const unresolved = repository.stored.get(second.id);
  assertEquals(unresolved?.state, "retry");
  assertEquals(
    unresolved && "errorCode" in unresolved ? unresolved.errorCode : undefined,
    "UNKNOWN_PROVIDER_RESPONSE",
  );
  assertEquals(JSON.stringify(unresolved).includes("must never"), false);
});

Deno.test("worker honors a transient provider Retry-After schedule", async () => {
  const encrypted = await encryptAwc("129171_click", ENCRYPTION_SECRET);
  const limited = order({ awc_ciphertext: encrypted });
  const repository = new MemoryRepository([limited]);
  const handler = createAwinConversionWorker({
    repository,
    apiKey: API_KEY,
    encryptionKey: ENCRYPTION_SECRET,
    workerSecret: WORKER_SECRET,
    supabaseUrl: "https://production.supabase.co",
    now: () => NOW,
    jitterMs: () => 0,
    fetch: () =>
      Promise.resolve(
        new Response("{}", { status: 429, headers: { "retry-after": "120" } }),
      ),
  });

  assertEquals(await (await handler(jsonRequest({}))).json(), {
    claimed: 1,
    accepted: 0,
    sent: 0,
    retried: 1,
    dead_letter: 0,
  });
  assertEquals(repository.stored.get(limited.id), {
    state: "retry",
    row: limited,
    status: 429,
    errorCode: "RATE_LIMITED",
    nextAttemptAt: "2026-08-12T12:02:00.000Z",
  });
});

Deno.test("worker surfaces refused and thrown outbox transitions without reporting delivery", async () => {
  const encrypted = await encryptAwc("129171_click", ENCRYPTION_SECRET);
  const delivered = order({ awc_ciphertext: encrypted });
  const refusingRepository = new MemoryRepository([delivered]);
  refusingRepository.complete = () => Promise.resolve(false);
  const refusingHandler = createAwinConversionWorker({
    repository: refusingRepository,
    apiKey: API_KEY,
    encryptionKey: ENCRYPTION_SECRET,
    workerSecret: WORKER_SECRET,
    supabaseUrl: "https://production.supabase.co",
    now: () => NOW,
    fetch: () =>
      Promise.resolve(
        new Response(
          '{"successfulOrders":[{"orderReference":"pi_123"}]}',
          { status: 200 },
        ),
      ),
  });

  const refusedResponse = await refusingHandler(jsonRequest({}));
  assertEquals(refusedResponse.status, 500);
  assertEquals(await refusedResponse.json(), {
    claimed: 1,
    accepted: 0,
    sent: 0,
    retried: 0,
    dead_letter: 0,
  });
  assertEquals(
    refusingRepository.stored.get(delivered.id)?.state,
    "processing",
  );

  const transient = order({ awc_ciphertext: encrypted });
  const throwingRepository = new MemoryRepository([transient]);
  throwingRepository.retry = () =>
    Promise.reject(new Error("database response with internal detail"));
  const throwingHandler = createAwinConversionWorker({
    repository: throwingRepository,
    apiKey: API_KEY,
    encryptionKey: ENCRYPTION_SECRET,
    workerSecret: WORKER_SECRET,
    supabaseUrl: "https://production.supabase.co",
    now: () => NOW,
    fetch: () => Promise.resolve(new Response("{}", { status: 429 })),
  });

  const thrownResponse = await throwingHandler(jsonRequest({}));
  assertEquals(thrownResponse.status, 500);
  const thrownBody = await thrownResponse.json();
  assertEquals(thrownBody, {
    claimed: 1,
    accepted: 0,
    sent: 0,
    retried: 0,
    dead_letter: 0,
  });
  assertEquals(JSON.stringify(thrownBody).includes("internal detail"), false);
  assertEquals(
    throwingRepository.stored.get(transient.id)?.state,
    "processing",
  );
});

Deno.test("worker converts a fetch rejection into per-row retries and a count-only response", async () => {
  const encrypted = await encryptAwc("129171_click", ENCRYPTION_SECRET);
  const failed = order({ awc_ciphertext: encrypted });
  const repository = new MemoryRepository([failed]);
  const handler = createAwinConversionWorker({
    repository,
    apiKey: API_KEY,
    encryptionKey: ENCRYPTION_SECRET,
    workerSecret: WORKER_SECRET,
    supabaseUrl: "https://production.supabase.co",
    now: () => NOW,
    jitterMs: () => 0,
    fetch: () =>
      Promise.reject(new Error("provider response with secret body")),
  });
  const response = await handler(jsonRequest({}));
  const body = await response.json();
  assertEquals(body, {
    claimed: 1,
    accepted: 0,
    sent: 0,
    retried: 1,
    dead_letter: 0,
  });
  assertEquals(JSON.stringify(body).includes("provider response"), false);
  const stored = repository.stored.get(failed.id);
  assertEquals(stored?.state, "retry");
  assertEquals(
    stored && "errorCode" in stored ? stored.errorCode : undefined,
    "UNKNOWN_PROVIDER_RESPONSE",
  );
});
