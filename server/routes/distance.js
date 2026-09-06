import express from 'express';
import axios from 'axios';
import multer from 'multer';
import xlsx from 'xlsx';
import DistributionPoint from '../models/DistributionPoint.js';

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

router.post('/calculate-distance', async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const points = await DistributionPoint.find({});

    if (points.length === 0) {
      return res.status(404).json({ error: 'No distribution points in database. Please upload Excel data first.' });
    }

    let nearestPoint = null;
    let minDistance = Infinity;

    for (const point of points) {
      const dist = haversineDistance(lat, lng, point.latitude, point.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearestPoint = point;
      }
    }

    if (!nearestPoint) {
      return res.status(404).json({ error: 'No nearby distribution points found' });
    }

    let roadDistance = null;
    let routeCoordinates = [];

    try {
      const osrmUrl = `http://router.project-osrm.org/route/v1/foot/${lng},${lat};${nearestPoint.longitude},${nearestPoint.latitude}?overview=full&geometries=geojson`;
      const response = await axios.get(osrmUrl, { timeout: 10000 });

      if (response.data.code === 'Ok' && response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        roadDistance = route.distance / 1000;
        if (route.geometry && route.geometry.coordinates) {
          routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        }
      }
    } catch (error) {
      console.error('OSRM error:', error);
    }

    const distanceKm = roadDistance !== null ? roadDistance : minDistance;
    const fiberDistance = (distanceKm * 1000 * 1.3).toFixed(0);

    res.json({
        nearestPoint: {
          id: nearestPoint._id,
          name: nearestPoint.name,
          latitude: nearestPoint.latitude,
          longitude: nearestPoint.longitude,
          address: nearestPoint.address,
          type: nearestPoint.type || ''
        },
        inputPoint: {
          latitude: lat,
          longitude: lng
        },
        straightLineDistance: minDistance.toFixed(2),
        fiberDistance: fiberDistance,
        roadDistance: roadDistance !== null ? roadDistance.toFixed(2) : null,
        roadDistanceError: roadDistance === null ? 'Could not calculate road distance using OSRM' : null,
        routeCoordinates: routeCoordinates,
        unit: 'km'
      });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/nearest/:lat/:lng', async (req, res) => {
  try {
    const lat = parseFloat(req.params.lat);
    const lng = parseFloat(req.params.lng);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const points = await DistributionPoint.find({});

    const pointsWithDistance = points.map(point => ({
      ...point.toObject(),
      distance: haversineDistance(lat, lng, point.latitude, point.longitude)
    })).sort((a, b) => a.distance - b.distance).slice(0, 10);

    res.json(pointsWithDistance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function normalizeKey(key) {
  return String(key).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

const LAT_KEYS = ['latitude', 'lat', 'lattitude', 'latit', 'y', 'ycoordinate', 'latitudes'];
const LNG_KEYS = ['longitude', 'lng', 'long', 'lon', 'longitute', 'longitudes', 'longit', 'x', 'xcoordinate'];

function findKey(keys, candidates) {
  for (const c of candidates) {
    if (keys.includes(c)) return c;
  }
  return null;
}

async function calculateFiberDistance(lat, lng, points) {
  let nearestPoint = null;
  let minDistance = Infinity;

  for (const point of points) {
    const dist = haversineDistance(lat, lng, point.latitude, point.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearestPoint = point;
    }
  }

  if (!nearestPoint) return '0';

  let roadDistanceKm = null;

  try {
    const osrmUrl = `http://router.project-osrm.org/route/v1/foot/${lng},${lat};${nearestPoint.longitude},${nearestPoint.latitude}?overview=false`;
    const response = await axios.get(osrmUrl, { timeout: 10000 });

    if (response.data.code === 'Ok' && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      roadDistanceKm = route.distance / 1000;
    }
  } catch (error) {
    console.error('OSRM bulk error:', error);
  }

  const distanceKm = roadDistanceKm !== null ? roadDistanceKm : minDistance;
  return (distanceKm * 1000 * 1.3).toFixed(0);
}

router.post('/bulk-calculate', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const points = await DistributionPoint.find({});

    if (points.length === 0) {
      return res.status(404).json({ error: 'No distribution points in database. Please upload distribution points first.' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    const sampleKeys = rawData.length > 0 ? Object.keys(rawData[0]) : [];
    const normalizedKeys = sampleKeys.map(normalizeKey);

    const latKey = findKey(normalizedKeys, LAT_KEYS);
    const lngKey = findKey(normalizedKeys, LNG_KEYS);

    let useCombined = false;
    let combinedKey = null;

    if (!latKey || !lngKey) {
      for (const key of normalizedKeys) {
        const originalKey = Object.keys(rawData[0])[normalizedKeys.indexOf(key)];
        const sampleVal = String(rawData[0][originalKey] || '');
        if (/^-?\d+(\.\d+)?\s*[,\s]\s*-?\d+(\.\d+)?$/.test(sampleVal.trim())) {
          combinedKey = originalKey;
          useCombined = true;
          break;
        }
      }
    }

    if (!latKey || !lngKey) {
      if (!useCombined) {
        return res.status(400).json({ error: 'Could not detect latitude/longitude columns. Use separate lat/lng columns or one combined column like "23.8103, 90.4125".', detectedColumns: sampleKeys });
      }
    }

    const fiberDistanceKey = 'Fiber Distance (m)';
    const nearestPointKey = 'Nearest POP';
    const roadDistanceKey = 'Road Distance (km)';

    for (const row of rawData) {
      const normalizedRow = {};
      for (const key in row) {
        if (Object.prototype.hasOwnProperty.call(row, key)) {
          normalizedRow[normalizeKey(key)] = row[key];
        }
      }

      let lat = null;
      let lng = null;

      if (useCombined && combinedKey) {
        const rawVal = String(row[combinedKey] || '').trim();
        const parts = rawVal.split(/[,\s]+/).map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        if (parts.length >= 2) {
          if (parts[0] >= -90 && parts[0] <= 90) {
            lat = parts[0];
            lng = parts[1];
          } else if (parts[1] >= -90 && parts[1] <= 90) {
            lat = parts[1];
            lng = parts[0];
          }
        }
      } else if (latKey && lngKey) {
        lat = parseFloat(normalizedRow[normalizeKey(latKey)]);
        lng = parseFloat(normalizedRow[normalizeKey(lngKey)]);
      }

      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        let nearestPoint = null;
        let minDistance = Infinity;

        for (const point of points) {
          const dist = haversineDistance(lat, lng, point.latitude, point.longitude);
          if (dist < minDistance) {
            minDistance = dist;
            nearestPoint = point;
          }
        }

        const fiberDistance = await calculateFiberDistance(lat, lng, points);
        row[fiberDistanceKey] = fiberDistance || '';
        row[nearestPointKey] = nearestPoint ? nearestPoint.name : '';

        try {
          const osrmUrl = `http://router.project-osrm.org/route/v1/foot/${lng},${lat};${nearestPoint.longitude},${nearestPoint.latitude}?overview=false`;
          const response = await axios.get(osrmUrl, { timeout: 10000 });
          if (response.data.code === 'Ok' && response.data.routes && response.data.routes.length > 0) {
            const route = response.data.routes[0];
            row[roadDistanceKey] = (route.distance / 1000).toFixed(2);
          } else {
            row[roadDistanceKey] = '';
          }
        } catch (error) {
          row[roadDistanceKey] = '';
        }
      } else {
        row[fiberDistanceKey] = '';
        row[nearestPointKey] = '';
        row[roadDistanceKey] = '';
      }
    }

    const newWorksheet = xlsx.utils.json_to_sheet(rawData);
    const newWorkbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, sheetName);

    const buffer = xlsx.write(newWorkbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="fiber-distance-result.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Bulk calculate error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/sample', (req, res) => {
  try {
    const sampleData = [
      { latlong: '23.8103, 90.4125' },
      { latlong: '23.7282, 90.4166' },
      { latlong: '22.3562, 91.9123' },
      { latlong: '24.3750, 88.6000' },
      { latlong: '' }
    ];

    const worksheet = xlsx.utils.json_to_sheet(sampleData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="sample-input.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error('Sample error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
