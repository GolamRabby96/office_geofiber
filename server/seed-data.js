import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import DistributionPoint from './models/DistributionPoint.js';
import Customer from './models/Customer.js';

dotenv.config();

const DATA_FILE = path.join(process.cwd(), 'data', 'distribution-points.json');

const POP_KEYWORDS = ['pop', 'data center', 'rgdc', 'dc'];

function classifyType(name) {
  if (!name) return 'Splitter';
  const lower = String(name).toLowerCase();
  for (const kw of POP_KEYWORDS) {
    if (lower.includes(kw)) return 'POP';
  }
  return 'Splitter';
}

async function migrateTypes() {
  const docs = await DistributionPoint.find({ type: { $exists: false } });
  let migrated = 0;

  for (const doc of docs) {
    if (doc.equipmentType && (doc.equipmentType === 'POP' || doc.equipmentType === 'Splitter')) {
      doc.type = doc.equipmentType;
    } else {
      doc.type = classifyType(doc.name);
    }

    if (!doc.address && typeof doc.equipmentType === 'undefined') {
    }

    doc.equipmentType = doc.type;
    await doc.save();
    migrated++;
  }

  if (migrated > 0) {
    console.log(`Migrated ${migrated} points from equipmentType to type`);
  }

  await DistributionPoint.updateMany(
    { type: { $in: ['pop', 'POP', 'Pop'] } },
    { $set: { type: 'POP', equipmentType: 'POP' } }
  );
  await DistributionPoint.updateMany(
    { type: { $in: ['splitter', 'Splitter', 'SPLITTER'] } },
    { $set: { type: 'Splitter', equipmentType: 'Splitter' } }
  );
}

async function seedSampleCustomers() {
  const customerCount = await Customer.countDocuments();
  if (customerCount > 0) {
    console.log(`Database already has ${customerCount} customers`);
    return;
  }

  const pops = await DistributionPoint.find({ type: 'POP' });
  if (pops.length === 0) {
    console.log('No POP nodes found. Cannot seed sample customers.');
    return;
  }

  const sampleCustomers = [
    { customer_name: 'ACI Limited', latitude: 23.7589, longitude: 90.3939, details: 'Dhanmondi', pop_id: pops[0]._id },
    { customer_name: 'Square Toiletries', latitude: 23.7464, longitude: 90.3982, details: 'Dhanmondi', pop_id: pops[0]._id },
    { customer_name: 'BEXIMCO', latitude: 23.7873, longitude: 90.4005, details: 'Gulshan', pop_id: pops[0]._id },
    { customer_name: 'DBBL Corporate', latitude: 23.7172, longitude: 90.4067, details: 'Gulshan-2', pop_id: pops[0]._id },
    { customer_name: 'Robi Corporation', latitude: 23.7267, longitude: 90.4067, details: 'Gulshan-2', pop_id: pops[0]._id },
    { customer_name: 'Chittagong Port Authority', latitude: 22.3562, longitude: 91.8214, details: 'Agrabad', pop_id: pops[Math.min(2, pops.length - 1)]._id },
    { customer_name: 'Sylhet Agricultural Farm', latitude: 24.9037, longitude: 91.8602, details: 'Sylhet', pop_id: pops[Math.min(2, pops.length - 1)]._id },
    { customer_name: 'Rajshahi University Campus', latitude: 24.9148, longitude: 88.6316, details: 'Rajshahi', pop_id: pops[Math.min(3, pops.length - 1)]._id },
    { customer_name: 'Barisal Housing Society', latitude: 22.7057, longitude: 90.3472, details: 'Barisal', pop_id: pops[Math.min(3, pops.length - 1)]._id },
    { customer_name: 'Rangpur Textiles Ltd', latitude: 25.7412, longitude: 89.2843, details: 'Rangpur', pop_id: pops[Math.min(4, pops.length - 1)]._id }
  ];

  await Customer.insertMany(sampleCustomers);
  console.log(`Seeded ${sampleCustomers.length} sample customers`);
}

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fiber-distance';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const existingCount = await DistributionPoint.countDocuments();

    if (existingCount === 0) {
      if (fs.existsSync(DATA_FILE)) {
        const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
        const points = JSON.parse(rawData);

        if (points.length > 0) {
          const transformed = points.map(point => ({
            name: point.name || '',
            latitude: point.latitude,
            longitude: point.longitude,
            type: point.equipmentType || classifyType(point.name) || 'Splitter',
            address: point.address || '',
            originalId: point.id || null
          }));

          await DistributionPoint.insertMany(transformed);
          console.log(`Seeded ${transformed.length} distribution points to MongoDB`);
        }
      } else {
        console.log('No JSON data file found.');
      }
    } else {
      console.log(`Database has ${existingCount} distribution points. Running migration.`);
      await migrateTypes();
    }

    const popCount = await DistributionPoint.countDocuments({ type: 'POP' });
    const splitterCount = await DistributionPoint.countDocuments({ type: 'Splitter' });
    console.log(`Total: ${popCount} POPs, ${splitterCount} Splitters`);

    await seedSampleCustomers();

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
