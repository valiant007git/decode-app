require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const decodeRoute = require('./routes/decode');
const paymentRoute = require('./routes/payment');
const pdfRoute = require('./routes/pdf');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/decode', decodeRoute);
app.use('/api/payment', paymentRoute);
app.use('/api/pdf', pdfRoute);

app.get('/health', (req, res) => res.json({ status: 'ok', app: 'Decode', version: '1.0.0' }));

const server = app.listen(PORT, () => {
  console.log(`Decode server running on port ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    app.listen(PORT + 1);
  }
});
