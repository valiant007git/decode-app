require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const { stats, waitlist } = require('./stats');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Decode', version: '1.0.0' });
});

const decodeRouter = require('./routes/decode');
app.use('/api/decode', decodeRouter);

const paymentRoute = require('./routes/payment');
app.use('/api/payment', paymentRoute);

app.post('/api/waitlist', (req, res) => {
  const { phone } = req.body;
  if (!phone || phone.length < 10) {
    return res.status(400).json({ success: false, error: 'Invalid phone number' });
  }
  if (!waitlist.includes(phone)) {
    waitlist.push(phone);
  }
  return res.json({ success: true, count: waitlist.length });
});

app.get('/api/waitlist', (req, res) => {
  return res.json({ success: true, count: waitlist.length });
});

app.get('/api/admin/stats', (req, res) => {
  return res.json({
    success: true,
    decodesToday: stats.decodesToday,
    followupsToday: stats.followupsToday,
    waitlistCount: waitlist.length,
    lastDecodes: stats.lastDecodes,
  });
});

app.listen(PORT, () => {
  console.log(`Decode server running on port ${PORT}`);
});
