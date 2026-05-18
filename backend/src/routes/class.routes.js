import express from 'express';
import { createClass, getMyClasses, deleteClass } from '../controllers/class.controller.js';
import verifyJWT from '../middleware/verifyJWT.js';

const router = express.Router();

router.use(verifyJWT);

// POST /api/classes/create
router.post('/create', createClass);
// GET /api/classes
router.get('/', getMyClasses);
// DELETE /api/classes/:id
router.delete('/:id', deleteClass);

export default router;
