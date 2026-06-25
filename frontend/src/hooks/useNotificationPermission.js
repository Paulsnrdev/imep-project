import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '../features/auth/authSlice';
import { messaging, getToken, onMessage, isConfigured } from '../services/firebase';
import api from '../services/api';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const useNotificationPermission = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const registeredRef   = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !isConfigured || !messaging || !VAPID_KEY) return;
    if (registeredRef.current) return;

    const register = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const token = await getToken(messaging, {
          vapidKey:        VAPID_KEY,
          serviceWorkerRegistration: await navigator.serviceWorker.register(
            '/firebase-messaging-sw.js',
            { scope: '/' }
          ),
        });

        if (token) {
          await api.put('/me/fcm-token', { fcmToken: token });
          registeredRef.current = true;
        }
      } catch {
        // Non-fatal — polling notifications still work
      }
    };

    register();
  }, [isAuthenticated]);

  // Handle foreground messages (app is open)
  useEffect(() => {
    if (!isConfigured || !messaging) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      const n = payload.notification ?? {};
      if (n.title && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(n.title, { body: n.body ?? '', icon: '/favicon.ico' });
      }
    });

    return unsubscribe;
  }, []);
};
