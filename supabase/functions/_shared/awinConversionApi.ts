import { decryptAwc, retryDecision } from "./awinOutbox.ts";

export const AWIN_CONVERSION_ENDPOINT =
  "https://api.awin.com/s2s/advertiser/129171/orders";

const DEVELOPMENT_PROJECT_REF = "rodvvmfzkyjsqbufkjbc";
const MAX_REQUEST_BODY_BYTES = 1_024;
const MAX_PROVIDER_BODY_BYTES = 65_536;
const REQUEST_TIMEOUT_MS = 5_000;
const MINIMUM_ORDER_AGE_MS = 10_000;
const RECONCILIATION_DELAY_MS = 15 * 60 * 1_000;
const MAX_RETRY_AFTER_MS = 6 * 24 * 60 * 60 * 1_000;
const LEASE_SECONDS = 300;
const TRANSITION_CONCURRENCY = 10;
const TRANSITION_DEADLINE_MS = 60_000;
const DEFAULT_LIMIT = 100;
const PROVIDER_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;

export type AwinChannel = "aw" | "display" | "ppc" | "email";
export type CustomerAcquisition = "NEW" | "RETURNING";
export type CommissionGroup = "DEFAULT" | "NEW" | "EXISTING";

export type BuildConversionOrderInput = {
  orderRef: string;
  amountPence: number;
  currency: "GBP";
  channel: AwinChannel;
  awc: string;
  commissionGroup: CommissionGroup;
  customerAcquisition?: CustomerAcquisition;
  voucherCode?: string | null;
};

export type AwinConversionOrder = {
  orderReference: string;
  amount: number;
  channel: AwinChannel;
  currency: "GBP";
  awc: string;
  customerAcquisition?: CustomerAcquisition;
  voucher?: string;
  commissionGroups: Array<{ code: CommissionGroup; amount: number }>;
  custom: { "1": "solum-outbox-v1" };
};

export type DeliveryErrorCode =
  | "VALIDATION_FAILED"
  | "AUTH_FAILED"
  | "RATE_LIMITED"
  | "PROVIDER_5XX"
  | "UNKNOWN_PROVIDER_RESPONSE";

export type DeliveryOutcome =
  | {
    state: "sent";
    status: number;
    batchId?: string;
    providerTransactionId?: string;
  }
  | { state: "processing"; status: 202; batchId: string }
  | {
    state: "retry" | "dead_letter";
    status: number;
    errorCode: DeliveryErrorCode;
    batchId?: string;
    retryAfterMs?: number;
  };

export type OutboxRow = {
  id: string;
  order_ref: string;
  amount_pence: number;
  currency: string;
  channel: string;
  commission_group: string;
  voucher_code: string | null;
  awc_ciphertext: string;
  attempt_count: number;
  created_at: string;
};

export interface DeliveryRepository {
  claim(input: {
    limit: number;
    workerId: string;
    leaseSeconds: number;
  }): Promise<OutboxRow[]>;
  complete(input: {
    id: string;
    workerId: string;
    status: number;
    batchId?: string;
    transactionId?: string;
  }): Promise<boolean>;
  accept(input: {
    id: string;
    workerId: string;
    status: 202;
    batchId: string;
    nextReconcileAt: string;
  }): Promise<boolean>;
  retry(input: {
    id: string;
    workerId: string;
    state: "retry" | "dead_letter";
    nextAttemptAt?: string;
    status?: number;
    errorCode: string;
  }): Promise<boolean>;
}

type TimerHandle = unknown;
type Fetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type WorkerDependencies = {
  repository: DeliveryRepository;
  apiKey: string;
  encryptionKey: string;
  workerSecret: string;
  supabaseUrl: string;
  baseUrlOverride?: string;
  fetch?: Fetch;
  now?: () => number;
  randomUUID?: () => string;
  sleep?: (ms: number) => Promise<void>;
  jitterMs?: () => number;
  setTimeout?: (callback: () => void, ms: number) => TimerHandle;
  clearTimeout?: (handle: TimerHandle) => void;
};

type WorkerCounts = {
  claimed: number;
  accepted: number;
  sent: number;
  retried: number;
  dead_letter: number;
};

