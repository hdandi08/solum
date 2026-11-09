import { loadStripe } from '@stripe/stripe-js';

// One instance shared by the early checkout warm-up and the payment providers.
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
