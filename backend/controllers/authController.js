const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'dummy');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.signup = async (req, res) => {
  try {
    const { name, email, password, role = 'user', binId, employeeId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password' });
    }

    if (role === 'user' && !binId) {
      return res.status(400).json({ message: 'Please provide a Bin ID for user registration' });
    }

    if (role === 'municipality' && !employeeId) {
      return res.status(400).json({ message: 'Please provide an Employee ID for municipality registration' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    if (role === 'user') {
      const existingBinId = await User.findOne({ binId });
      if (existingBinId) {
        return res.status(400).json({ message: 'This Bin ID is already registered' });
      }
    } else if (role === 'municipality') {
      const existingEmployee = await User.findOne({ employeeId });
      if (existingEmployee) {
        return res.status(400).json({ message: 'This Employee ID is already registered' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      ...(role === 'user' && { binId }),
      ...(role === 'municipality' && { employeeId })
    });

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        ...(user.role === 'user' && { binId: user.binId }),
        ...(user.role === 'municipality' && { employeeId: user.employeeId }),
        email: user.email,
        deviceState: user.deviceState
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server server error during signup' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        ...(user.role === 'user' && { binId: user.binId }),
        ...(user.role === 'municipality' && { employeeId: user.employeeId }),
        email: user.email,
        deviceState: user.deviceState
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

exports.google = async (req, res) => {
  try {
    const { token, role = 'user' } = req.body;
    
    // In demo mode or actual verification
    let email, name;
    
    if (!process.env.GOOGLE_CLIENT_ID) {
      // Demo mock server logic if client ID is missing
      email = 'demo_judge@google.com';
      name = 'Demo Judge';
    } else {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name;
    }

    let user = await User.findOne({ email });

    if (!user) {
      // Auto register
      user = await User.create({
        name,
        email,
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10), // Random placeholder
        role,
        ...(role === 'user' && { binId: `google_${Date.now()}` }),
        ...(role === 'municipality' && { employeeId: `google_emp_${Date.now()}` })
      });
    }

    const authToken = generateToken(user._id);

    res.status(200).json({
      token: authToken,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        ...(user.role === 'user' && { binId: user.binId }),
        ...(user.role === 'municipality' && { employeeId: user.employeeId }),
        email: user.email,
        deviceState: user.deviceState
      }
    });

  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ message: 'Failed to authenticate with Google' });
  }
};