function validString(
  value: unknown,
  name: string,
  minimum: number,
  maximum: number,
  pattern?: RegExp,
): string {
  if (
    typeof value !== "string" || value.length < minimum ||
    value.length > maximum || value !== value.trim() ||
    (pattern && !pattern.test(value))
  ) {
    throw new TypeError(`${name} is invalid`);
  }
  return value;
}

export function buildConversionOrder(
  input: BuildConversionOrderInput,
): AwinConversionOrder {
  const orderReference = validString(
    input.orderRef,
    "orderRef",
    4,
    255,
    /^pi_[A-Za-z0-9]+$/,
  );
  if (!Number.isSafeInteger(input.amountPence) || input.amountPence < 1) {
    throw new TypeError("amountPence must be a positive safe integer");
  }
  if (input.currency !== "GBP") throw new TypeError("currency is invalid");
  if (!(["aw", "display", "ppc", "email"] as const).includes(input.channel)) {
    throw new TypeError("channel is invalid");
  }
  if (
    !(["DEFAULT", "NEW", "EXISTING"] as const).includes(input.commissionGroup)
  ) {
    throw new TypeError("commissionGroup is invalid");
  }
  if (
    input.customerAcquisition !== undefined &&
    !(["NEW", "RETURNING"] as const).includes(input.customerAcquisition)
  ) {
    throw new TypeError("customerAcquisition is invalid");
  }
  const awc = validString(input.awc, "awc", 1, 500, /^[A-Za-z0-9._~-]+$/);
  const amount = input.amountPence / 100;
  const voucher = input.voucherCode === undefined || input.voucherCode === null
    ? undefined
    : validString(input.voucherCode, "voucher", 1, 100);

  return {
    orderReference,
    amount,
    channel: input.channel,
    currency: input.currency,
    awc,
    ...(input.customerAcquisition
      ? { customerAcquisition: input.customerAcquisition }
      : {}),
    ...(voucher ? { voucher } : {}),
    commissionGroups: [{ code: input.commissionGroup, amount }],
    custom: { "1": "solum-outbox-v1" },
  };
}

function sanitizedProviderId(value: unknown): string | undefined {
  return typeof value === "string" && value.length >= 1 &&
      value.length <= 200 &&
      value === value.trim() && PROVIDER_ID_PATTERN.test(value)
    ? value
    : undefined;
}

function responseRecord(body: unknown): Record<string, unknown> | undefined {
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? body as Record<string, unknown>
    : undefined;
}

function itemReference(item: unknown): string | undefined {
  if (typeof item !== "object" || item === null) return undefined;
  const record = item as Record<string, unknown>;
  const direct = record.orderReference;
  if (typeof direct === "string") return direct;
  return typeof record.order === "object" && record.order !== null &&
      typeof (record.order as Record<string, unknown>).orderReference ===
        "string"
    ? (record.order as Record<string, unknown>).orderReference as string
    : undefined;
}

function putOutcome(
  outcomes: Map<string, DeliveryOutcome>,
  reference: string,
  outcome: DeliveryOutcome,
  status: number,
  batchId?: string,
) {
  if (!/^pi_[A-Za-z0-9]+$/.test(reference)) return;
  if (outcomes.has(reference)) {
    outcomes.set(reference, {
      state: "retry",
      status,
      errorCode: "UNKNOWN_PROVIDER_RESPONSE",
      ...(batchId ? { batchId } : {}),
    });
    return;
  }
  outcomes.set(reference, outcome);
}

