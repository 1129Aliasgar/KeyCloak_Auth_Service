import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Morgan logger - shows which endpoint is hit and errors
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  // Morgan will log the error
  morgan('dev')(req, res, () => {});
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URL)
  .then(() => {
    // Start server after DB connection
    app.listen(PORT, () => {
      // Server started successfully
    });
  })
  .catch((error) => {
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  mongoose.connection.close(() => {
    process.exit(0);
  });
});

export default app;

