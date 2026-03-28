import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from '../api/axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Bell, User, QrCode, Download, Leaf, Award, Flame, Star, MapPin, Activity, CheckCircle, AlertTriangle, Loader, Hash, Gift, Ticket, ArrowRight, Server } from 'lucide-react';
import './UserDashboard.css';
import Particles from './Particles';

// Fix leaflet icon issue in react
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const COLORS = ['#3b82f6', '#10b981', '#ef4444'];

export default function UserDashboard() {
  const { user, logout, login } = useContext(AuthContext); // 'login' helps update user context
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, map, feedback, complaint, rewards
  
  const [rewards, setRewards] = useState([]);
  const [loadingRewards, setLoadingRewards] = useState(false);

  const [feedback, setFeedback] = useState({ location: 'Central Park Bin', rating: 5, issueType: 'None', comment: '' });
  const [complaint, setComplaint] = useState({ location: '', issueType: 'Overflowing', description: '', image: null });
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await axios.get('/dashboard/user');
        setData(res.data);
      } catch (err) {
        console.error("Failed to load user dashboard", err);
      }
    };
    fetchDashboard();
  }, []);

  const fetchRewardsList = async () => {
    try {
      setLoadingRewards(true);
      const res = await axios.get('/rewards');
      setRewards(res.data);
    } catch (err) {
      console.error('Error fetching rewards:', err);
    } finally {
      setLoadingRewards(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'rewards' && rewards.length === 0) {
      fetchRewardsList();
    }
  }, [activeTab]);

  const handleRedeem = async (reward) => {
    if (user.points < reward.pointsCost) {
      showToast('Not enough points to redeem this reward.');
      return;
    }
    
    if (window.confirm(`Are you sure you want to redeem "${reward.title}" for ${reward.pointsCost} pts?`)) {
      try {
        const res = await axios.post('/rewards/redeem', { rewardId: reward._id });
        showToast(`Successfully redeemed "${reward.title}"! 🎁`);
        
        // Update user points context
        const token = localStorage.getItem('token');
        login({ ...user, points: res.data.userPoints }, token);
        
        // Update local dashboard data
        setData(prev => ({
          ...prev,
          user: { ...prev.user, points: res.data.userPoints }
        }));
      } catch (err) {
        showToast(err.response?.data?.message || 'Failed to redeem reward.');
      }
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/feedback', feedback);
      setToastMsg('Feedback submitted successfully! 🌱');
      setFeedback({ ...feedback, comment: '' });
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err) {
      setToastMsg('Error submitting feedback');
      setTimeout(() => setToastMsg(''), 3000);
    }
  };

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', user.name);
      formData.append('location', complaint.location);
      formData.append('issueType', complaint.issueType);
      formData.append('description', complaint.description);
      if (complaint.image) formData.append('image', complaint.image);

      await axios.post('/complaint', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setToastMsg('Complaint sent to municipality successfully! 📝');
      setComplaint({ ...complaint, description: '', location: '', image: null });
      setTimeout(() => setToastMsg(''), 3000);
    } catch (err) {
      setToastMsg('Error submitting complaint');
      setTimeout(() => setToastMsg(''), 3000);
    }
  };

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader className="spinner" size={32} color="#10b981" />
      </div>
    );
  }

  return (
    <div className="user-dashboard">
      <Particles />
      <div className="ud-dashboard-wrapper">
        {toastMsg && (
        <div className="ud-toast">
          <CheckCircle color="#10b981" size={20} />
          {toastMsg}
        </div>
      )}

      {/* TOP NAVBAR */}
      <nav className="ud-navbar">
        <div className="ud-nav-left">
          <div className="ud-logo">
            <Leaf color="#10b981" size={24} /> Greenovators <span className="ud-badge">BETA</span>
          </div>
        </div>

        <div className="ud-nav-right">
          <div className="ud-live-sync" style={{ marginRight: '1rem' }}>
            <div className="ud-dot"></div> Live Sync
          </div>
          <div className="ud-profile">
            <div className="ud-avatar"><User size={20} /></div>
            <div className="ud-user-info">
              <p className="ud-name">{user?.name}</p>
              <p className="ud-bin"><Hash size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {user?.binId}</p>
            </div>
          </div>
          <button 
            onClick={logout} 
            className="ud-btn ud-btn-secondary ud-btn-logout" 
            title="Sign Out"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <main className="ud-main">
        {/* WELCOME SECTION */}
        <section className="ud-welcome">
          <div>
            <h1>👋 Good morning, {user?.name.split(' ')[0]}</h1>
            <p className="ud-subtitle">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • Ward 4 • Green Member
            </p>
          </div>
        </section>

        {/* NAVIGATION MENU */}
        <div className="ud-menu-bar">
          <button className={`ud-menu-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <Activity size={18} /> Analytics Overview
          </button>
          <button className={`ud-menu-tab ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
            <MapPin size={18} /> Nearby Bins Map
          </button>
          <button className={`ud-menu-tab ${activeTab === 'rewards' ? 'active' : ''}`} onClick={() => setActiveTab('rewards')}>
            <Gift size={18} /> Redeem Rewards
          </button>
          <button className={`ud-menu-tab ${activeTab === 'feedback' ? 'active' : ''}`} onClick={() => setActiveTab('feedback')}>
            <Star size={18} /> Dustbin Feedback
          </button>
          <button className={`ud-menu-tab ${activeTab === 'complaint' ? 'active' : ''}`} onClick={() => setActiveTab('complaint')}>
            <AlertTriangle size={18} /> Report Issue
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* STATS CARDS */}
        <div className="ud-stats-grid">
          {[
            { title: 'Total Points', value: data.user.points, icon: <Award color="#f59e0b" size={20} />, color: 'yellow', badge: 'Gold Tier', trend: '+120 this week' },
            { title: 'Current Streak', value: `${data.user.streak} Days`, icon: <Flame color="#f97316" size={20} />, color: 'orange', badge: 'Personal Best', trend: 'Keep it up!' },
            { title: 'Leaderboard Rank', value: `#${data.user.rank.replace(/[^0-9]/g, '') || '42'}`, icon: <Star color="#8b5cf6" size={20} />, color: 'purple', badge: 'Top 5%', trend: 'Up 3 spots' },
            { title: 'CO2 Offset', value: `${data.user.CO2Offset} kg`, icon: <Leaf color="#10b981" size={20} />, color: 'green', badge: 'Eco Hero', trend: 'Equals 2 trees' }
          ].map((stat, i) => (
            <div key={i} className={`ud-stat-card ${stat.color}`}>
              <div className="ud-stat-header">
                <h3 className="ud-stat-title">{stat.title}</h3>
                <span className="ud-stat-badge">{stat.badge}</span>
              </div>
              <div className="ud-stat-value">{stat.value}</div>
              <div className="ud-stat-footer">
                {stat.icon} <span>{stat.trend}</span>
              </div>
            </div>
          ))}
        </div>

        {/* CHARTS SECTION */}
        <div className="ud-charts-row">
          
          <div className="ud-panel">
            <div className="ud-panel-header">
              <h3 className="ud-panel-title"><PieChart size={18} color="#94a3b8" /> Waste Breakdown</h3>
            </div>
            <div className="ud-donut-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data.wasteBreakdown} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                    {data.wasteBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="ud-donut-center">
                <h3>{data.wasteBreakdown.reduce((a, b) => a + b.value, 0)}</h3>
                <p>TOTAL ITEMS</p>
              </div>
            </div>
            <div className="ud-legend">
              {data.wasteBreakdown.map((item, i) => (
                <div key={i} className="ud-legend-item">
                  <div className="ud-legend-color" style={{ background: item.fill || COLORS[i] }}></div>
                  {item.name}
                </div>
              ))}
            </div>
          </div>

          <div className="ud-panel">
            <div className="ud-panel-header">
              <h3 className="ud-panel-title"><Activity size={18} color="#94a3b8" /> Weekly Recycling Activity</h3>
              <select className="ud-select">
                <option>This Week</option>
                <option>Last Week</option>
              </select>
            </div>
            <div style={{ height: '270px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.weeklyActivity} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="pointsEarned" fill="#a7f3d0" radius={[4, 4, 0, 0]} activeBar={{ fill: '#34d399' }} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
          </>
        )}

        {/* MAP SECTION */}
        {activeTab === 'map' && (
          <div className="ud-panel" style={{ marginBottom: '2rem' }}>
             <h3 className="ud-panel-title" style={{ marginBottom: '1.5rem' }}><MapPin size={18} color="#10b981" /> Nearby Bin Locations</h3>
             <div style={{ height: '400px', borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
               <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                <Marker position={[51.505, -0.09]}>
                  <Popup>
                    <strong style={{ color: '#1e293b' }}>Central Park Bin</strong><br/>
                    <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 600 }}>● Active & Ready</span>
                  </Popup>
                </Marker>
                <Marker position={[51.51, -0.1]}>
                  <Popup>
                    <strong style={{ color: '#1e293b' }}>North Station Bin</strong><br/>
                    <span style={{ color: '#f59e0b', fontSize: '11px', fontWeight: 600 }}>● Almost Full</span>
                  </Popup>
                </Marker>
              </MapContainer>
             </div>
          </div>
        )}

        {/* REWARDS SECTION */}
        {activeTab === 'rewards' && (
          <div className="ud-panel" style={{ marginBottom: '2rem' }}>
            <div className="ud-panel-header" style={{ alignItems: 'flex-end' }}>
              <div>
                <h3 className="ud-panel-title" style={{ color: '#064e3b', fontSize: '1.4rem' }}>
                  <Gift size={22} color="#10b981" /> Redeem Rewards
                </h3>
                <p className="ud-rewards-subtitle">You have <strong style={{ color: '#10b981' }}>{user.points || data.user.points} pts</strong> available</p>
              </div>
              <button className="ud-btn ud-btn-secondary" style={{ color: '#059669', borderColor: '#a7f3d0' }}>
                View all history <ArrowRight size={16} />
              </button>
            </div>

            {loadingRewards ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}><Loader className="spinner" size={32} color="#10b981" /></div>
            ) : (
              <div className="ud-rewards-grid">
                {rewards.map((reward) => (
                  <div key={reward._id} className={`ud-reward-card ${reward.status === 'out_of_stock' ? 'out-of-stock' : ''}`}>
                    <div className="ud-rc-header">
                      <div className="ud-rc-icon">
                        {reward.iconType === 'Leaf' ? <Leaf size={20} color="#059669" /> : 
                         reward.iconType === 'Ticket' ? <Ticket size={20} color="#059669" /> : 
                         <Gift size={20} color="#059669" />}
                      </div>
                      <span className="ud-rc-badge">{reward.expiryText}</span>
                    </div>
                    
                    <h4 className="ud-rc-title">{reward.title}</h4>
                    <p className="ud-rc-desc">{reward.description}</p>
                    
                    <div className="ud-rc-footer">
                      <span className="ud-rc-points">{reward.pointsCost} pts</span>
                      {reward.status === 'out_of_stock' ? (
                        <button className="ud-rc-btn disabled" disabled>Out of Stock</button>
                      ) : (
                        <button 
                          className={`ud-rc-btn ${user.points < reward.pointsCost ? 'insufficient' : ''}`}
                          onClick={() => handleRedeem(reward)}
                          disabled={user.points < reward.pointsCost}
                        >
                          {user.points < reward.pointsCost ? 'Not enough pts' : 'Redeem Reward'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FORMS */}
        {activeTab === 'feedback' && (
          <div className="ud-panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h3 className="ud-panel-title mb-1.5" style={{ marginBottom: '1.5rem' }}><Star size={18} color="#fbbf24" fill="#fbbf24" /> Dustbin Feedback</h3>
            <form onSubmit={handleFeedbackSubmit}>
              <div className="ud-form-group">
                <label>Select Location</label>
                <select className="ud-select-full" value={feedback.location} onChange={(e) => setFeedback({...feedback, location: e.target.value})}>
                  <option>Central Park Bin</option>
                  <option>North Station Bin</option>
                  <option>City Hall Bin</option>
                </select>
              </div>
              <div className="ud-grid-2">
                <div className="ud-form-group">
                  <label>Rating (1-5)</label>
                  <input type="number" min="1" max="5" required className="ud-input" value={feedback.rating} onChange={(e) => setFeedback({...feedback, rating: e.target.value})} />
                </div>
                <div className="ud-form-group">
                  <label>Issue Type</label>
                  <select className="ud-select-full" value={feedback.issueType} onChange={(e) => setFeedback({...feedback, issueType: e.target.value})}>
                    <option>None</option>
                    <option>Smelly</option>
                    <option>Broken Sensor</option>
                    <option>Overflowing</option>
                  </select>
                </div>
              </div>
              <div className="ud-form-group">
                <label>Comment</label>
                <textarea rows={2} placeholder="Share your experience..." className="ud-textarea" value={feedback.comment} onChange={(e) => setFeedback({...feedback, comment: e.target.value})} />
              </div>
              <button type="submit" className="ud-submit-btn ud-submit-green">Submit Feedback</button>
            </form>
          </div>
        )}

        {activeTab === 'complaint' && (
          <div className="ud-panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h3 className="ud-panel-title" style={{ marginBottom: '1.5rem' }}><AlertTriangle size={18} color="#ef4444" /> Report Public Dustbin Issue</h3>
            <form onSubmit={handleComplaintSubmit}>
              <div className="ud-grid-2">
                <div className="ud-form-group">
                  <label>Name</label>
                  <input type="text" value={user?.name || ''} readOnly className="ud-input" />
                </div>
                <div className="ud-form-group">
                  <label>Location</label>
                  <input type="text" required placeholder="Street or GPS" className="ud-input" value={complaint.location} onChange={(e) => setComplaint({...complaint, location: e.target.value})} />
                </div>
              </div>
              <div className="ud-grid-2">
                <div className="ud-form-group">
                  <label>Issue Type</label>
                  <select className="ud-select-full" value={complaint.issueType} onChange={(e) => setComplaint({...complaint, issueType: e.target.value})}>
                    <option>Overflowing</option>
                    <option>Damaged Bin</option>
                    <option>Missing Bin</option>
                    <option>Hazardous Material</option>
                  </select>
                </div>
                <div className="ud-form-group">
                  <label>Upload Image <span style={{ textTransform: 'lowercase', fontWeight: 400 }}>(optional)</span></label>
                  <input type="file" accept="image/*" className="ud-input" style={{ padding: '0.5rem' }} onChange={(e) => setComplaint({...complaint, image: e.target.files[0]})} />
                </div>
              </div>
              <div className="ud-form-group">
                <label>Description</label>
                <textarea rows={2} required placeholder="Describe the issue in detail..." className="ud-textarea" value={complaint.description} onChange={(e) => setComplaint({...complaint, description: e.target.value})} />
              </div>
              <button type="submit" className="ud-submit-btn ud-submit-dark">Submit Complaint to Municipality</button>
            </form>
          </div>
        )}

      </main>
      </div>
    </div>
  );
}
