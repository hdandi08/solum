export type OrderEmailDeliveryState = {
  customerConfirmationSentAt: string | null;
  adminNotificationSentAt: string | null;
};

type AcceptedEmail = {
  resendId: string | null;
};

export async function requireAcceptedResendResponse(
  response: Response,
  messageRole: string,
): Promise<AcceptedEmail> {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`resend_email_rejected:${messageRole}:${response.status}`);
  }

  try {
    const parsed = JSON.parse(body) as { id?: unknown };
    return { resendId: typeof parsed.id === "string" ? parsed.id : null };
  } catch {
    return { resendId: null };
  }
}

export type OrderEmailDeliveryInput = {
  customerEmail?: string | null;
  state: OrderEmailDeliveryState;
  sendCustomerConfirmation: () => Promise<AcceptedEmail>;
  markCustomerConfirmationSent: (resendId: string | null) => Promise<void>;
  sendAdminNotification: () => Promise<AcceptedEmail>;
  markAdminNotificationSent: (resendId: string | null) => Promise<void>;
};

export async function deliverOrderEmailNotifications(
  input: OrderEmailDeliveryInput,
): Promise<void> {
  const customerEmail = input.customerEmail?.trim();
  if (customerEmail && !input.state.customerConfirmationSentAt) {
    const result = await input.sendCustomerConfirmation();
    await input.markCustomerConfirmationSent(result.resendId);
  }

  if (!input.state.adminNotificationSentAt) {
    const result = await input.sendAdminNotification();
    await input.markAdminNotificationSent(result.resendId);
  }
}