export function parseConversionResponse(
  status: number,
  body: unknown,
): Map<string, DeliveryOutcome> {
  const outcomes = new Map<string, DeliveryOutcome>();
  const response = responseRecord(body);
  if (!response || ![200, 202, 206].includes(status)) return outcomes;
  const batchId = sanitizedProviderId(response.batchId);

  if (status === 202) {
    if (!batchId) return outcomes;
    for (
      const items of [
        response.successfulOrders,
        response.pendingOrders,
        response.failedOrders,
      ]
    ) {
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        const reference = itemReference(item);
        if (!reference || !/^pi_[A-Za-z0-9]+$/.test(reference)) continue;
        outcomes.set(reference, {
          state: "processing",
          status: 202,
          batchId,
        });
      }
    }
    return outcomes;
  }

  if (Array.isArray(response.successfulOrders)) {
    for (const item of response.successfulOrders) {
      const reference = itemReference(item);
      if (!reference) continue;
      const transactionId = typeof item === "object" && item !== null
        ? sanitizedProviderId((item as Record<string, unknown>).correlationId)
        : undefined;
      putOutcome(
        outcomes,
        reference,
        {
          state: "sent",
          status,
          ...(batchId ? { batchId } : {}),
          ...(transactionId ? { providerTransactionId: transactionId } : {}),
        },
        status,
        batchId,
      );
    }
  }

  if (Array.isArray(response.failedOrders)) {
    for (const item of response.failedOrders) {
      const reference = itemReference(item);
      if (!reference) continue;
      putOutcome(
        outcomes,
        reference,
        {
          state: "dead_letter",
          status,
          errorCode: "VALIDATION_FAILED",
          ...(batchId ? { batchId } : {}),
        },
        status,
        batchId,
      );
    }
  }

  return outcomes;
}

function fallbackOutcome(status: number): DeliveryOutcome {
  if (status === 400 || status === 406) {
    return { state: "dead_letter", status, errorCode: "VALIDATION_FAILED" };
  }
  if (status === 401 || status === 403) {
    return { state: "dead_letter", status, errorCode: "AUTH_FAILED" };
  }
  if (status === 429) {
    return { state: "retry", status, errorCode: "RATE_LIMITED" };
  }
  if (status >= 500) {
    return { state: "retry", status, errorCode: "PROVIDER_5XX" };
  }
  return {
    state:
      status === 408 || status === 425 || status === 200 || status === 202 ||
        status === 206
        ? "retry"
        : "dead_letter",
    status,
    errorCode: "UNKNOWN_PROVIDER_RESPONSE",
  };
}

function retryAfterMs(value: string | null, now: number): number | undefined {
  if (value === null) return undefined;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    const milliseconds = Number(trimmed) * 1_000;
    return Number.isSafeInteger(milliseconds)
      ? Math.min(milliseconds, MAX_RETRY_AFTER_MS)
      : undefined;
  }
  const retryAt = Date.parse(trimmed);
  if (!Number.isFinite(retryAt) || retryAt <= now) return undefined;
  return Math.min(retryAt - now, MAX_RETRY_AFTER_MS);
}

async function boundedResponseJson(response: Response): Promise<unknown> {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null && /^\d+$/.test(contentLength)) {
    const declaredBytes = Number(contentLength);
    if (
      !Number.isSafeInteger(declaredBytes) ||
      declaredBytes > MAX_PROVIDER_BODY_BYTES
    ) {
      await response.body?.cancel();
      return undefined;
    }
  }
  if (!response.body) return undefined;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_PROVIDER_BODY_BYTES) {
        await reader.cancel();
        return undefined;
      }
      chunks.push(value);
    }
  } catch {
    return undefined;
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
}

