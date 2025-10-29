import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  tokens: {
    type: Number,
    default: 100,
    min: 0,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  totalCallsMade: {
    type: Number,
    default: 0,
  },
  subscription: {
    tier: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'canceled', 'expired'],
      default: 'active',
    },
    startDate: Date,
    endDate: Date,
  },
  dailyUsage: {
    date: String,
    callsMade: {
      type: Number,
      default: 0,
    },
    lastResetAt: Date,
  },
}, {
  timestamps: true,
});

// Instance method to deduct tokens
userSchema.methods.deductTokens = function(amount = 5) {
  if (this.tokens >= amount) {
    this.tokens -= amount;
    return true;
  }
  return false;
};

// Instance method to add tokens
userSchema.methods.addTokens = function(amount) {
  this.tokens += amount;
};

// Instance method to check if user has enough tokens for a call
userSchema.methods.hasEnoughTokensForCall = function() {
  return this.tokens >= 5;
};

// Instance method to get cost per call
userSchema.methods.getCostPerCall = function() {
  return 5;
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

const User = mongoose.model('User', userSchema);

export default User; 