import { assertEquals, assertRejects } from "jsr:@std/assert";
import {
  deliverOrderEmailNotifications,
  type OrderEmailDeliveryState,
} from "./orderEmailDelivery.ts";
import * as orderEmailDelivery from "./orderEmailDelivery.ts";
import * as purchaseSafety from "./purchaseSafety.ts";

type DeliveryHarness = {
  state: OrderEmailDeliveryState;
  attempts: string[];
  createInput: () => Parameters<typeof deliverOrderEmailNotifications>[0];
};

function createHarness(input: {
  customerEmail?: string;
  state?: OrderEmailDeliveryState;
  failAdminAttempts?: number;
}): DeliveryHarness {
  const state: OrderEmailDeliveryState = input.state ?? {
    customerConfirmationSentAt: null,
    adminNotificationSentAt: null,
  };
  const attempts: string[] = [];
  let remainingAdminFailures = input.failAdminAttempts ?? 0;

  return {
    state,
    attempts,
    createInput: () => ({
      customerEmail: input.customerEmail,
      state,
      sendCustomerConfirmation: async () => {
        attempts.push("customer");
        return { resendId: "customer-email-id" };
      },
      markCustomerConfirmationSent: async () => {
        state.customerConfirmationSentAt = "2026-10-26T12:00:00.000Z";
      },
      sendAdminNotification: async () => {
        attempts.push("admin");
        if (remainingAdminFailures > 0) {
          remainingAdminFailures -= 1;
          throw new Error("resend_email_rejected:admin:503");
        }
        return { resendId: "admin-email-id" };
      },
      markAdminNotificationSent: async () => {
        state.adminNotificationSentAt = "2026-10-26T12:01:00.000Z";
      },
    }),
  };
}

Deno.test("sends the founder notification when a live order has no customer email", async () => {
  const harness = createHarness({ customerEmail: undefined });

  await deliverOrderEmailNotifications(harness.createInput());

  assertEquals(harness.attempts, ["admin"]);
  assertEquals(harness.state, {
    customerConfirmationSentAt: null,
    adminNotificationSentAt: "2026-10-26T12:01:00.000Z",
  });
});

Deno.test("retries only the founder notification after its prior Resend failure", async () => {
  const harness = createHarness({
    customerEmail: "customer@example.com",
    failAdminAttempts: 1,
  });

  await assertRejects(
    () => deliverOrderEmailNotifications(harness.createInput()),
    Error,
    "resend_email_rejected:admin:503",
  );
  await deliverOrderEmailNotifications(harness.createInput());

  assertEquals(harness.attempts, ["customer", "admin", "admin"]);
  assertEquals(harness.state, {
    customerConfirmationSentAt: "2026-10-26T12:00:00.000Z",
    adminNotificationSentAt: "2026-10-26T12:01:00.000Z",
  });
});

Deno.test("does not resend either already-recorded order message on a webhook replay", async () => {
  const harness = createHarness({
    customerEmail: "customer@example.com",
    state: {
      customerConfirmationSentAt: "2026-10-26T12:00:00.000Z",
      adminNotificationSentAt: "2026-10-26T12:01:00.000Z",
    },
  });

  await deliverOrderEmailNotifications(harness.createInput());

  assertEquals(harness.attempts, []);
});

Deno.test("does not record a customer confirmation when Resend rejects the request", async () => {
  const requireAcceptedResponse = (
    orderEmailDelivery as unknown as {
      requireAcceptedResendResponse: (
        response: Response,
        messageRole: string,
      ) => Promise<{ resendId: string | null }>;
    }
  ).requireAcceptedResendResponse;
  const harness = createHarness({ customerEmail: "customer@example.com" });

  await assertRejects(
    () =>
      deliverOrderEmailNotifications({
        ...harness.createInput(),
        sendCustomerConfirmation: () =>
          requireAcceptedResponse(
            new Response("sender domain not verified", { status: 422 }),
            "customer_confirmation",
          ),
      }),
    Error,
    "resend_email_rejected:customer_confirmation:422",
  );

  assertEquals(harness.state.customerConfirmationSentAt, null);
  assertEquals(harness.state.adminNotificationSentAt, null);
});

Deno.test("allows labelled test order emails only from the dedicated development project", () => {
  const resolveOrderEmailDeliveryPolicy = (
    purchaseSafety as unknown as {
      resolveOrderEmailDeliveryPolicy: (
        livemode: boolean | undefined,
        supabaseUrl: string | undefined,
      ) => { send: boolean; subjectPrefix: string };
    }
  ).resolveOrderEmailDeliveryPolicy;

  assertEquals(
    resolveOrderEmailDeliveryPolicy(
      false,
      "https://rodvvmfzkyjsqbufkjbc.supabase.co",
    ),
    { send: true, subjectPrefix: "[DEV] " },
  );
  assertEquals(
    resolveOrderEmailDeliveryPolicy(
      false,
      "https://gvfptmjluxpngfjendbi.supabase.co",
    ),
    { send: false, subjectPrefix: "" },
  );
  assertEquals(
    resolveOrderEmailDeliveryPolicy(
      true,
      "https://gvfptmjluxpngfjendbi.supabase.co",
    ),
    { send: true, subjectPrefix: "" },
  );
});
