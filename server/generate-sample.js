import xlsx from 'xlsx';
import fs from 'fs';

const data = [
  { name: 'Location 1', latlong: '23.8103, 90.4125', address: 'Dhaka' },
  { name: 'Location 2', latlong: '23.7282, 90.4166', address: 'Dhaka' },
  { name: 'Location 3', latlong: '22.3562, 91.9123', address: 'Chittagong' }
];

const worksheet = xlsx.utils.json_to_sheet(data);
const workbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
fs.writeFileSync('sample-input.xlsx', buffer);
console.log('Sample file created: sample-input.xlsx');
