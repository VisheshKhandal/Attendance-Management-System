import express from 'express';
import authRoutes from './auth.routes.js';
import classRoutes from './class.routes.js';
import studentRoutes from './student.routes.js';
import attendanceRoutes from './attendance.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import profileRoutes from './profile.routes.js';

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'student-attendance-tracker-api' });
});

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/classes', classRoutes);
router.use('/students', studentRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/profile', profileRoutes);

export default router;
