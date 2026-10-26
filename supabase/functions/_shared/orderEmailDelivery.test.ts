import {
  assertEquals,
  assertRejects,
} from "jsr:@std/assert";
import {
  deliverOrderEmailNotifications,
  type OrderEmailDeliveryState,
} from "./orderEmailDelivery.ts";

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
