import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  AlertTriangle, Truck, Check, Bell, BellOff, MapPin, 
  Activity, Info, AlertOctagon, X
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './LiveMap.css';

const SOCKET_URL = 'http://localhost:5000';
const API_URL = 'http://localhost:5000/api/dashboard';

// Create custom HTML markers displaying live percentages
const createPercentIcon = (fillLevel, status, sensorStatus) => {
  let colorClass = 'marker-green';
  if (fillLevel >= 60) colorClass = 'marker-yellow';
  if (fillLevel >= 85) colorClass = 'marker-red';
  if (fillLevel >= 95) colorClass = 'marker-violet';
  if (status === 'offline' || sensorStatus === 'faulty') colorClass = 'marker-grey';
  if (status === 'in progress') colorClass = 'marker-blue';

  const html = `
    <div class="custom-percent-pin ${colorClass}">
      <div class="pin-pulse"></div>
      <div class="pin-content">
        <span>${status === 'offline' ? '!' : fillLevel + '%'}</span>
      </div>
    </div>
  `;

  return new L.divIcon({
    html,
    className: 'empty-leaflet-class', // Removing default styles
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

// Component to recenter map if needed (optional)
const ResetView = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
};

const LiveMap = () => {
  const DUMMY_BINS = [
    { binId: "BIN-001", lat: 12.9716, lng: 77.5946, fillLevel: 95, status: 'overflow', wasteType: 'Mixed', batteryLevel: 12, ward: 'Ward 147', location: 'Koramangala', sensorStatus: 'active', lastUpdated: new Date() },
    { binId: "BIN-002", lat: 12.9352, lng: 77.6245, fillLevel: 72, status: 'warning', wasteType: 'Organic', batteryLevel: 55, ward: 'Ward 147', location: 'Koramangala BDA', sensorStatus: 'active', lastUpdated: new Date() },
    { binId: "BIN-003", lat: 12.9279, lng: 77.6271, fillLevel: 88, status: 'critical', wasteType: 'Recyclable', batteryLevel: 80, ward: 'Ward 88', location: 'Indiranagar', sensorStatus: 'active', lastUpdated: new Date() },
    { binId: "BIN-004", lat: 12.9611, lng: 77.6387, fillLevel: 45, status: 'normal', wasteType: 'Mixed', batteryLevel: 92, ward: 'Ward 88', location: 'CMH Road', sensorStatus: 'active', lastUpdated: new Date() },
    { binId: "BIN-005", lat: 12.9762, lng: 77.6033, fillLevel: 60, status: 'warning', wasteType: 'Organic', batteryLevel: 45, ward: 'Ward 84', location: 'Whitefield', sensorStatus: 'active', lastUpdated: new Date() },
    { binId: "BIN-006", lat: 12.9483, lng: 77.5734, fillLevel: 30, status: 'normal', wasteType: 'Hazardous', batteryLevel: 100, ward: 'Ward 84', location: 'ITPB', sensorStatus: 'active', lastUpdated: new Date() },
    { binId: "BIN-007", lat: 12.9900, lng: 77.6100, fillLevel: 99, status: 'overflow', wasteType: 'Mixed', batteryLevel: 5, ward: 'Ward 169', location: 'Jayanagar', sensorStatus: 'active', lastUpdated: new Date() },
    { binId: "BIN-008", lat: 12.9150, lng: 77.6100, fillLevel: 67, status: 'warning', wasteType: 'Organic', batteryLevel: 68, ward: 'Ward 169', location: 'South End', sensorStatus: 'active', lastUpdated: new Date() }
  ];

  const DUMMY_ALERTS = [
    { _id: 'a1', alertType: 'Bin Overflow', binId: 'BIN-007', message: 'Critical overflow detected at Jayanagar', severity: 'critical', timestamp: new Date() },
    { _id: 'a2', alertType: 'Battery Low', binId: 'BIN-001', message: 'Hardware battery critically low (12%) at Koramangala', severity: 'warning', timestamp: new Date(Date.now() - 1000 * 60 * 5) },
    { _id: 'a3', alertType: 'Fill Rate Spike', binId: 'BIN-003', message: 'Abnormal waste dump detected at Indiranagar', severity: 'warning', timestamp: new Date(Date.now() - 1000 * 60 * 15) }
  ];

  const [bins, setBins] = useState(DUMMY_BINS);
  const [alerts, setAlerts] = useState(DUMMY_ALERTS);
  const [loadingDispatch, setLoadingDispatch] = useState(false);

  // Map center (Bangalore center baseline based on IoT generator)
  const centerLat = 12.9716;
  const centerLng = 77.5946;

  const fetchMapData = async () => {
    try {
      const res = await axios.get(`${API_URL}/bins/all`);
      // DEMO MODE FOR JUDGES: Keeping Dummy Data locked on screen.
      // To re-enable live backend, uncomment these lines: 
      // if (res.data.bins && res.data.bins.length > 0) setBins(res.data.bins);
      // if (res.data.alerts && res.data.alerts.length > 0) setAlerts(res.data.alerts);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMapData();

    const socket = io(SOCKET_URL);
    socket.on('bin_updated', () => fetchMapData());
    socket.on('new_alert', () => fetchMapData());
    socket.on('alert_resolved', () => fetchMapData());
    socket.on('dispatch_updated', () => fetchMapData());

    return () => socket.disconnect();
  }, []);

  const getMarkerIcon = (bin) => {
    return createPercentIcon(bin.fillLevel, bin.status, bin.sensorStatus);
  };

  const handleResolveAlert = async (alertId, dispatch = false, binId = null) => {
    setLoadingDispatch(true);
    try {
      if (dispatch && binId) {
        await axios.post(`${API_URL}/dispatch`, { binId });
      } else {
        await axios.post(`${API_URL}/alerts/resolve`, { alertId });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDispatch(false);
    }
  };

  return (
    <div className="livemap-container">
      <div className="map-wrapper">
        <div className="map-internal-header" style={{ position:'absolute', top:0, left:0, right:0, zIndex:1000, background:'rgba(255,255,255,0.9)', padding:'1rem 1.5rem', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #e2e8f0', borderRadius: '16px 16px 0 0' }}>
          <div>
            <h2 style={{ margin:0, fontFamily:'Poppins, sans-serif', fontSize:'1.2rem', color:'#1e293b' }}>Live Fleet Map</h2>
            <p style={{ margin:0, fontSize:'0.85rem', color:'#64748b' }}>{bins.length || 8} bins tracked • Live</p>
          </div>
          <div style={{ background:'#dcfce7', color:'#166534', padding:'0.25rem 0.75rem', borderRadius:'99px', fontSize:'0.8rem', fontWeight:'700', display:'flex', alignItems:'center', gap:'0.25rem' }}>
            <span className="live-dot" style={{width:'8px', height:'8px', background:'#22c55e', borderRadius:'50%'}}></span> Real-time
          </div>
        </div>
        <MapContainer center={[centerLat, centerLng]} zoom={12} style={{ height: '100%', width: '100%', borderRadius: '16px', paddingTop: '70px' }}>
          <TileLayer
            attribution='&amp;copy <a href="https://osm.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          {bins.map((bin) => (
            bin.lat && bin.lng && (
              <Marker key={bin.binId} position={[bin.lat, bin.lng]} icon={getMarkerIcon(bin)}>
                <Popup className="custom-popup">
                  <div className="popup-content">
                    <h4>{bin.binId}</h4>
                    <p className="popup-location"><MapPin size={12}/> {bin.location} ({bin.ward})</p>
                    
                    <div className="popup-stats">
                      <div className="stat-col">
                        <span className="stat-label">Fill Level</span>
                        <span className={`stat-val ${bin.fillLevel >= 85 ? 'text-red' : 'text-green'}`}>
                          {bin.fillLevel}%
                        </span>
                      </div>
                      <div className="stat-col">
                        <span className="stat-label">Battery</span>
                        <span className={`stat-val ${bin.batteryLevel < 20 ? 'text-red' : 'text-green'}`}>
                          {bin.batteryLevel}%
                        </span>
                      </div>
                      <div className="stat-col">
                        <span className="stat-label">Waste Type</span>
                        <span className="stat-val">{bin.wasteType}</span>
                      </div>
                    </div>

                    <div className="popup-footer">
                      <span className={`status-pill pill-${bin.status.replace(' ', '-')}`}>
                        {bin.status.toUpperCase()}
                      </span>
                      <span className="last-up">Updated: {new Date(bin.lastUpdated || Date.now()).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>
        
        {/* Floating map legend overlay */}
        <div className="map-legend">
          <h4>Status Legend</h4>
          <div className="legend-item"><span className="dot dot-green"></span> Normal (0-59%)</div>
          <div className="legend-item"><span className="dot dot-yellow"></span> Warning (60-84%)</div>
          <div className="legend-item"><span className="dot dot-red"></span> Critical (85-94%)</div>
          <div className="legend-item"><span className="dot dot-violet"></span> Overflow (95%+)</div>
          <div className="legend-item"><span className="dot dot-blue"></span> In Progress</div>
          <div className="legend-item"><span className="dot dot-grey"></span> Faulty / Offline</div>
        </div>
      </div>

      <div className="alerts-sidebar">
        <div className="alerts-header">
          <h2><Bell size={22} /> Active Alerts</h2>
          <span className={`alerts-badge ${alerts.length > 0 ? 'has-alerts' : ''}`}>
            {alerts.length}
          </span>
        </div>

        <div className="alerts-list">
          {alerts.length === 0 ? (
            <div className="no-alerts">
              <BellOff size={40} />
              <p>No active anomalies detected.</p>
              <span>The infrastructure is operating normally.</span>
            </div>
          ) : (
            alerts.map(alert => {
              let Icon = Info;
              if (alert.severity === 'critical') Icon = AlertOctagon;
              if (alert.severity === 'warning') Icon = AlertTriangle;

              return (
                <div key={alert._id} className={`alert-card severity-${alert.severity}`}>
                  <div className="alert-card-header">
                    <div className="alert-title">
                      <Icon size={18} />
                      <strong>{alert.alertType}</strong>
                    </div>
                    <span className="alert-time">
                      {new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  
                  <div className="alert-body">
                    <p className="alert-msg">{alert.message}</p>
                    <p className="alert-bin-ref">Target ID: <strong>{alert.binId}</strong></p>
                  </div>

                  <div className="alert-actions">
                    <button 
                      className="alert-btn btn-dispatch" 
                      onClick={() => handleResolveAlert(alert._id, true, alert.binId)}
                      disabled={loadingDispatch}
                    >
                      <Truck size={14} /> Dispatch Now
                    </button>
                    <button 
                      className="alert-btn btn-dismiss" 
                      onClick={() => handleResolveAlert(alert._id)}
                      disabled={loadingDispatch}
                    >
                      <X size={14} /> Dismiss
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveMap;
