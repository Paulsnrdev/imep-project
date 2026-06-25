const admin = require('firebase-admin');
const logger = require('../utils/logger');

let initialized = false;

const initFirebase = () => {
  if (initialized) return;

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    logger.warn('Firebase credentials missing — push notifications disabled');
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  initialized = true;
  logger.info('Firebase Admin initialized');
};

const getMessaging = () => {
  if (!initialized) return null;
  return admin.messaging();
};

module.exports = { initFirebase, getMessaging };
