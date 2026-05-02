require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: 'Decode', version: '1.0.0' });
});

const decodeRouter = require('./routes/decode');
app.use('/api/decode', decodeRouter);

app.listen(PORT, () => {
  console.log(`Decode server running on port ${PORT}`);
});
