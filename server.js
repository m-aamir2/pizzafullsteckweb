const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { startLowStockCron } = require('./jobs/lowStockCron');
const app = require('./app');
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true } });

// Users join a private room keyed by their own id so order-status events reach only them.
io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    if (userId) socket.join(`user:${userId}`);
  });
});

app.set('io', io);

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startLowStockCron();
  });
};

if (require.main === module) start();

module.exports = { app, server, io };
