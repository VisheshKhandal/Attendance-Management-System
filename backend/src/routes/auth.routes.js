import express from 'express';
import { register, login, logout, getCurrentUser } from '../controllers/auth.controller.js';
import verifyJWT from '../middleware/verifyJWT.js';

const router = express.Router();

// POST /api/auth/register — create user + save refresh token in DB
router.post('/register', register);
// POST /api/auth/login — access + refresh tokens in httpOnly cookies
router.post('/login', login);
// POST /api/auth/logout — verifyJWT → clear refresh token in DB + cookies
router.post('/logout', verifyJWT, logout);
// GET /api/auth/current-user — verifyJWT → req.user (protected test route)
router.get('/current-user', verifyJWT, getCurrentUser);

export default router;
