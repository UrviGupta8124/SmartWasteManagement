import { createContext, useState, useEffect } from 'react';
import axios from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
        try {
          const res = await axios.get('/device');
          const updatedUser = { ...JSON.parse(storedUser), deviceState: res.data.deviceState };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (err) {
          console.error('Session sync error:', err);
          if (err.response && err.response.status === 401) {
            logout();
          }
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const updateDeviceState = (deviceState) => {
    setUser(prev => {
      const updatedUser = { ...prev, deviceState };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateDeviceState, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
