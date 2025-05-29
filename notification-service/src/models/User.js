const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  profession: {
    type: String,
    enum: ['Architect', 'Interior Designer', 'Landscape Architect', 'Urban Planner', 'Other'],
    default: 'Other'
  },
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  notificationPreferences: {
    email: {
      type: Boolean,
      default: true
    },
    push: {
      type: Boolean,
      default: true
    },
    followActivity: {
      type: Boolean,
      default: true
    },
    contentActivity: {
      type: Boolean,
      default: true
    },
    digestFrequency: {
      type: String,
      enum: ['immediate', 'daily', 'weekly', 'never'],
      default: 'immediate'
    }
  }
}, { timestamps: true });

// Note: This is a simplified version of the User model for the notification service.
// It shares the same collection with the API service but only includes fields needed for notifications.
module.exports = mongoose.model('User', UserSchema); 