export async function sendConversionBatch(input: {
  orders: AwinConversionOrder[];
  apiKey: string;
  endpoint: string;
  fetch?: Fetch;
  setTimeout?: (callback: () => void, ms: number) => TimerHandle;
  clearTimeout?: (handle: TimerHandle) => void;
  now?: () => number;
}): Promise<{ status: number; outcomes: Map<string, DeliveryOutcome> }> {
  if (input.orders.length < 1 || input.orders.length > 100) {
    throw new TypeError("orders must contain between 1 and 100 items");
  }
  const fetcher = input.fetch ?? fetch;
  const schedule = input.setTimeout ??
    ((callback: () => void, ms: number): TimerHandle =>
      setTimeout(callback, ms));
  const cancel = input.clearTimeout ??
    ((handle: TimerHandle) =>
      clearTimeout(handle as ReturnType<typeof setTimeout>));
  const controller = new AbortController();
  const timeout = schedule(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const conversionBatch = { orders: input.orders };
  try {
    const response = await fetcher(input.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": input.apiKey,
      },
      body: JSON.stringify(conversionBatch),
      signal: controller.signal,
    });
    const body = await boundedResponseJson(response);
    const parsed = parseConversionResponse(response.status, body);
    const record = responseRecord(body);
    const batchId = record ? sanitizedProviderId(record.batchId) : undefined;
    const providerRetryAfterMs = retryAfterMs(
      response.headers.get("retry-after"),
      (input.now ?? Date.now)(),
    );
    const outcomes = new Map<string, DeliveryOutcome>();
    for (const order of input.orders) {
      const explicit = parsed.get(order.orderReference);
      if (explicit) {
        outcomes.set(order.orderReference, explicit);
      } else if (response.status === 202 && batchId) {
        outcomes.set(order.orderReference, {
          state: "processing",
          status: 202,
          batchId,
        });
      } else {
        const fallback = fallbackOutcome(response.status);
        const scheduledFallback = fallback.state === "retry" &&
            providerRetryAfterMs !== undefined
          ? { ...fallback, retryAfterMs: providerRetryAfterMs }
          : fallback;
        outcomes.set(
          order.orderReference,
          batchId && "errorCode" in scheduledFallback
            ? { ...scheduledFallback, batchId }
            : scheduledFallback,
        );
      }
    }
    return { status: response.status, outcomes };
  } finally {
    cancel(timeout);
  }
}

export function resolveAwinConversionEndpoint(
  supabaseUrl: string,
  baseUrlOverride?: string,
): string {
  let projectUrl: URL;
  try {
    projectUrl = new URL(supabaseUrl);
  } catch {
    // Invalid configuration fails closed to AWIN's fixed production endpoint.
    return AWIN_CONVERSION_ENDPOINT;
  }

  const development = projectUrl.protocol === "https:" &&
    projectUrl.hostname === `${DEVELOPMENT_PROJECT_REF}.supabase.co`;
  if (!development) return AWIN_CONVERSION_ENDPOINT;

  try {
    const override = new URL(baseUrlOverride ?? "");
    if (override.protocol !== "https:") throw new TypeError();
    return new URL(
      "/s2s/advertiser/129171/orders",
      override,
    ).toString();
  } catch {
    throw new TypeError(
      "AWIN_CONVERSION_API_BASE_URL must be a valid HTTPS URL in development",
    );
  }
}

async function constantTimeSecretEquals(candidate: string, expected: string) {
  const encoder = new TextEncoder();
  const [candidateDigest, expectedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const left = new Uint8Array(candidateDigest);
  const right = new Uint8Array(expectedDigest);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

async function readBoundedRequestJson(
  request: Request,
): Promise<Record<string, unknown>> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const parsed = Number(contentLength);
    if (
      !Number.isSafeInteger(parsed) || parsed < 0 ||
      parsed > MAX_REQUEST_BODY_BYTES
    ) {
      throw new TypeError("request body is too large");
    }
  }
  if (!request.body) return {};
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_BODY_BYTES) {
        throw new TypeError("request body is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const text = new TextDecoder().decode(bytes);
  if (text.trim() === "") return {};
  const parsed = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new TypeError("request body must be an object");
  }
  return parsed as Record<string, unknown>;
}

function parseLimit(body: Record<string, unknown>): number {
  if (Object.keys(body).some((key) => key !== "limit")) {
    throw new TypeError("request body contains unknown fields");
  }
  const limit = body.limit ?? DEFAULT_LIMIT;
  if (
    !Number.isSafeInteger(limit) || (limit as number) < 1 ||
    (limit as number) > 100
  ) {
    throw new TypeError("limit must be an integer between 1 and 100");
  }
  return limit as number;
}

