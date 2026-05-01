import mongoose from "mongoose";

async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
    return conn;
  } catch (error) {
    console.log(error);
  }
}

export { connectDB };
