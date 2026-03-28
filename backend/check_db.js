require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartwater');
    console.log('Successfully connected to MongoDB.');
    console.log('--- Database Contents ---');
    
    const users = await User.find({}, '-password'); // Exclude password hash for safety
    
    if (users.length === 0) {
      console.log('No users found in the database yet.');
    } else {
      console.log(`Found ${users.length} user(s):`);
      console.log(JSON.stringify(users, null, 2));
    }
    
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
  } finally {
    mongoose.connection.close();
  }
}

checkDB();
