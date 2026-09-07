import express from 'express';
import multer from 'multer';
import path from 'path';
import xlsx from 'xlsx';
import DistributionPoint from '../models/DistributionPoint.js';
import Customer from '../models/Customer.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizeKey(key) {
  return String(key).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

const LAT_KEYS = ['latitude', 'lat', 'lattitude', 'latit', 'y', 'ycoordinate', 'latitudes'];
const LNG_KEYS = ['longitude', 'lng', 'long', 'lon', 'longitute', 'longitudes', 'longit', 'x', 'xcoordinate'];
const NAME_KEYS = ['customer_name', 'customername', 'name', 'customer', 'title', 'label'];
const DETAILS_KEYS = ['details', 'address', 'addr', 'description', 'note', 'info', 'remark'];
const POP_KEYS = ['pop_id', 'popid', 'pop', 'popname', 'pop_name', 'pop_location', 'nearestpop'];

function findKey(keys, candidates) {
  for (const c of candidates) {
    if (keys.includes(c)) return c;
  }
  return null;
}

router.get('/', async (req, res) => {
  try {
    let query = Customer.find({});

    if (req.query.pop_id) {
      query = query.where('pop_id', req.query.pop_id);
    }

    const customers = await query.populate('pop_id', 'name latitude longitude type');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/pop/:popId', async (req, res) => {
  try {
    const customers = await Customer.find({ pop_id: req.params.popId })
      .populate('pop_id', 'name latitude longitude type');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { customer_name, latitude, longitude, details, pop_id } = req.body;

    if (!customer_name || !latitude || !longitude || !pop_id) {
      return res.status(400).json({ error: 'customer_name, latitude, longitude, and pop_id are required' });
    }

    const customer = await Customer.create({
      customer_name: String(customer_name),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      details: String(details || ''),
      pop_id
    });

    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { customer_name, latitude, longitude, details, pop_id } = req.body;

    const updates = {};
    if (customer_name !== undefined) updates.customer_name = customer_name;
    if (latitude !== undefined) updates.latitude = parseFloat(latitude);
    if (longitude !== undefined) updates.longitude = parseFloat(longitude);
    if (details !== undefined) updates.details = details;
    if (pop_id !== undefined) updates.pop_id = pop_id;

    const customer = await Customer.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true
    }).populate('pop_id', 'name latitude longitude type');

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await Customer.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    await Customer.deleteMany({});
    res.json({ message: 'All customers deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      return res.status(400).json({
        error: 'Invalid file type. Only .xlsx, .xls, and .csv files are allowed.',
        detectedColumns: []
      });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) {
      return res.status(400).json({ error: 'Uploaded file is empty' });
    }

    const sampleKeys = Object.keys(rawData[0]);
    const normalizedKeys = sampleKeys.map(normalizeKey);

    const latKey = findKey(normalizedKeys, LAT_KEYS);
    const lngKey = findKey(normalizedKeys, LNG_KEYS);
    const nameKey = findKey(normalizedKeys, NAME_KEYS);
    const detailsKey = findKey(normalizedKeys, DETAILS_KEYS);
    const popKey = findKey(normalizedKeys, POP_KEYS);

    if (!latKey || !lngKey) {
      return res.status(400).json({
        error: 'Could not detect latitude/longitude columns. Required columns: customer_name, latitude, longitude, details, pop_name or pop_id.',
        detectedColumns: sampleKeys
      });
    }

    let insertedCount = 0;
    let skippedCount = 0;
    const errors = [];

    const allPops = await DistributionPoint.find({ type: 'POP' });

    let popByNameCache = null;
    if (popKey) {
      popByNameCache = new Map();
    }

    const docsToInsert = [];

    for (const row of rawData) {
      const normalizedRow = {};
      for (const key in row) {
        if (Object.prototype.hasOwnProperty.call(row, key)) {
          normalizedRow[normalizeKey(key)] = row[key];
        }
      }

      const lat = parseFloat(normalizedRow[latKey]);
      const lng = parseFloat(normalizedRow[lngKey]);

      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        skippedCount++;
        if (rawData.length <= 10) {
          errors.push(`Row ${insertedCount + skippedCount}: invalid lat=${lat}, lng=${lng}`);
        }
        continue;
      }

      const customerName = nameKey ? normalizedRow[nameKey] : `Customer ${insertedCount + skippedCount + 1}`;
      const details = detailsKey ? normalizedRow[detailsKey] : '';

      let popId = null;

      if (popKey && normalizedRow[popKey]) {
        const rawPopValue = String(normalizedRow[popKey]).trim();

        try {
          const popByObjectId = await DistributionPoint.findById(rawPopValue);
          if (popByObjectId && popByObjectId.type === 'POP') {
            popId = popByObjectId._id;
          }
        } catch (e) {
        }

        if (!popId) {
          if (popByNameCache.has(rawPopValue)) {
            popId = popByNameCache.get(rawPopValue);
          } else {
            const popByName = allPops.find(p => p.name === rawPopValue);
            if (popByName) {
              popId = popByName._id;
              popByNameCache.set(rawPopValue, popId);
            } else {
              popByNameCache.set(rawPopValue, null);
            }
          }
        }
      }

      if (!popId) {
        let minDist = Infinity;
        let nearestPop = null;
        for (const pop of allPops) {
          const d = haversineDistance(lat, lng, pop.latitude, pop.longitude);
          if (d < minDist) {
            minDist = d;
            nearestPop = pop;
          }
        }
        if (nearestPop) {
          popId = nearestPop._id;
        }
      }

      if (!popId) {
        skippedCount++;
        errors.push(`Row ${insertedCount + skippedCount}: could not find matching POP for customer "${customerName}"`);
        continue;
      }

      docsToInsert.push({
        customer_name: String(customerName || `Customer ${insertedCount + skippedCount + 1}`),
        latitude: lat,
        longitude: lng,
        details: String(details || ''),
        pop_id: popId
      });
      insertedCount++;
    }

    if (docsToInsert.length > 0) {
      await Customer.insertMany(docsToInsert, { ordered: false });
    }

    res.json({
      message: 'Customer upload complete',
      inserted: insertedCount,
      skipped: skippedCount,
      detectedColumns: sampleKeys,
      matchedPopColumn: popKey,
      sampleErrors: errors.slice(0, 10)
    });
  } catch (error) {
    console.error('Customer upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/sample', (req, res) => {
  try {
    const sampleData = [
      { customer_name: 'Customer 1', latitude: 23.8103, longitude: 90.4125, details: 'Dhaka', pop_name: 'RCC DATA Center' },
      { customer_name: 'Customer 2', latitude: 23.7282, longitude: 90.4166, details: 'Dhaka', pop_name: 'Royal Green Data center(RGDC)' },
      { customer_name: 'Customer 3', latitude: 22.3562, longitude: 91.9123, details: 'Chittagong', pop_name: 'GEC, Chottogram' },
      { customer_name: 'Customer 4', latitude: 24.3750, longitude: 88.6000, details: 'Rajshahi', pop_name: '' },
      { customer_name: 'Customer 5', latitude: '', longitude: '', details: '', pop_name: '' }
    ];

    const worksheet = xlsx.utils.json_to_sheet(sampleData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="sample-customers.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Customer sample error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
