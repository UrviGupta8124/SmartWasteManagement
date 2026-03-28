require('dotenv').config();
const mongoose = require('mongoose');
const Reward = require('./models/Reward');

const seedRewards = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Reward.deleteMany({});
    
    const rewards = [
      {
        title: "₹50 Grocery Voucher",
        description: "Valid at all FreshMart locations. Single use.",
        pointsCost: 500,
        status: "active",
        expiryText: "Ends in 5 days",
        iconType: "Leaf"
      },
      {
        title: "Metro Day Pass",
        description: "Unlimited rides for 24 hours on city green lines.",
        pointsCost: 800,
        status: "active",
        expiryText: "Valid anytime",
        iconType: "Ticket"
      },
      {
        title: "1 Month Bus Pass",
        description: "Free commute on all electric buses.",
        pointsCost: 2500,
        status: "active",
        expiryText: "Ends in 12 days",
        iconType: "Ticket"
      },
      {
        title: "Sapling Kit (3 plants)",
        description: "Grow your own indoor air purifiers.",
        pointsCost: 1200,
        status: "active",
        expiryText: "Seasonal item",
        iconType: "Leaf"
      },
      {
        title: "₹100 Electricity Credit",
        description: "Direct deduction from your green provider.",
        pointsCost: 1500,
        status: "out_of_stock",
        expiryText: "Restocking soon",
        iconType: "Gift"
      },
      {
        title: "₹200 Zomato Credit",
        description: "For eco-friendly delivery restaurants.",
        pointsCost: 2000,
        status: "active",
        expiryText: "Ends in 2 days",
        iconType: "Gift"
      }
    ];

    await Reward.insertMany(rewards);
    console.log("Rewards successfully seeded!");
    process.exit();
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seedRewards();
