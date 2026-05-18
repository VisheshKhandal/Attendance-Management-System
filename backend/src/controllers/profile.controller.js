import Class from '../models/class.model.js';
import Student from '../models/student.model.js';
import Attendance from '../models/attendance.model.js';
import User from '../models/user.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { appendAccountEvent, parseClientMeta } from '../utils/accountEvents.js';

const getStartOfDay = (date = new Date()) => {
  const normalized = new Date(date);
  normalized.setUTCHours(0, 0, 0, 0);
  return normalized;
};

const getProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const classIds = await Class.find({ createdBy: userId }).distinct('_id');
  const classFilter = classIds.length ? { class: { $in: classIds } } : { class: null };
  const today = getStartOfDay();

  const [user, totalClasses, totalStudents, totalRecords, presentRecords, todayMarked] =
    await Promise.all([
      User.findById(userId).select('-password -refreshToken'),
      Class.countDocuments({ createdBy: userId }),
      classIds.length
        ? Student.countDocuments({ classId: { $in: classIds } })
        : Promise.resolve(0),
      classIds.length ? Attendance.countDocuments(classFilter) : Promise.resolve(0),
      classIds.length
        ? Attendance.countDocuments({ ...classFilter, status: 'Present' })
        : Promise.resolve(0),
      classIds.length
        ? Attendance.countDocuments({ ...classFilter, date: today })
        : Promise.resolve(0),
    ]);

  const attendancePercentage =
    totalRecords === 0 ? 0 : Math.round((presentRecords / totalRecords) * 10000) / 100;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user,
        stats: {
          totalClasses,
          totalStudents,
          totalAttendanceRecords: totalRecords,
          presentRecords,
          attendancePercentage,
          markedToday: todayMarked,
        },
      },
      'Profile fetched successfully'
    )
  );
});

const updateProfile = asyncHandler(async (req, res) => {
  const {
    fullName,
    username,
    email,
    phoneNumber,
    gender,
    address,
    bio,
    profileImage,
  } = req.body;

  const updates = {};

  if (fullName !== undefined) {
    updates.fullName = String(fullName).trim().slice(0, 80);
  }

  if (username !== undefined) {
    const trimmed = String(username).trim();
    if (trimmed.length < 2) {
      throw new ApiError(400, 'Username must be at least 2 characters');
    }
    const normalized = trimmed.toLowerCase();
    const taken = await User.findOne({
      username: normalized,
      _id: { $ne: req.user._id },
    });
    if (taken) {
      throw new ApiError(409, 'Username is already taken');
    }
    updates.username = normalized;
  }

  if (email !== undefined) {
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      throw new ApiError(400, 'Please provide a valid email address');
    }
    const taken = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: req.user._id },
    });
    if (taken) {
      throw new ApiError(409, 'Email is already in use');
    }
    updates.email = normalizedEmail;
  }

  if (phoneNumber !== undefined) {
    updates.phoneNumber = String(phoneNumber).trim().slice(0, 20);
  }

  if (gender !== undefined) {
    const allowed = ['', 'Male', 'Female', 'Other', 'Prefer not to say'];
    const value = String(gender).trim();
    if (!allowed.includes(value)) {
      throw new ApiError(400, 'Invalid gender value');
    }
    updates.gender = value;
  }

  if (address !== undefined) {
    updates.address = String(address).trim().slice(0, 200);
  }

  if (bio !== undefined) {
    updates.bio = String(bio).trim().slice(0, 500);
  }

  if (profileImage !== undefined) {
    if (profileImage === null || profileImage === '') {
      updates.profileImage = null;
    } else if (typeof profileImage === 'string' && profileImage.startsWith('data:image/')) {
      if (profileImage.length > 600_000) {
        throw new ApiError(400, 'Profile image is too large. Try a smaller photo.');
      }
      updates.profileImage = profileImage;
    } else {
      throw new ApiError(400, 'Invalid profile image format');
    }
  }

  if (!Object.keys(updates).length) {
    throw new ApiError(400, 'No valid fields to update');
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  }).select('-password -refreshToken');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const meta = parseClientMeta(req.headers['user-agent']);
  await appendAccountEvent(req.user._id, {
    type: 'profile_update',
    description: 'Profile updated',
    meta,
  });

  return res.status(200).json(
    new ApiResponse(200, { user }, 'Profile updated successfully')
  );
});

