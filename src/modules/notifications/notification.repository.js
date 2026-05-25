'use strict';

const Notification = require('./notification.model');

class NotificationRepository {
  async create(data) {
    const notification = new Notification(data);
    await notification.save();
    return notification.toObject();
  }

  async list({ page = 1, limit = 50, filter = null }) {
    const query = filter ? { type: filter } : {};
    
    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
    ]);

    return { notifications, total };
  }

  async markAsRead(id) {
    const notification = await Notification.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    ).lean();
    return notification;
  }

  async markAllAsRead() {
    await Notification.updateMany({ read: false }, { read: true });
    return true;
  }

  async getUnreadCount() {
    return Notification.countDocuments({ read: false });
  }
}

module.exports = new NotificationRepository();
