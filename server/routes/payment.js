const express = require('express');
const router = express.Router();

const paidUsers = new Set();

router.post('/create-order', async (req, res) => {
  try {
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const order = await razorpay.orders.create({
      amount: 19900,
      currency: 'INR',
      receipt: 'decode_' + Date.now(),
    });
    res.json({
      success: true,
      order,
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('Razorpay error:', err);
    res.status(500).json({ success: false, error: 'Payment failed' });
  }
});

router.post('/verify', (req, res) => {
  const { phone, razorpay_payment_id } = req.body;
  if (phone && razorpay_payment_id) {
    paidUsers.add(phone);
    return res.json({ success: true });
  }
  res.status(400).json({ success: false });
});

router.get('/status/:phone', (req, res) => {
  res.json({ isPaid: paidUsers.has(req.params.phone) });
});

module.exports = router;
