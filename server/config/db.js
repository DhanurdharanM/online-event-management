import mongoose from 'mongoose';

export default async function connectDB() {
  mongoose.set('strictQuery', true);
  let uri = process.env.MONGO_URI;
  if (uri === 'memory') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    uri = mem.getUri();
    console.log('Using a temporary in-memory MongoDB (data resets when the server stops)');
  }
  const conn = await mongoose.connect(uri);
  console.log(`MongoDB connected: ${conn.connection.host}`);
}