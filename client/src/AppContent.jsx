import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MapComponent from './components/MapComponent.jsx';
import DistanceInput from './components/DistanceInput.jsx';
import FiberDistanceUpload from './components/FiberDistanceUpload.jsx';

const API_URL = '/api';

function AppContent() {
  const [points, setPoints] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);

  useEffect(() => {
    fetchPoints();
    fetchCustomers();
  }, []);

  const fetchPoints = async () => {
    try {
      const response = await axios.get(`${API_URL}/upload/points`);
      setPoints(response.data);
    } catch (error) {
      console.error('Error fetching points:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API_URL}/customers`);
      const customersWithPop = response.data.map(c => ({
        ...c,
        pop_id: c.pop_id || c.popId
      }));
      setCustomers(customersWithPop);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const calculateDistance = async (lat, lng) => {
    setLoading(true);
    setResult(null);
    try {
      const response = await axios.post(`${API_URL}/distance/calculate-distance`, {
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      });
      setResult(response.data);
      setSelectedPoint(response.data.nearestPoint);
    } catch (error) {
      console.error('Error calculating distance:', error);
      setResult({ error: error.response?.data?.error || error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div style={{ width: '350px', background: '#f5f5f5', padding: '20px', overflowY: 'auto', borderRight: '1px solid #ddd' }}>
        <DistanceInput onCalculate={calculateDistance} loading={loading} />

        {result && (
          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: result.error ? '#ffebee' : '#e8f5e9',
            borderRadius: '8px',
            border: `1px solid ${result.error ? '#f44336' : '#4caf50'}`
          }}>
            <h3 style={{ marginTop: 0, color: result.error ? '#c62828' : '#2e7d32' }}>
              {result.error ? 'Error' : 'Result'}
            </h3>
            {result.error ? (
              <p style={{ margin: 0, fontSize: '14px' }}>{result.error}</p>
            ) : (
              <div style={{ fontSize: '14px' }}>
                <p><strong>Input Point:</strong> ({result.inputPoint.latitude.toFixed(6)}, {result.inputPoint.longitude.toFixed(6)})</p>
                <p><strong>Nearest Point:</strong> {result.nearestPoint.name}</p>
                {result.nearestPoint.type && <p><strong>Type:</strong> {result.nearestPoint.type}</p>}
                <p><strong>Coordinates:</strong> ({result.nearestPoint.latitude.toFixed(6)}, {result.nearestPoint.longitude.toFixed(6)})</p>
                {result.nearestPoint.address && <p><strong>Address:</strong> {result.nearestPoint.address}</p>}
                <hr style={{ border: 'none', borderTop: '1px solid #ccc', margin: '10px 0' }} />
                <p><strong>Straight-line Distance:</strong> {result.straightLineDistance} km</p>
                {result.fiberDistance ? (
                  <p style={{ color: '#1565c0' }}>
                    <strong>Fiber Distance:</strong> {result.fiberDistance} meter
                  </p>
                ) : null}
                {result.roadDistance ? (
                  <p style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                    <strong>Road Distance:</strong> {result.roadDistance} km
                  </p>
                ) : (
                  <p style={{ color: '#f57c00' }}>
                    <strong>Road Distance:</strong> {result.roadDistanceError || 'Not available'}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '20px', padding: '15px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>Distribution Points ({points.length})</h3>
          {points.length === 0 ? (
            <p style={{ color: '#666', fontSize: '14px' }}>No points loaded. Contact admin to upload data.</p>
          ) : (
            <div style={{ fontSize: '14px' }}>
              <p style={{ color: '#333' }}>{points.length} distribution points loaded</p>
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#32cd32' }}></span>
                  POPs: {points.filter(p => p.type === 'POP').length}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff6347' }}></span>
                  Splitters: {points.filter(p => p.type === 'Splitter').length}
                </span>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '20px', padding: '15px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>Customers ({customers.length})</h3>
          {customers.length === 0 ? (
            <p style={{ color: '#666', fontSize: '14px' }}>No customers loaded.</p>
          ) : (
            <p style={{ color: '#333', fontSize: '14px' }}>{customers.length} customers loaded and connected to POPs</p>
          )}
        </div>

        <FiberDistanceUpload />
      </div>

      <div style={{ flex: 1 }}>
        <MapComponent
          points={points}
          customers={customers}
          selectedPoint={selectedPoint}
          result={result}
        />
      </div>
    </div>
  );
}

export default AppContent;
