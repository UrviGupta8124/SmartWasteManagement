import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from '../api/axios';
import { Droplet, Fan, LogOut, Activity, Power, Loader } from 'lucide-react';
import Particles from '../components/Particles';
import MunicipalDashboard from '../components/MunicipalDashboard';
import UserDashboard from '../components/UserDashboard';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout, updateDeviceState } = useContext(AuthContext);
  
  // Use local state for immediate interaction, sync to context/DB on success
  const [deviceState, setLocalDeviceState] = useState(user?.deviceState || { led: 'OFF', fanSpeed: 0 });
  const [isUpdating, setIsUpdating] = useState(false);

  if (user?.role === 'municipality') {
    return <MunicipalDashboard />;
  }

  return <UserDashboard />;
};

export default Dashboard;