function countResponse(counts: WorkerCounts, status = 200): Response {
  return new Response(JSON.stringify(counts), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function emptyCounts(): WorkerCounts {
  return { claimed: 0, accepted: 0, sent: 0, retried: 0, dead_letter: 0 };
}

type TransitionCount = "accepted" | "sent" | "retried" | "dead_letter";

async function runConcurrentTransitions<T>(
  items: T[],
  transition: (item: T) => Promise<TransitionCount | undefined>,
): Promise<{ results: Array<TransitionCount | undefined>; failed: boolean }> {
  const results = new Array<TransitionCount | undefined>(items.length);
  const startedAt = performance.now();
  let nextIndex = 0;
  let failed = false;
  let deadlineReached = false;

  async function runWorker() {
    while (!deadlineReached) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;

      const remainingMs = TRANSITION_DEADLINE_MS -
        (performance.now() - startedAt);
      if (remainingMs <= 0) {
        deadlineReached = true;
        failed = true;
        return;
      }

      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        results[index] = await Promise.race([
          transition(items[index]),
          new Promise<undefined>((resolve) => {
            timeout = setTimeout(() => {
              deadlineReached = true;
              resolve(undefined);
            }, remainingMs);
          }),
        ]);
        if (results[index] === undefined) failed = true;
      } catch {
        failed = true;
      } finally {
        if (timeout !== undefined) clearTimeout(timeout);
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(TRANSITION_CONCURRENCY, items.length) },
      () => runWorker(),
    ),
  );
  if (nextIndex < items.length) failed = true;
  return { results, failed };
}

function validOutboxEnum<T extends string>(
  value: string,
  values: readonly T[],
  name: string,
): T {
  if (!values.includes(value as T)) throw new TypeError(`${name} is invalid`);
  return value as T;
}

async function transitionRetry(
  repository: DeliveryRepository,
  row: OutboxRow,
  workerId: string,
  now: number,
  outcome: Extract<DeliveryOutcome, { state: "retry" | "dead_letter" }>,
  jitter: number,
): Promise<"retry" | "dead_letter" | undefined> {
  const retryStatus = outcome.errorCode === "UNKNOWN_PROVIDER_RESPONSE" &&
      [200, 202, 206].includes(outcome.status)
    ? undefined
    : outcome.status;
  const decision = outcome.state === "dead_letter"
    ? { state: "dead_letter" as const }
    : retryDecision({
      status: retryStatus,
      attempt: row.attempt_count,
      jitterMs: jitter,
    });
  const nextAttemptAt = decision.state === "retry"
    ? new Date(
      now + Math.max(decision.nextAttemptMs, outcome.retryAfterMs ?? 0),
    ).toISOString()
    : undefined;
  const changed = await repository.retry({
    id: row.id,
    workerId,
    state: decision.state,
    ...(nextAttemptAt ? { nextAttemptAt } : {}),
    status: outcome.status,
    errorCode: outcome.errorCode,
  });
  return changed ? decision.state : undefined;
}

