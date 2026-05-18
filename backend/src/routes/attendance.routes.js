import express from 'express';
import {
  markAttendance,
  getAttendanceByStudent,
  getAttendancePercentage,
  getAttendanceByClass,
} from '../controllers/attendance.controller.js';
import verifyJWT from '../middleware/verifyJWT.js';

const router = express.Router();

router.use(verifyJWT);

// POST /api/attendance/mark
router.post('/mark', markAttendance);
// GET /api/attendance/student/:id/percentage
router.get('/student/:id/percentage', getAttendancePercentage);
// GET /api/attendance/student/:id
router.get('/student/:id', getAttendanceByStudent);
// GET /api/attendance/class/:classId
router.get('/class/:classId', getAttendanceByClass);

export default router;
