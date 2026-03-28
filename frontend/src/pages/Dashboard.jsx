import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from '../api/axios';
import { Droplet, Fan, LogOut, Activity } from 'lucide-react';

const Dashboard = () => {
  const { user, logout, updateDeviceState } = useContext(AuthContext);
  
  // Use local state for immediate interaction, sync to context/DB on success
  const [deviceState, setLocalDeviceState] = useState(user?.deviceState || { led: 'OFF', fanSpeed: 0 });
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleLED = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    
    const newLedState = deviceState.led === 'ON' ? 'OFF' : 'ON';
    
    try {
      const res = await axios.post('/device', { led: newLedState });
      setLocalDeviceState(res.data.deviceState);
      updateDeviceState(res.data.deviceState);
    } catch (err) {
      console.error('Failed to update LED', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFanChange = (e) => {
    setLocalDeviceState({ ...deviceState, fanSpeed: parseInt(e.target.value) });
  };

  const handleApplyFanSpeed = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    
    try {
      const res = await axios.post('/device', { fanSpeed: deviceState.fanSpeed });
      setLocalDeviceState(res.data.deviceState);
      updateDeviceState(res.data.deviceState);
    } catch (err) {
      console.error('Failed to update Fan', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1>Smart Water Management</h1>
          <p>Welcome back, {user?.name} | Bin ID: {user?.binId}</p>
        </div>
        <button onClick={logout} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LogOut size={16} /> Logout
        </button>
      </div>

      <div className="device-grid">
        {/* LED Control Card */}
        <div className="device-card">
          <h3><Activity size={20} color="#3b82f6" /> Primary Valve (LED Status)</h3>
          
          <div style={{ flex: 1 }}>
            <div className={`status-badge ${deviceState.led === 'ON' ? 'on' : 'off'}`}>
              STATUS: {deviceState.led}
            </div>
          </div>
          
          <button 
            className={`toggle-btn ${deviceState.led === 'ON' ? 'on' : 'off'}`}
            onClick={handleToggleLED}
            disabled={isUpdating}
          >
            {deviceState.led === 'ON' ? 'Turn OFF Valve' : 'Turn ON Valve'}
          </button>
        </div>

        {/* Fan Speed / Flow Rate Control Card */}
        <div className="device-card">
          <h3><Droplet size={20} color="#3b82f6" /> Water Flow Rate (Pump)</h3>
          
          <div style={{ flex: 1 }}>
            <div className="value">{deviceState.fanSpeed}%</div>
            
            <div className="slider-container">
              <span style={{color: 'var(--text-muted)'}}>0</span>
              <input 
                type="range" 
                min="0" 
                max="100" 
                className="range-slider"
                value={deviceState.fanSpeed}
                onChange={handleFanChange}
              />
              <span style={{color: 'var(--text-muted)'}}>100</span>
            </div>
          </div>
          
          <button 
            className="update-btn"
            onClick={handleApplyFanSpeed}
            disabled={isUpdating || deviceState.fanSpeed === user?.deviceState?.fanSpeed}
          >
            Apply Flow Rate
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
