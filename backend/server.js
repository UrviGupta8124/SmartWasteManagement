require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/device');
const dashboardRoutes = require('./routes/dashboard');
const feedbackRoutes = require('./routes/feedback');
const complaintRoutes = require('./routes/complaint');
const rewardRoutes = require('./routes/reward');

const app = express();
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.set('io', io); // allow controllers to use io

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/complaint', complaintRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/uploads', express.static('uploads'));

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Socket.IO Connection
io.on('connection', (socket) => {
  console.log('Client connected to Socket.IO:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5005;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
