import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import DistributionPoint from './models/DistributionPoint.js';

dotenv.config();

const DATA_FILE = path.join(process.cwd(), 'data', 'distribution-points.json');

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fiber-distance';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const existingCount = await DistributionPoint.countDocuments();
    if (existingCount > 0) {
      console.log(`Database already has ${existingCount} points. Skipping migration.`);
      await mongoose.disconnect();
      return;
    }

    if (!fs.existsSync(DATA_FILE)) {
      console.log('No JSON data file found. Nothing to migrate.');
      await mongoose.disconnect();
      return;
    }

    const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
    const points = JSON.parse(rawData);

    if (points.length === 0) {
      console.log('JSON file is empty. Nothing to migrate.');
      await mongoose.disconnect();
      return;
    }

    const transformed = points.map(point => ({
      name: point.name || '',
      latitude: point.latitude,
      longitude: point.longitude,
      address: point.address || '',
      equipmentType: point.equipmentType || '',
      originalId: point.id || null
    }));

    await DistributionPoint.insertMany(transformed);
    console.log(`Migrated ${transformed.length} distribution points to MongoDB`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
