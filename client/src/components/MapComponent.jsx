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

const popIcon = new L.DivIcon({
  className: 'custom-pop-icon',
  html: `<div style="
    background-color: #e91e63;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 10px;
  ">P</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

const splitterIcon = new L.DivIcon({
  className: 'custom-splitter-icon',
  html: `<div style="
    background-color: #ff9800;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    border: 3px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 10px;
  ">S</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

const inputIcon = new L.DivIcon({
  className: 'custom-input-icon',
  html: `<div style="
    background-color: #2196f3;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -9]
});

function getIconForType(equipmentType) {
  if (equipmentType === 'POP') return popIcon;
  if (equipmentType === 'Splitter') return splitterIcon;
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

function MapComponent({ points, selectedPoint, result }) {
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

      {selectedPoint && (
        <Marker
          key="selected-point"
          position={[selectedPoint.latitude, selectedPoint.longitude]}
          icon={getIconForType(selectedPoint.equipmentType) || new L.Icon.Default()}
        >
          <Popup>
            <strong>Selected: {selectedPoint.name}</strong><br />
            {selectedPoint.equipmentType && <><strong>Type:</strong> {selectedPoint.equipmentType}<br /></>}
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

function PointMarker({ point }) {
  const icon = getIconForType(point.equipmentType);

  if (icon) {
    return (
      <Marker
        position={[point.latitude, point.longitude]}
        icon={icon}
      >
        <Popup>
          <strong>{point.name}</strong><br />
          {point.equipmentType && <><strong>Type:</strong> {point.equipmentType}<br /></>}
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
      pathOptions={{ color: '#2196f3', fillColor: '#2196f3', fillOpacity: 0.7 }}
    >
      <Popup>
        <strong>{point.name}</strong><br />
        {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}<br />
        {point.address && <><br />{point.address}</>}
      </Popup>
    </CircleMarker>
  );
}

export default MapComponent;
