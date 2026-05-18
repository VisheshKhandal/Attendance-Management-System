import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/** Same options for set cookie and clear cookie (like your tutorial code). */
export const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
};

export function signAccessToken(userId) {
  return jwt.sign({ userId: userId.toString() }, env.accessTokenSecret, {
    expiresIn: env.accessTokenExpiresIn,
  });
}

export function signRefreshToken(userId) {
  return jwt.sign({ userId: userId.toString() }, env.refreshTokenSecret, {
    expiresIn: env.refreshTokenExpiresIn,
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.accessTokenSecret);
}
