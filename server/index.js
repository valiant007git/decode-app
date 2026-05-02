require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');

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

app.listen(PORT, () => {
  console.log(`Decode server running on port ${PORT}`);
});
