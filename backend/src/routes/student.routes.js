import express from 'express';
import {
  addStudent,
  getStudentsByClass,
  updateStudent,
  deleteStudent,
} from '../controllers/student.controller.js';
import verifyJWT from '../middleware/verifyJWT.js';

const router = express.Router();

router.use(verifyJWT);

// POST /api/students
router.post('/', addStudent);
// GET /api/students/class/:classId
router.get('/class/:classId', getStudentsByClass);
// PUT /api/students/:id
router.put('/:id', updateStudent);
// DELETE /api/students/:id
router.delete('/:id', deleteStudent);

export default router;
