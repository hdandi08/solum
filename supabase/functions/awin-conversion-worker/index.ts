// deno-lint-ignore no-import-prefix -- Supabase Edge Functions resolve pinned URL imports at runtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";
import {
  createAwinConversionWorker,
  type DeliveryRepository,
  type OutboxRow,
} from "../_shared/awinConversionApi.ts";

type RpcClient = {
  rpc(
    name: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: unknown }>;
};

function rpcFailure(): never {
  throw new Error("AWIN worker database transition failed");
}

export function createAwinConversionRepository(
  client: RpcClient,
): DeliveryRepository {
  return {
    async claim({ limit, workerId, leaseSeconds }) {
      const { data, error } = await client.rpc("claim_awin_conversion_batch", {
        p_limit: limit,
        p_worker_id: workerId,
        p_lease_seconds: leaseSeconds,
      });
      if (error || !Array.isArray(data)) rpcFailure();
      return data as OutboxRow[];
    },

    async complete({ id, workerId, status, batchId, transactionId }) {
      const { data, error } = await client.rpc("complete_awin_conversion", {
        p_id: id,
        p_worker_id: workerId,
        p_http_status: status,
        p_batch_id: batchId ?? null,
        p_provider_transaction_id: transactionId ?? null,
      });
      if (error || typeof data !== "boolean") rpcFailure();
      return data;
    },

    async accept({ id, workerId, status, batchId, nextReconcileAt }) {
      const { data, error } = await client.rpc("accept_awin_conversion_batch", {
        p_id: id,
        p_worker_id: workerId,
        p_http_status: status,
        p_batch_id: batchId,
        p_next_reconcile_at: nextReconcileAt,
      });
      if (error || typeof data !== "boolean") rpcFailure();
      return data;
    },

    async retry({ id, workerId, state, nextAttemptAt, status, errorCode }) {
      const { data, error } = await client.rpc("retry_awin_conversion", {
        p_id: id,
        p_worker_id: workerId,
        p_state: state,
        p_next_attempt_at: nextAttemptAt ?? null,
        p_http_status: status ?? null,
        p_error_code: errorCode,
      });
      if (error || typeof data !== "boolean") rpcFailure();
      return data;
    },
  };
}

function unavailableResponse(): Response {
  return new Response(
    JSON.stringify({
      claimed: 0,
      accepted: 0,
      sent: 0,
      retried: 0,
      dead_letter: 0,
    }),
    { status: 500, headers: { "Content-Type": "application/json" } },
  );
}

function handlerForEnvironment(): (request: Request) => Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = Deno.env.get("AWIN_CONVERSION_API_KEY");
  const encryptionKey = Deno.env.get("AWIN_OUTBOX_ENCRYPTION_KEY");
  const workerSecret = Deno.env.get("AWIN_WORKER_SECRET");

  if (
    !supabaseUrl || !serviceRoleKey || !apiKey || !encryptionKey ||
    !workerSecret
  ) {
    return () => Promise.resolve(unavailableResponse());
  }

  const client = createClient(supabaseUrl, serviceRoleKey);
  return createAwinConversionWorker({
    repository: createAwinConversionRepository(client),
    apiKey,
    encryptionKey,
    workerSecret,
    supabaseUrl,
    baseUrlOverride: Deno.env.get("AWIN_CONVERSION_API_BASE_URL"),
  });
}

if (import.meta.main) {
  Deno.serve(handlerForEnvironment());
}
