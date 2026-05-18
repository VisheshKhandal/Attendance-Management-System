import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import apiRoutes from './routes/index.js';

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/test', (req, res) => {
  res.json({
    ok: true,
    message: 'Student Attendance Tracker API is running',
  });
});
// Route Mounting - All the routes are mounted here like /api/auth, /api/users, /api/courses, etc.
app.use('/api', apiRoutes);

app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: err.errors || [],
  });
});

export default app;
