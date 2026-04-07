// BuildCheap — Stripe Integration
import Stripe from 'stripe';
import { queries } from './db.js';
import crypto from 'crypto';

const COST_PER_BUILD = parseFloat(process.env.COST_PER_BUILD || '0.50');
const MIN_PURCHASE = parseFloat(process.env.MIN_CREDIT_PURCHASE || '5');

let stripe = null;

export function initStripe() {
    if (process.env.STRIPE_SECRET_KEY) {
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    }
    return stripe;
}

// Create Stripe Checkout Session for credit purchase
// Amount is in dollars — any amount >= $5 minimum
export async function createCheckoutSession(userId, amountDollars, successUrl, cancelUrl) {
    if (!stripe) throw new Error('Stripe not configured');

    if (amountDollars < MIN_PURCHASE) {
        throw new Error(`Minimum purchase is $${MIN_PURCHASE}`);
    }

    // Ensure amount is a valid number with max 2 decimal places
    amountDollars = Math.round(amountDollars * 100) / 100;

    const user = queries.getUserById.get(userId);

    // Create or reuse Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
        const customer = await stripe.customers.create({
            email: user.email,
            name: user.display_name,
            metadata: { buildcheap_user_id: userId }
        });
        customerId = customer.id;
        queries.setStripeCustomerId.run(customerId, userId);
    }

    const credits = Math.floor(amountDollars / COST_PER_BUILD);

    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: `BuildCheap Credits`,
                    description: `${credits} build credits ($${COST_PER_BUILD}/build)`,
                },
                unit_amount: Math.round(amountDollars * 100), // Stripe uses cents
            },
            quantity: 1,
        }],
        metadata: {
            user_id: userId,
            credits: credits.toString(),
            amount_dollars: amountDollars.toString(),
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
    });

    return session;
}

// Handle Stripe webhook — credit the user after successful payment
export async function handleWebhook(payload, signature) {
    if (!stripe) throw new Error('Stripe not configured');

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    if (webhookSecret) {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
        event = JSON.parse(payload);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.metadata.user_id;
        const credits = parseInt(session.metadata.credits);
        const amountDollars = parseFloat(session.metadata.amount_dollars);

        // Credit the user
        const user = queries.getUserById.get(userId);
        if (user) {
            queries.updateUserCredits.run(user.credit_balance + amountDollars, userId);
            queries.createCreditTransaction.run(
                crypto.randomUUID(), userId, amountDollars, 'purchase',
                `Purchased ${credits} credits ($${amountDollars})`,
                session.payment_intent, null
            );
        }
    }

    // Handle refunds — claw back credits
    if (event.type === 'charge.refunded') {
        const charge = event.data.object;
        const amountRefunded = charge.amount_refunded / 100; // Stripe uses cents

        // Find the user by Stripe customer ID
        const customerId = charge.customer;
        if (customerId) {
            const user = queries.getUserByStripeCustomerId?.get(customerId);
            if (user) {
                const newBalance = Math.max(0, user.credit_balance - amountRefunded);
                queries.updateUserCredits.run(newBalance, user.id);
                queries.createCreditTransaction.run(
                    crypto.randomUUID(), user.id, -amountRefunded, 'refund',
                    `Stripe refund (-$${amountRefunded.toFixed(2)})`,
                    charge.payment_intent, null
                );
                console.log(`[Stripe] Refund processed: -$${amountRefunded} for user ${user.email}`);
            }
        }
    }

    return event;
}

// Get credits info for a user
export function getCreditsInfo(userId) {
    const user = queries.getUserById.get(userId);
    const availableBuilds = Math.floor(user.credit_balance / COST_PER_BUILD);
    return {
        balance: user.credit_balance,
        available_builds: availableBuilds,
        cost_per_build: COST_PER_BUILD,
        min_purchase: MIN_PURCHASE,
    };
}