export function createAwinConversionWorker(dependencies: WorkerDependencies) {
  const fetcher = dependencies.fetch ?? fetch;
  const now = dependencies.now ?? Date.now;
  const randomUUID = dependencies.randomUUID ?? (() => crypto.randomUUID());
  const sleep = dependencies.sleep ??
    ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const jitterMs = dependencies.jitterMs ??
    (() => crypto.getRandomValues(new Uint16Array(1))[0] % 15_000);
  const endpoint = resolveAwinConversionEndpoint(
    dependencies.supabaseUrl,
    dependencies.baseUrlOverride,
  );

  return async (request: Request): Promise<Response> => {
    const counts = emptyCounts();
    if (request.method !== "POST") return countResponse(counts, 405);

    const authorization = request.headers.get("authorization") ?? "";
    const expectedAuthorization = `Bearer ${dependencies.workerSecret}`;
    if (!await constantTimeSecretEquals(authorization, expectedAuthorization)) {
      return countResponse(counts, 401);
    }

    let limit: number;
    try {
      limit = parseLimit(await readBoundedRequestJson(request));
    } catch {
      return countResponse(counts, 400);
    }

    const workerId = randomUUID();
    let rows: OutboxRow[];
    try {
      rows = await dependencies.repository.claim({
        limit,
        workerId,
        leaseSeconds: LEASE_SECONDS,
      });
    } catch {
      return countResponse(counts, 500);
    }
    counts.claimed = rows.length;

    const ready: Array<{ row: OutboxRow; order: AwinConversionOrder }> = [];
    let transitionFailure = false;
    for (const row of rows) {
      try {
        const awc = await decryptAwc(
          row.awc_ciphertext,
          dependencies.encryptionKey,
        );
        const commissionGroup = validOutboxEnum(
          row.commission_group,
          ["DEFAULT", "NEW", "EXISTING"] as const,
          "commissionGroup",
        );
        ready.push({
          row,
          order: buildConversionOrder({
            orderRef: row.order_ref,
            amountPence: row.amount_pence,
            currency: validOutboxEnum(
              row.currency,
              ["GBP"] as const,
              "currency",
            ),
            channel: validOutboxEnum(
              row.channel,
              ["aw", "display", "ppc", "email"] as const,
              "channel",
            ),
            awc,
            commissionGroup,
            ...(commissionGroup === "NEW"
              ? { customerAcquisition: "NEW" }
              : {}),
            voucherCode: row.voucher_code,
          }),
        });
      } catch {
        try {
          const changed = await dependencies.repository.retry({
            id: row.id,
            workerId,
            state: "dead_letter",
            errorCode: "VALIDATION_FAILED",
          });
          if (changed) counts.dead_letter += 1;
          else transitionFailure = true;
        } catch {
          transitionFailure = true;
        }
      }
    }

    if (ready.length === 0) {
      return countResponse(counts, transitionFailure ? 500 : 200);
    }

    const latestReadyAt = Math.max(
      ...ready.map(({ row }) =>
        Date.parse(row.created_at) + MINIMUM_ORDER_AGE_MS
      ),
    );
    const waitMs = Math.max(0, latestReadyAt - now());
    try {
      if (waitMs > 0) await sleep(waitMs);
      const result = await sendConversionBatch({
        orders: ready.map(({ order }) => order),
        apiKey: dependencies.apiKey,
        endpoint,
        fetch: fetcher,
        ...(dependencies.setTimeout
          ? { setTimeout: dependencies.setTimeout }
          : {}),
        ...(dependencies.clearTimeout
          ? { clearTimeout: dependencies.clearTimeout }
          : {}),
        now,
      });

      const transitions = await runConcurrentTransitions(ready, async ({ row }) => {
        const outcome = result.outcomes.get(row.order_ref) ?? {
          state: "retry" as const,
          status: result.status,
          errorCode: "UNKNOWN_PROVIDER_RESPONSE" as const,
        };
        if (outcome.state === "sent") {
          const changed = await dependencies.repository.complete({
            id: row.id,
            workerId,
            status: outcome.status,
            ...(outcome.batchId ? { batchId: outcome.batchId } : {}),
            ...(outcome.providerTransactionId
              ? { transactionId: outcome.providerTransactionId }
              : {}),
          });
          return changed ? "sent" : undefined;
        }
        if (outcome.state === "processing") {
          const changed = await dependencies.repository.accept({
            id: row.id,
            workerId,
            status: 202,
            batchId: outcome.batchId,
            nextReconcileAt: new Date(
              now() + RECONCILIATION_DELAY_MS,
            ).toISOString(),
          });
          return changed ? "accepted" : undefined;
        }
        const changedState = await transitionRetry(
          dependencies.repository,
          row,
          workerId,
          now(),
          outcome,
          jitterMs(),
        );
        return changedState === "retry"
          ? "retried"
          : changedState === "dead_letter"
          ? "dead_letter"
          : undefined;
      });
      for (const transition of transitions.results) {
        if (transition) counts[transition] += 1;
      }
      if (transitions.failed) transitionFailure = true;
    } catch {
      const transitions = await runConcurrentTransitions(ready, async ({ row }) => {
        const decision = retryDecision({
          attempt: row.attempt_count,
          jitterMs: jitterMs(),
        });
        const nextAttemptAt = decision.state === "retry"
          ? new Date(now() + decision.nextAttemptMs).toISOString()
          : undefined;
        const changed = await dependencies.repository.retry({
          id: row.id,
          workerId,
          state: decision.state,
          ...(nextAttemptAt ? { nextAttemptAt } : {}),
          errorCode: "UNKNOWN_PROVIDER_RESPONSE",
        });
        if (!changed) return undefined;
        return decision.state === "retry" ? "retried" : "dead_letter";
      });
      for (const transition of transitions.results) {
        if (transition) counts[transition] += 1;
      }
      if (transitions.failed) transitionFailure = true;
    }

    return countResponse(counts, transitionFailure ? 500 : 200);
  };
}
