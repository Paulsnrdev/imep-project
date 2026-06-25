import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'fs'

// Generates public/firebase-messaging-sw.js with env vars injected so the
// service worker can be served as a static file without Vite processing.
const writeFirebaseSW = (env) => {
  writeFileSync('./public/firebase-messaging-sw.js', `
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            '${env.VITE_FIREBASE_API_KEY            ?? ''}',
  projectId:         '${env.VITE_FIREBASE_PROJECT_ID         ?? ''}',
  messagingSenderId: '${env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? ''}',
  appId:             '${env.VITE_FIREBASE_APP_ID             ?? ''}',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const n = payload.notification ?? {};
  self.registration.showNotification(n.title ?? 'IMEP', {
    body:  n.body  ?? '',
    icon:  '/favicon.ico',
    badge: '/favicon.ico',
    data:  payload.data ?? {},
  });
});
`.trimStart())
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  writeFirebaseSW(env)

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5174,
      strictPort: true,
    },
  }
})
