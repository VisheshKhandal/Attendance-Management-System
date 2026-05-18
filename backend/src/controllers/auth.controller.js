import User from '../models/user.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import generateAccessAndRefreshTokens from '../utils/generateAccessAndRefreshTokens.js';
import { cookieOptions } from '../utils/jwt.js';
import { appendAccountEvent, parseClientMeta } from '../utils/accountEvents.js';

/**
 * Registration steps:
 * 1. Get user details from frontend
 * 2. Validation — not empty
 * 3. Check if user already exists (username or email)
 * 4. Create user in database
 * 5. Generate access + refresh tokens (auto login — no second login step)
 * 6. Send tokens in cookies
 * 7. Remove password and refreshToken from response
 * 8. Return result
 */
const register = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if ([username, email, password].some((field) => field?.trim() === '')) {
    throw new ApiError(400, 'All fields are required');
  }

  const existingUser = await User.findOne({
    $or: [{ email: email.trim().toLowerCase() }, { username: username.trim() }],
  });

  if (existingUser) {
    throw new ApiError(409, 'User with this email or username already exists');
  }

  const user = await User.create({
    fullName: username.trim(),
    username: username.trim().toLowerCase(),
    email: email.trim().toLowerCase(),
    password,
  });

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
  const createdUser = await User.findById(user._id).select('-password -refreshToken');

  if (!createdUser) {
    throw new ApiError(500, 'Something went wrong while registering the user');
  }

  return res
    .status(200)
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json(
      new ApiResponse(201, { user: createdUser, accessToken }, 'User registered successfully')
    );
});

/**
 * Login steps:
 * 1. Get data from req.body
 * 2. Check username or email is sent
 * 3. Find user
 * 4. Password check
 * 5. Generate access + refresh tokens
 * 6. Send tokens in cookies + response (without password / refreshToken)
 */
const login = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username && !email) {
    throw new ApiError(400, 'Username or email is required');
  }

  if (!password) {
    throw new ApiError(400, 'Password is required');
  }

  const orConditions = [];
  if (email) orConditions.push({ email: email.trim().toLowerCase() });
  if (username) orConditions.push({ username: username.trim().toLowerCase() });

  const user = await User.findOne({ $or: orConditions }).select('+password');

  if (!user) {
    throw new ApiError(404, 'User not found with this email or username');
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid user credentials');
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

  const loginMeta = parseClientMeta(req.headers['user-agent']);
  await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });
  await appendAccountEvent(user._id, {
    type: 'login',
    description: 'Login successful',
    meta: loginMeta,
  });

  const loggedInUser = await User.findById(user._id).select('-password -refreshToken');

  return res
    .status(200)
    .cookie('accessToken', accessToken, cookieOptions)
    .cookie('refreshToken', refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken },
        'User logged in successfully'
      )
    );
});

/**
 * Logout steps:
 * 1. User comes from verifyJWT → req.user
 * 2. Remove refresh token from database
 * 3. Clear cookies
 */
const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
});

/**
 * Protected route test: user is set by verifyJWT → req.user
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, 'Current user fetched successfully'));
});

export { register, login, logout, getCurrentUser };