const getProfileActivity = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const classIds = await Class.find({ createdBy: userId }).distinct('_id');

  const [recentClasses, recentAttendance, recentStudents] = await Promise.all([
    Class.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .limit(6)
      .select('className section createdAt'),
    Attendance.find({ markedBy: userId })
      .sort({ updatedAt: -1 })
      .limit(8)
      .populate('student', 'name')
      .populate('class', 'className section'),
    classIds.length
      ? Student.find({ classId: { $in: classIds } })
          .sort({ createdAt: -1 })
          .limit(6)
          .select('name createdAt')
      : Promise.resolve([]),
  ]);

  const items = [];

  const accountUser = await User.findById(userId).select('accountEvents');

  recentClasses.forEach((c) => {
    items.push({
      type: 'class',
      category: 'teaching',
      text: `Class created: ${c.className} — ${c.section}`,
      at: c.createdAt,
    });
  });

  recentStudents.forEach((s) => {
    items.push({
      type: 'student',
      category: 'teaching',
      text: `Student added: ${s.name}`,
      at: s.createdAt,
    });
  });

  recentAttendance.forEach((a) => {
    const studentName = a.student?.name || 'Student';
    const classLabel = a.class
      ? `${a.class.className} — ${a.class.section}`
      : 'class';
    items.push({
      type: 'attendance',
      category: 'teaching',
      text: `Marked ${studentName} ${a.status} (${classLabel})`,
      at: a.updatedAt || a.createdAt,
    });
  });

  (accountUser?.accountEvents || []).forEach((e) => {
    items.push({
      type: e.type,
      category: 'account',
      text: e.description,
      at: e.at,
      meta: e.meta,
    });
  });

  items.sort((a, b) => new Date(b.at) - new Date(a.at));

  return res.status(200).json(
    new ApiResponse(200, items.slice(0, 20), 'Profile activity fetched successfully')
  );
});

const getSecurity = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    'lastLoginAt twoFactorEnabled accountEvents'
  );

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const clientMeta = parseClientMeta(req.headers['user-agent']);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        lastLoginAt: user.lastLoginAt,
        twoFactorEnabled: user.twoFactorEnabled,
        currentSession: {
          ...clientMeta,
          lastActive: new Date(),
          isCurrent: true,
        },
        loginHistory: user.accountEvents || [],
      },
      'Security info fetched successfully'
    )
  );
});

const updateTwoFactor = asyncHandler(async (req, res) => {
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    throw new ApiError(400, 'enabled must be a boolean');
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { twoFactorEnabled: enabled },
    { new: true }
  ).select('twoFactorEnabled');

  const meta = parseClientMeta(req.headers['user-agent']);
  await appendAccountEvent(req.user._id, {
    type: 'profile_update',
    description: enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled',
    meta,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { twoFactorEnabled: user.twoFactorEnabled },
      enabled ? '2FA enabled' : '2FA disabled'
    )
  );
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current and new password are required');
  }

  if (String(newPassword).length < 8) {
    throw new ApiError(400, 'New password must be at least 8 characters');
  }

  const user = await User.findById(req.user._id).select('+password');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  const isValid = await user.isPasswordCorrect(currentPassword);

  if (!isValid) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  const meta = parseClientMeta(req.headers['user-agent']);
  await appendAccountEvent(req.user._id, {
    type: 'password_change',
    description: 'Password changed',
    meta,
  });

  return res.status(200).json(new ApiResponse(200, {}, 'Password updated successfully'));
});

const logoutAllDevices = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });

  const meta = parseClientMeta(req.headers['user-agent']);
  await appendAccountEvent(req.user._id, {
    type: 'logout_all',
    description: 'Logged out from all other devices',
    meta,
  });

  return res.status(200).json(
    new ApiResponse(200, {}, 'Logged out from all other devices')
  );
});

export {
  getProfile,
  updateProfile,
  getProfileActivity,
  getSecurity,
  updateTwoFactor,
  changePassword,
  logoutAllDevices,
};
