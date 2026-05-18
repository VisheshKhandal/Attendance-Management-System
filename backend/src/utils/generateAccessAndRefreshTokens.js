import User from '../models/user.js';
import { signAccessToken, signRefreshToken } from './jwt.js';

/**
 * Step 5 of login/register: create tokens, save refresh token in database.
 */
async function generateAccessAndRefreshTokens(userId) {
  const user = await User.findById(userId);

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
}

export default generateAccessAndRefreshTokens;
