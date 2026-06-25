const { getMessaging } = require('../config/firebase');
const Notification     = require('../models/Notification');
const User             = require('../models/user');
const logger           = require('../utils/logger');

/**
 * Persist a notification record and optionally send FCM push.
 */
const sendNotification = async ({ recipientId, title, body, type = 'general', metadata = {} }) => {
  try {
    const notification = await Notification.create({ recipient: recipientId, title, body, type, metadata });

    const user = await User.findById(recipientId).select('fcmToken');
    if (user?.fcmToken) {
      const messaging = getMessaging();
      if (messaging) {
        await messaging.send({
          token: user.fcmToken,
          notification: { title, body },
          data: { type, notificationId: notification._id.toString(), ...flattenMetadata(metadata) },
        });
      }
    }

    return notification;
  } catch (err) {
    logger.error('sendNotification failed', { recipientId, error: err.message });
  }
};

/**
 * Send the same notification to multiple recipients.
 */
const broadcastNotification = async (recipientIds, payload) => {
  return Promise.allSettled(recipientIds.map((id) => sendNotification({ recipientId: id, ...payload })));
};

const flattenMetadata = (meta = {}) =>
  Object.fromEntries(Object.entries(meta).map(([k, v]) => [k, String(v)]));

module.exports = { sendNotification, broadcastNotification };
