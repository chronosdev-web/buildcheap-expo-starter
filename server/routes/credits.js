// BuildCheap — Credits/Billing Routes
import { Router } from 'express';
import { queries } from '../db.js';
import { createCheckoutSession, getCreditsInfo } from '../stripe.js';

const router = Router();

// GET /api/credits — get credit balance and info
router.get('/', (req, res) => {
    const info = getCreditsInfo(req.user.id);
    res.json(info);
});

// POST /api/credits/purchase — create Stripe checkout for custom amount
router.post('/purchase', async (req, res) => {
    try {
        const { amount } = req.body; // Dollar amount, e.g. 5, 10, 25, 100, 250, etc.

        if (!amount || typeof amount !== 'number') {
            return res.status(400).json({ error: 'Amount is required (number in dollars)' });
        }

        const session = await createCheckoutSession(
            req.user.id,
            amount,
            req.body.success_url,
            req.body.cancel_url
        );

        res.json({ checkout_url: session.url, session_id: session.id });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// GET /api/credits/history — credit transaction history
router.get('/history', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const transactions = queries.getCreditHistory.all(req.user.id, limit, offset);
    res.json({ transactions });
});

export default router;
