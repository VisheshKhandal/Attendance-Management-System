import express from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller.js';
import verifyJWT from '../middleware/verifyJWT.js';

const router = express.Router();

router.use(verifyJWT);
router.get('/stats', getDashboardStats);

export default router;
