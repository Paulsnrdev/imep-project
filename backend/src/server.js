const express          = require('express');
const cors             = require('cors');
const cookieParser     = require('cookie-parser');
require('dotenv').config();

const connectDB          = require('./config/db');
const { initFirebase }   = require('./config/firebase');
const registerCronJobs   = require('./config/cron');
const userRoutes         = require('./routes/userRoutes');
const authRoutes         = require('./routes/auth.routes');
const studentRoutes      = require('./routes/student.routes');
const logbookRoutes      = require('./routes/logbook.routes');
const attendanceRoutes   = require('./routes/attendance.routes');
const industryRoutes     = require('./routes/industrySupervisor.routes');
const institutionRoutes  = require('./routes/institutionSupervisor.routes');
const messagingRoutes    = require('./routes/messaging.routes');
const searchRoutes       = require('./routes/search.routes');
const meRoutes           = require('./routes/me.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes        = require('./routes/admin.routes');

const app = express();

// Connect to Database then start cron jobs
connectDB().then(async () => {
  initFirebase();
  await registerCronJobs();
});

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/auth',        authRoutes);
app.use('/api/student',     studentRoutes);
app.use('/api/logbook',     logbookRoutes);
app.use('/api/attendance',  attendanceRoutes);
app.use('/api/industry',    industryRoutes);
app.use('/api/institution', institutionRoutes);
app.use('/api/messages',    messagingRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/search',      searchRoutes);
app.use('/api/me',            meRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin',       adminRoutes);

// Base Test Route
app.get('/', (req, res) => {
  res.json({ message: 'IMEP API is active and running!' });
});

// Centralized Error Handler (Add your error middleware here)
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : null
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 SERVER IS ACTIVE AND RUNNING ON PORT ${PORT}`);
});