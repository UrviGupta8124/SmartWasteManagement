require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  await User.deleteMany({});
  console.log('Database Users cleared!');
  process.exit();
}).catch(console.error);
