import express from 'express';
import {
  getProfile,
  updateProfile,
  getProfileActivity,
  getSecurity,
  updateTwoFactor,
  changePassword,
  logoutAllDevices,
} from '../controllers/profile.controller.js';
import verifyJWT from '../middleware/verifyJWT.js';

const router = express.Router();

router.use(verifyJWT);

router.get('/', getProfile);
router.get('/activity', getProfileActivity);
router.get('/security', getSecurity);
router.put('/two-factor', updateTwoFactor);
router.put('/', updateProfile);
router.put('/password', changePassword);
router.post('/logout-all', logoutAllDevices);

export default router;
