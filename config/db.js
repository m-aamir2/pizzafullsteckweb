const mongoose = require('mongoose');

let connectionPromise;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set in environment variables');

  if (mongoose.connection.readyState === 1) return mongoose.connection;

  // A warm Vercel function reuses this promise/connection. On a failed cold
  // start, clear it so the next invocation can retry rather than stay broken.
  if (!connectionPromise) {
    mongoose.set('strictQuery', true);
    connectionPromise = mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })
      .then((conn) => {
        console.log(`MongoDB connected: ${conn.connection.host}`);
        return conn.connection;
      })
      .catch((err) => {
        connectionPromise = null;
        throw err;
      });
  }

  return connectionPromise;
};

module.exports = connectDB;
