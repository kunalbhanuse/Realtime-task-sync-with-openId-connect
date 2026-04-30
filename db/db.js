import mongoose from "mongoose";

async function connectDB() {
  try {
    const conn = await mongoose.connect("mongodb://127.0.0.1:27017/checkboxDB");
    console.log("MongoDB connected");
    return conn;
  } catch (error) {
    console.log(error);
  }
}

export { connectDB };
