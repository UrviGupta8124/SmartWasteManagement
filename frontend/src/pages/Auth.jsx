import { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import axios from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { Leaf, Mail, Lock, User, Hash, Eye, EyeOff, AlertCircle, CheckCircle, Building2, ArrowLeft } from 'lucide-react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import Particles from '../components/Particles';
import './Auth.css';


// Google SVG Icon Component
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);



const Auth = ({ initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [binId, setBinId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState(null);
  
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }
  const [isLoading, setIsLoading] = useState(false);

  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Virtual Google Login for missing Client ID edge case during Hackathon demos
  const handleGoogleDemo = () => {
    setIsLoading(true);
    setTimeout(() => {
      showToast('Simulated Google Login for Demo 🌿', 'success');
      setTimeout(() => {
        login({ 
          id: 'demo_google_888',
          name: 'Demo Judge', 
          email: 'judge@google.com', 
          role: selectedRole || 'user',
          binId: 'DEMO-888',
          deviceState: { led: 'OFF', fanSpeed: 0 }
        }, 'demo_token_123');
        navigate('/dashboard');
      }, 1000);
    }, 1500);
  };

  const executeRealGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);
        const res = await axios.post('/auth/google', { 
          token: tokenResponse.access_token, 
          role: selectedRole || 'user' 
        });
        showToast('Google login successful! 🌿', 'success');
        setTimeout(() => {
          login(res.data.user, res.data.token);
          navigate('/dashboard');
        }, 1000);
      } catch (err) {
        showToast('Google Auth failed. Try standard login.');
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => showToast('Google login was closed.')
  });

  const handleGoogleClick = () => {
    if (import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      executeRealGoogleLogin();
    } else {
      handleGoogleDemo();
    }
  };

  // Sync mode with route if needed, though they might be same route
  useEffect(() => {
    if (location.pathname === '/signup' && mode !== 'signup') setMode('signup');
    if (location.pathname === '/login' && mode !== 'login') setMode('login');
  }, [location.pathname]);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleToggleMode = (newMode) => {
    setMode(newMode);
    setToast(null);
    // Optionally navigate to keep URL in sync
    navigate(`/${newMode}`, { replace: true });
  };

  const getEcoErrorMessage = (errMessage) => {
    const msg = errMessage.toLowerCase();
    if (msg.includes('email')) return 'Oops! This email seems lost in the forest 🌿';
    if (msg.includes('password') && mode === 'login') return 'The key to the forest is incorrect. Try again 🍃';
    if (msg.includes('match')) return 'Your passwords don\'t match. Let\'s align them like trees in a row 🌲';
    if (msg.includes('exist')) return 'This account is already planted in our system! Try logging in instead 🌳';
    if (msg.includes('network')) return 'Our roots couldn\'t reach the server. Please try again 🌱';
    return errMessage;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setToast(null);

    if (mode === 'signup' && password !== confirmPassword) {
      return showToast(getEcoErrorMessage('Passwords do not match'));
    }

    setIsLoading(true);

    try {
      if (mode === 'login') {
        const response = await axios.post('/auth/login', { email, password });
        showToast(`Login successful! Welcome back ${selectedRole === 'municipality' ? 'Municipality' : 'User'} 🌿`, 'success');
        // Small delay to show success toast before redirect
        setTimeout(() => {
          login(response.data.user, response.data.token);
          navigate('/dashboard');
        }, 1000);
      } else {
        const payload = { name, email, password, role: selectedRole };
        if (selectedRole === 'user') payload.binId = binId;
        if (selectedRole === 'municipality') payload.employeeId = employeeId;
        
        const response = await axios.post('/auth/signup', payload);
        showToast('Account created! Joining the movement 🌍', 'success');
        setTimeout(() => {
          login(response.data.user, response.data.token);
          navigate('/dashboard');
        }, 1000);
      }
    } catch (err) {
      const serverError = err.response?.data?.message || 'Network error: Could not reach the server.';
      showToast(getEcoErrorMessage(serverError));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {toast && (
        <div className="toast-container">
          <div className={`auth-toast ${toast.type}`}>
            {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <Particles />
      
      <div className="auth-glass-card">
        {!selectedRole ? (
          <div className="role-selection-view">
            <div className="auth-header-wrapper">
              <h1>Welcome to Ecotect</h1>
              <p className="auth-tagline">Pioneering Smart Waste Management</p>
            </div>
            
            <div className="role-options-grid">
              <div className="role-option" onClick={() => setSelectedRole('user')}>
                <div className="role-icon-wrapper">
                  <User size={28} />
                </div>
                <div className="role-text">
                  <h3>Resident User</h3>
                  <p>Access your personal smart dustbin</p>
                </div>
              </div>

              <div className="role-option" onClick={() => setSelectedRole('municipality')}>
                <div className="role-icon-wrapper">
                  <Building2 size={28} />
                </div>
                <div className="role-text">
                  <h3>Municipality</h3>
                  <p>Manage city-wide waste infrastructure</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <button className="back-to-roles" onClick={() => setSelectedRole(null)} type="button">
              <ArrowLeft size={16} /> Back to roles
            </button>

            <div className="auth-header-wrapper">
              <h1>{mode === 'signup' ? "Join Ecotect" : "Access Ecotect"}</h1>
              <p className="auth-tagline">
                {mode === 'signup' 
                  ? `Register as a ${selectedRole === 'user' ? 'Resident' : 'Municipality'}`
                  : `Sign in to your ${selectedRole === 'user' ? 'Resident' : 'Municipality'} Account`}
              </p>
            </div>

        <div className="auth-tab-dial-container" data-mode={mode}>
          <div className="auth-tab-slider"></div>
          <button 
            type="button"
            className="auth-tab" 
            data-active={mode === 'login'} 
            onClick={() => handleToggleMode('login')}
          >
            Login
          </button>
          <button 
            type="button"
            className="auth-tab" 
            data-active={mode === 'signup'} 
            onClick={() => handleToggleMode('signup')}
          >
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} key={mode}>
          
          {mode === 'signup' && (
            <>
              <div className="input-group">
                <input
                  id="name"
                  type="text"
                  className="floating-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder=" "
                  required
                />
                <label htmlFor="name" className="floating-label">
                  {selectedRole === 'municipality' ? 'Municipality Name' : 'Full Name'}
                </label>
                <div className="input-icon">
                  {selectedRole === 'municipality' ? <Building2 size={18} /> : <User size={18} />}
                </div>
              </div>

              {selectedRole === 'user' ? (
                <div className="input-group">
                  <input
                    id="binId"
                    type="text"
                    className="floating-input"
                    value={binId}
                    onChange={(e) => setBinId(e.target.value)}
                    placeholder=" "
                    required
                  />
                  <label htmlFor="binId" className="floating-label">Assigned Bin ID</label>
                  <div className="input-icon">
                    <Hash size={18} />
                  </div>
                </div>
              ) : (
                <div className="input-group">
                  <input
                    id="employeeId"
                    type="text"
                    className="floating-input"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder=" "
                    required
                  />
                  <label htmlFor="employeeId" className="floating-label">Employee ID</label>
                  <div className="input-icon">
                    <Hash size={18} />
                  </div>
                </div>
              )}
            </>
          )}

          <div className="input-group">
            <input
              id="email"
              type="email"
              className="floating-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=" "
              required
            />
            <label htmlFor="email" className="floating-label">Email Address</label>
            <div className="input-icon">
              <Mail size={18} />
            </div>
          </div>

          <div className="input-group">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="floating-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" "
              required
            />
            <label htmlFor="password" className="floating-label">Password</label>
            <div className="input-icon">
              <Lock size={18} />
            </div>
            <button 
              type="button"
              className="password-toggle" 
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {mode === 'signup' && (
            <div className="input-group">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                className="floating-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder=" "
                required
              />
              <label htmlFor="confirmPassword" className="floating-label">Confirm Password</label>
              <div className="input-icon">
                <Lock size={18} />
              </div>
              <button 
                type="button"
                className="password-toggle" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? <div className="spinner" /> : <Leaf size={18} />}
            {isLoading 
              ? (mode === 'login' ? 'Signing in...' : 'Creating Account...') 
              : (mode === 'login' ? 'Sign In' : 'Sign Up')}
          </button>

            <div className="social-login-container">
              <button type="button" className="social-btn" onClick={handleGoogleClick} disabled={isLoading}>
                <GoogleIcon />
                Sign in with Google
              </button>
            </div>
          </form>
          </>
        )}
      </div>
    </div>
  );
};

const AuthWithGoogle = (props) => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'demo-client-id.apps.googleusercontent.com';
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <Auth {...props} />
    </GoogleOAuthProvider>
  );
};

export default AuthWithGoogle;
