import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      trim: true,
      maxlength: [80, 'Full name is too long'],
      default: '',
    },

    username: {
      type: String,
      required: [true, 'Username is required'],
      trim: true,
      minlength: [2, 'Username must be at least 2 characters'],
      maxlength: [64, 'Username is too long'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },

    refreshToken: {
      type: String,
      default: null,
      select: false,
    },

    phoneNumber: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number is too long'],
      default: '',
    },

    gender: {
      type: String,
      trim: true,
      default: '',
    },

    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address is too long'],
      default: '',
    },

    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: '',
    },

    profileImage: {
      type: String,
      default: null,
    },

    role: {
      type: String,
      enum: ['Teacher', 'Admin'],
      default: 'Teacher',
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },

    accountEvents: [
      {
        type: {
          type: String,
          enum: ['login', 'password_change', 'profile_update', 'logout_all'],
        },
        description: { type: String, trim: true },
        at: { type: Date, default: Date.now },
        meta: {
          browser: { type: String, default: '' },
          os: { type: String, default: '' },
          device: { type: String, default: '' },
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  this.password = await bcrypt.hash(
    this.password,
    SALT_ROUNDS
  );
});

userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

userSchema.methods.isPasswordCorrect = async function (plainPassword) {
  return this.comparePassword(plainPassword);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

export default User;