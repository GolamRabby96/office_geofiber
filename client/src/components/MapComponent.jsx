import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const PIN_SVG = (color, label) => `
  <svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C8.48 0 4 4.48 4 10c0 5.5 7 13 10 15.51C17 23 24 15.5 24 10c0-5.52-4.48-10-10-10z" fill="${color}" stroke="white" stroke-width="2"/>
    <text x="14" y="15" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>
`;

const popIcon = new L.DivIcon({
  className: 'custom-pop-icon',
  html: `<div style="width: 28px; height: 38px; display: flex; align-items: center; justify-content: center;">${PIN_SVG('#32CD32', 'P')}</div>`,
  iconSize: [28, 38],
  iconAnchor: [14, 38],
  popupAnchor: [0, -40]
});

const splitterIcon = new L.DivIcon({
  className: 'custom-splitter-icon',
  html: `<div style="width: 28px; height: 38px; display: flex; align-items: center; justify-content: center;">${PIN_SVG('#FF6347', 'S')}</div>`,
  iconSize: [28, 38],
  iconAnchor: [14, 38],
  popupAnchor: [0, -40]
});

const customerIcon = new L.DivIcon({
  className: 'custom-customer-icon',
  html: `<div style="width: 28px; height: 38px; display: flex; align-items: center; justify-content: center;">${PIN_SVG('#9370db', 'C')}</div>`,
  iconSize: [28, 38],
  iconAnchor: [14, 38],
  popupAnchor: [0, -40]
});

const inputIcon = new L.DivIcon({
  className: 'custom-input-icon',
  html: `<div style="width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;">${PIN_SVG('#2196f3', '')}</div>`,
  iconSize: [28, 38],
  iconAnchor: [14, 38],
  popupAnchor: [0, -40]
});

function getIconForType(type) {
  if (type === 'POP') return popIcon;
  if (type === 'Splitter') return splitterIcon;
  return undefined;
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
      pathOptions={{ color: '#32CD32', fillColor: '#32CD32', fillOpacity: 0.7 }}
    >
      <Popup>
        <strong>{point.name}</strong><br />
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

function MapComponent({ points, customers, selectedPoint, result }) {
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

      <FitBoundsController result={result} />

      {points.map(point => (
        <PointMarker key={point._id} point={point} />
      ))}

      {customerConnections.map(({ customer, pop }) => (
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
