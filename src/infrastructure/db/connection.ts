import mongoose from "mongoose";
import { env } from "../../config/env";

export async function connect(): Promise<typeof mongoose> {
  mongoose.set("strictQuery", true);
  return mongoose.connect(env.MONGODB_URI);
}

export async function disconnect(): Promise<void> {
  await mongoose.disconnect();
}

export { mongoose };
