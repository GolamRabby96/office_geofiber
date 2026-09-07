import React, { useMemo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function svgToDataUri(svg) {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E');
  return `data:image/svg+xml;charset=UTF-8,${encoded}`;
}

function createPinIcon(color, label) {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
  <path d="M14 0C8.48 0 4 4.48 4 10c0 5.5 7 13 10 15.51C17 23 24 15.5 24 10c0-5.52-4.48-10-10-10z" fill="${color}" stroke="white" stroke-width="2"/>
  <text x="14" y="11" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${label}</text>
</svg>`;
  return L.icon({
    iconUrl: svgToDataUri(svg),
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -40],
    className: 'custom-marker-icon',
    shadowUrl: undefined
  });
}

const popIcon = createPinIcon('#32CD32', 'P');
const splitterIcon = createPinIcon('#FF6347', 'S');
const customerIcon = createPinIcon('#9370db', 'C');
const inputIcon = createPinIcon('#2196f3', '');

function getIconForType(type) {
  if (!type) return undefined;
  const t = String(type).trim().toUpperCase();
  if (t === 'POP') return popIcon;
  if (t === 'SPLITTER') return splitterIcon;
  return undefined;
}

function isPopType(type) {
  if (!type) return false;
  return String(type).trim().toUpperCase() === 'POP';
}

function ZoomTracker({ onZoomChange }) {
  const map = useMap();

  useEffect(() => {
    const handleZoomEnd = () => {
      onZoomChange(map.getZoom());
    };

    map.on('zoomend', handleZoomEnd);
    onZoomChange(map.getZoom());

    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map, onZoomChange]);

  return null;
}

function FitBoundsController({ result }) {
  const map = useMap();

  useEffect(() => {
    if (!result || result.error || !result.inputPoint || !result.nearestPoint) return;

    const latlng1 = L.latLng(result.inputPoint.latitude, result.inputPoint.longitude);
    const latlng2 = L.latLng(result.nearestPoint.latitude, result.nearestPoint.longitude);

    map.fitBounds(L.latLngBounds([latlng1, latlng2]), { padding: [60, 60], maxZoom: 16 });
  }, [result, map]);

  return null;
}

function findPopForCustomer(customer, points) {
  if (!customer.pop_id) return null;

  const popId = typeof customer.pop_id === 'object' && customer.pop_id !== null
    ? customer.pop_id._id || customer.pop_id.id
    : customer.pop_id;

  return points.find(p => String(p._id) === String(popId));
}

function PointMarker({ point }) {
  const icon = getIconForType(point.type);

  if (icon) {
    return (
      <Marker
        position={[point.latitude, point.longitude]}
        icon={icon}
      >
        <Popup>
          <strong>{point.name}</strong><br />
          {point.type && <><strong>Type:</strong> {point.type}<br /></>}
          {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}<br />
          {point.address && <><br />{point.address}</>}
        </Popup>
      </Marker>
    );
  }

  return (
    <CircleMarker
      center={[point.latitude, point.longitude]}
      radius={6}
      pathOptions={{
        color: isPopType(point.type) ? '#32CD32' : '#FF6347',
        fillColor: isPopType(point.type) ? '#32CD32' : '#FF6347',
        fillOpacity: 0.7
      }}
    >
      <Popup>
        <strong>{point.name}</strong><br />
        {point.type && <><strong>Type:</strong> {point.type}<br /></>}
        {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}<br />
        {point.address && <><br />{point.address}</>}
      </Popup>
    </CircleMarker>
  );
}

function CustomerMarker({ customer, associatedPop }) {
  return (
    <>
      <Marker
        position={[customer.latitude, customer.longitude]}
        icon={customerIcon}
      >
        <Popup>
          <strong>{customer.customer_name}</strong><br />
          {customer.latitude.toFixed(6)}, {customer.longitude.toFixed(6)}<br />
          {customer.details && <><br />{customer.details}</>}
          {associatedPop && <><br /><strong>POP:</strong> {associatedPop.name}</>}
        </Popup>
      </Marker>

      {associatedPop && (
        <Polyline
          positions={[
            [customer.latitude, customer.longitude],
            [associatedPop.latitude, associatedPop.longitude]
          ]}
          pathOptions={{ color: '#9370db', weight: 2, opacity: 0.6, dashArray: '5,5' }}
        />
      )}
    </>
  );
}

function ZoomIndicator({ zoomLevel }) {
  return (
    <div style={{
      position: 'absolute',
      bottom: '10px',
      right: '10px',
      zIndex: 1000,
      background: 'rgba(255, 255, 255, 0.85)',
      padding: '6px 12px',
      borderRadius: '4px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#333',
      backdropFilter: 'blur(2px)',
      border: '1px solid rgba(0,0,0,0.1)'
    }}>
      Zoom: {zoomLevel}
    </div>
  );
}

function MapComponent({ points, customers, selectedPoint, result }) {
  const [zoomLevel, setZoomLevel] = useState(13);
  const showAllMarkers = zoomLevel >= 16;

  const center = useMemo(() => {
    if (points.length > 0) {
      return [points[0].latitude, points[0].longitude];
    }
    return [23.8103, 90.4125];
  }, [points]);

  const routeCoords = result && !result.error && result.routeCoordinates && result.routeCoordinates.length > 0
    ? result.routeCoordinates
    : [];

  const fiberLineCoords = routeCoords.length > 1
    ? routeCoords
    : [];

  const visiblePoints = useMemo(() => {
    if (showAllMarkers) return points;
    return points.filter(point => isPopType(point.type));
  }, [points, showAllMarkers]);

  const customerConnections = useMemo(() => {
    if (!customers || customers.length === 0 || points.length === 0) return [];
    return customers.map(customer => ({
      customer,
      pop: findPopForCustomer(customer, points)
    }));
  }, [customers, points]);

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <ZoomTracker onZoomChange={setZoomLevel} />
      <ZoomIndicator zoomLevel={zoomLevel} />
      <FitBoundsController result={result} />

      {visiblePoints.map(point => (
        <PointMarker key={point._id} point={point} />
      ))}

      {showAllMarkers && customerConnections.map(({ customer, pop }) => (
        <CustomerMarker key={customer._id || customer.id} customer={customer} associatedPop={pop} />
      ))}

      {selectedPoint && (
        <Marker
          key="selected-point"
          position={[selectedPoint.latitude, selectedPoint.longitude]}
          icon={getIconForType(selectedPoint.type) || new L.Icon.Default()}
        >
          <Popup>
            <strong>Selected: {selectedPoint.name}</strong><br />
            {selectedPoint.type && <><strong>Type:</strong> {selectedPoint.type}<br /></>}
            {selectedPoint.latitude.toFixed(6)}, {selectedPoint.longitude.toFixed(6)}
          </Popup>
        </Marker>
      )}

      {result && !result.error && result.inputPoint && (
        <Marker key="input-point" position={[result.inputPoint.latitude, result.inputPoint.longitude]} icon={inputIcon}>
          <Popup>
            <strong>Your Input Location</strong><br />
            {result.inputPoint.latitude.toFixed(6)}, {result.inputPoint.longitude.toFixed(6)}
          </Popup>
        </Marker>
      )}

      {routeCoords.length > 1 && (
        <Polyline
          key="road-route"
          positions={routeCoords}
          pathOptions={{ color: '#2196f3', weight: 4, opacity: 0.7 }}
        />
      )}

      {fiberLineCoords.length > 1 && (
        <Polyline
          key="fiber-line"
          positions={fiberLineCoords}
          pathOptions={{ color: '#e91e63', weight: 5, opacity: 0.9 }}
        />
      )}
    </MapContainer>
  );
}

export default MapComponent;
