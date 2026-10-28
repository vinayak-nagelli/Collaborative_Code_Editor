import mongoose from "mongoose";

mongoose.set("strictQuery", true);

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI is not defined in the environment");
  }

  mongoose.connection.on("connected", () => {
    console.log("[mongo] connected");
  });

  mongoose.connection.on("error", (err) => {
    console.error("[mongo] connection error:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[mongo] disconnected");
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  return mongoose.connection;
};

export default connectDB;
