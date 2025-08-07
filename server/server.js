import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';

import { configureSocket } from './socket/socket.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import messageRoutes from './routes/messageRoutes.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  }
});
const JWT_SECRET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopkqrstuvwxyz1234567890';


// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(cookieParser());



const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB successfully');
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });


app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/messages", messageRoutes);

configureSocket(io);


// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
