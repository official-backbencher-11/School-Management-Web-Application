const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/developers', require('./routes/developerRoutes'));
app.use('/api', require('./routes/apiRoutes'));

// Seed Developer account automatically on startup
const { seedDeveloperAccount } = require('./controllers/developerController');
setTimeout(() => {
  seedDeveloperAccount();
}, 2000);

// Root endpoint status
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy and active' });
});

// Custom 404 Route handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: 'API endpoint not found' });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
