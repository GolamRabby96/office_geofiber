import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import uploadRoutes from './routes/upload.js';
import distanceRoutes from './routes/distance.js';
import customerRoutes from './routes/customers.js';
import DistributionPoint from './models/DistributionPoint.js';
import Customer from './models/Customer.js';
import dotenv from 'dotenv';

dotenv.config();

connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 9444;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/upload', uploadRoutes);
app.use('/api/distance', distanceRoutes);
app.use('/api/customers', customerRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Distribution Distance API is running' });
});

const distPath = path.resolve(__dirname, '../client/dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

async function logCounts() {
  try {
    const popCount = await DistributionPoint.countDocuments({ type: 'POP' });
    const splitterCount = await DistributionPoint.countDocuments({ type: 'Splitter' });
    const customerCount = await Customer.countDocuments();
    console.log(`Data loaded: ${popCount} POPs, ${splitterCount} Splitters, ${customerCount} Customers`);
  } catch (error) {
    console.error('Error counting documents:', error.message);
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  logCounts();
});
