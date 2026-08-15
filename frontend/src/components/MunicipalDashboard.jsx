import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import {
  AlertTriangle, RefreshCw, Download, Truck,
  Activity, ZapOff, WifiOff, CheckCircle2, LogOut, Map, BarChart2, Layers, List
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import LiveMap from './LiveMap';
import ZoneAnalytics from './ZoneAnalytics';
import BinRegistry from './BinRegistry';
import './MunicipalDashboard.css';

const SOCKET_URL = 'http://localhost:5005';
const API_URL = 'http://localhost:5005/api/dashboard';

const MunicipalDashboard = () => {
  const { logout } = React.useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('analytics');

  const DUMMY_METRICS = {
    totalBins: 142, onlineBins: 138, criticalBins: 12,
    avgFillLevel: 68, collectionsToday: 24, sensorFaults: 4
  };

  const DUMMY_CHARTS = {
    fleetTrend: [
      { date: 'Mon', avgFill: 45, critical: 4 },
      { date: 'Tue', avgFill: 52, critical: 6 },
      { date: 'Wed', avgFill: 58, critical: 8 },
      { date: 'Thu', avgFill: 65, critical: 11 },
      { date: 'Fri', avgFill: 71, critical: 15 },
      { date: 'Sat', avgFill: 68, critical: 12 },
      { date: 'Sun', avgFill: 64, critical: 9 }
    ],
    // Fallback dummy — replaced by real data below
    wasteVolume: [
      { name: 'Organic', count: 0, fill: '#10b981' },
      { name: 'Recyclable', count: 0, fill: '#3b82f6' },
      { name: 'Hazardous', count: 0, fill: '#ef4444' }
    ]
  };

  const [metrics, setMetrics] = useState(DUMMY_METRICS);
  const [charts, setCharts] = useState(DUMMY_CHARTS);
  const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString());
  const [isLive, setIsLive] = useState(false);
  const [loadingDispatch, setLoadingDispatch] = useState(false);

  // ── NEW: real waste counts from WasteLog ──
  const [wasteStats, setWasteStats] = useState(null);

  const fetchDashboardData = async () => {
    try {
      await axios.get(`${API_URL}/municipal`);
      setIsLive(true);
      setLastSync(new Date().toLocaleTimeString());
    } catch (err) {
      console.error(err);
    }
  };

  // ── NEW: fetch real waste stats ──
  const fetchWasteStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/waste-stats?period=today`);
      const { breakdown } = res.data;

      setWasteStats([
        { name: 'Organic', count: breakdown.Organic, fill: '#10b981' },
        { name: 'Recyclable', count: breakdown.Recyclable, fill: '#3b82f6' },
        { name: 'Hazardous', count: breakdown.Hazardous, fill: '#ef4444' }
      ]);
    } catch (err) {
      console.error('Failed to load waste stats', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchWasteStats();

    const socket = io(SOCKET_URL);
    socket.on('connect', () => setIsLive(true));
    socket.on('disconnect', () => setIsLive(false));
    socket.on('bin_updated', () => fetchDashboardData());
    socket.on('dispatch_updated', () => fetchDashboardData());

    // ── NEW: refresh waste stats when Python logs a new classification ──
    socket.on('new_waste_log', () => fetchWasteStats());

    return () => socket.disconnect();
  }, []);

  const handleDispatch = async () => {
    setLoadingDispatch(true);
    try {
      await axios.post(`${API_URL}/dispatch`);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDispatch(false);
    }
  };

  // Use real wasteStats if available, else dummy zeros
  const wasteVolumeData = wasteStats || DUMMY_CHARTS.wasteVolume;

  return (
    <div className="municipal-dashboard">
      <div className="md-header-container">
        <div className="md-header-left">
          <h1 className="md-title">Municipal Operations</h1>
          <p className="md-subtitle">Wards 1–15, Metro City</p>
        </div>
        <div className="md-header-right">
          <div className="md-status-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="md-status-indicator">
              <div className={`status-dot ${isLive ? 'live' : ''}`}></div>
              <div className="status-text">{isLive ? 'SYSTEM LIVE' : 'CONNECTING...'}</div>
            </div>
            <button
              onClick={logout}
              className="md-btn"
              style={{ backgroundColor: '#ef4444', color: '#fff', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 'bold' }}
            >
              <LogOut size={16} /> SIGN OUT
            </button>
          </div>
          <span className="last-sync">Last sync: {lastSync}</span>
        </div>
      </div>

      <div className="md-view-toggle">
        <button className={`toggle-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
          <BarChart2 size={16} /> Analytics Overview
        </button>
        <button className={`toggle-btn ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
          <Map size={16} /> Live Fleet Map
        </button>
        <button className={`toggle-btn ${activeTab === 'zones' ? 'active' : ''}`} onClick={() => setActiveTab('zones')}>
          <Layers size={16} /> Zone Analytics
        </button>
        <button className={`toggle-btn ${activeTab === 'registry' ? 'active' : ''}`} onClick={() => setActiveTab('registry')}>
          <List size={16} /> Bin Registry
        </button>
      </div>

      {activeTab === 'registry' && <BinRegistry />}
      {activeTab === 'zones' && <ZoneAnalytics />}
      {activeTab === 'map' && <LiveMap />}

      {activeTab === 'analytics' && (
        <>
          <div className="md-actions-bar">
            <button className="md-btn btn-danger" onClick={handleDispatch} disabled={loadingDispatch || metrics.criticalBins === 0}>
              <Truck size={18} />
              {loadingDispatch ? 'Dispatching...' : 'Dispatch Critical Bins'}
            </button>
            <button className="md-btn btn-secondary" onClick={() => { fetchDashboardData(); fetchWasteStats(); }}>
              <RefreshCw size={18} /> Refresh
            </button>
            <button className="md-btn btn-secondary">
              <Download size={18} /> Export Report
            </button>
          </div>

          <div className="md-metrics-grid">
            <div className="md-metric-card">
              <div className="md-metric-header">
                <h3>Total Bins Online</h3>
                <div className="icon-wrapper green"><CheckCircle2 size={20} /></div>
              </div>
              <p className="md-metric-value">{metrics.onlineBins}</p>
              <p className="md-metric-subtext">of {metrics.totalBins} deployed</p>
              <p className="md-metric-alert"><WifiOff size={14} /> {metrics.totalBins - metrics.onlineBins} offline</p>
            </div>

            <div className={`md-metric-card ${metrics.criticalBins > 0 ? 'critical-card' : ''}`}>
              <div className="md-metric-header">
                <h3>Critical Fill (&gt;85%)</h3>
                <div className="icon-wrapper red"><AlertTriangle size={20} /></div>
              </div>
              <p className="md-metric-value">{metrics.criticalBins}</p>
              <p className="md-metric-subtext red-text">Urgent collection needed</p>
              {metrics.criticalBins > 0 && <p className="md-metric-alert red-bg">Overflowing bins detected</p>}
            </div>

            <div className="md-metric-card">
              <div className="md-metric-header">
                <h3>Average Fill Level</h3>
                <div className="icon-wrapper blue"><Activity size={20} /></div>
              </div>
              <p className="md-metric-value">{metrics.avgFillLevel}%</p>
              <p className="md-metric-subtext">Fleet capacity utilized</p>
            </div>

            <div className="md-metric-card">
              <div className="md-metric-header">
                <h3>Collections Today</h3>
                <div className="icon-wrapper orange"><Truck size={20} /></div>
              </div>
              <p className="md-metric-value">{metrics.collectionsToday}</p>
              <p className="md-metric-subtext">Completed routes</p>
              <p className="md-metric-alert orange-bg">3 routes in progress</p>
            </div>

          </div>

          <div className="md-charts-container">
            <div className="md-chart-card">
              <h3>Fleet Fill Level Trend</h3>
              <p className="chart-subtitle">Past 14 days analysis</p>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={charts.fleetTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} dx={-10} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Line type="monotone" dataKey="avgFill" name="Avg Fill %" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="critical" name="Critical Bins" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── UPDATED: real item counts from WasteLog ── */}
            <div className="md-chart-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3>Waste Items Today</h3>
                  <p className="chart-subtitle">Items classified by FutureCan</p>
                </div>
                {wasteStats && (
                  <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, background: '#d1fae5', padding: '2px 8px', borderRadius: '99px' }}>
                    ● LIVE
                  </span>
                )}
              </div>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={wasteVolumeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} dx={-10} />
                    <Tooltip
                      cursor={{ fill: '#f3f4f6' }}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                      formatter={(value) => [`${value} items`, 'Count']}
                    />
                    <Bar dataKey="count" name="Items classified" radius={[6, 6, 0, 0]}>
                      {wasteVolumeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MunicipalDashboard;