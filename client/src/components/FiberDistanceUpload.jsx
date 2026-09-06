import React, { useState, useRef } from 'react';
import axios from 'axios';

const API_URL = '/api';

function FiberDistanceUpload() {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setMessage({ type: 'error', text: 'Please upload an Excel file (.xlsx or .xls)' });
      return;
    }

    if (downloadUrl) {
      window.URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    setUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/distance/bulk-calculate`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(response.data);
      setDownloadUrl(url);
      setMessage({ type: 'success', text: 'Fiber distance calculated successfully! Click Download to get the file.' });
    } catch (error) {
      let errorMessage = 'Calculation failed';
      if (error.response?.data) {
        const text = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
        try {
          const parsed = JSON.parse(text);
          errorMessage = parsed.error || errorMessage;
        } catch {
          errorMessage = text || errorMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      setMessage({
        type: 'error',
        text: errorMessage
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', 'fiber-distance-result.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  };

  const handleDownloadSample = async () => {
    try {
      const response = await axios.get(`${API_URL}/distance/sample`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sample-input.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to download sample file' });
    }
  };

  return (
    <div style={{ marginTop: '20px', padding: '15px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h3 style={{ marginTop: 0, color: '#333' }}>Fiber Distance Calculator</h3>
      <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
        Upload an Excel file with a single latitude/longitude column like "23.8103, 90.4125". The system will calculate fiber distance along the road and add new columns. Blank or invalid coordinates will be skipped.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
        id="fiber-distance-upload"
      />

      <label htmlFor="fiber-distance-upload" style={{
        display: 'block',
        padding: '12px',
        background: uploading ? '#ccc' : '#1565c0',
        color: 'white',
        textAlign: 'center',
        borderRadius: '6px',
        cursor: uploading ? 'not-allowed' : 'pointer',
        marginBottom: '10px',
        fontSize: '14px'
      }}>
        {uploading ? 'Calculating...' : 'Upload & Calculate'}
      </label>

      <button
        onClick={handleDownloadSample}
        style={{
          width: '100%',
          padding: '10px',
          background: '#607d8b',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          marginBottom: '10px',
          fontSize: '13px'
        }}
      >
        Download Sample Excel
      </button>

      {message && (
        <div style={{
          padding: '10px',
          borderRadius: '4px',
          background: message.type === 'error' ? '#ffebee' : '#e8f5e9',
          color: message.type === 'error' ? '#c62828' : '#2e7d32',
          fontSize: '14px'
        }}>
          {message.text}
        </div>
      )}

      {downloadUrl && (
        <button
          onClick={handleDownload}
          style={{
            width: '100%',
            marginTop: '10px',
            padding: '12px',
            background: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          Download Result
        </button>
      )}
    </div>
  );
}

export default FiberDistanceUpload;
