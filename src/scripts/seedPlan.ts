
import mongoose from "mongoose";
import { Plan } from "../models/subscription.model";
import { ENV } from "../constants";


const commonFeatures = [
  "Analytics",
  "Leads",
  "Visitor Tracking",
  "Chatbot",
  "Web Forms",
  "And many more",
];

const dummyPlans = [
  {
    name: "free",
    price: 0,
    durationDays: 30,
    maxAccounts: 1,
    maxChatbots: 1,
    maxWebforms: 1,
    features: ["Limited Dashboard Features"],
  },
  {
    name: "silver",
    price: 7000,
    durationDays: 30,
    maxAccounts: 1,
    maxChatbots: 3,
    maxWebforms: 3,
    features: [...commonFeatures],
  },
  {
    name: "gold",
    price: 14000,
    durationDays: 30,
    maxAccounts: 2,
    maxChatbots: 5,
    maxWebforms: 5,
    features: [...commonFeatures],
  },
  {
    name: "platinum",
    price: 20000,
    durationDays: 30,
    maxAccounts: 3,
    maxChatbots: 10,
    maxWebforms: 10,
    features: [...commonFeatures],
  },
  {
    name: "payg",
    price: 7000,
    durationDays: 30,
    maxAccounts: 1,
    maxChatbots: 0, // controlled by credits
    maxWebforms: 0, // controlled by credits
    features: [...commonFeatures],
  },
];

export const seedPlans = async () => {
  try {
    await mongoose.connect(ENV.DATABASE_URL);
    console.log("✅ MongoDB connected");

    for (const plan of dummyPlans) {
      await Plan.findOneAndUpdate(
        { name: plan.name },
        plan,
        { upsert: true, new: true }
      );
    }

    console.log("✅ Plans seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed", error);
    process.exit(1);
  }
};


