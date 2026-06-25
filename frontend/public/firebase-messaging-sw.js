importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            'AIzaSyAGxWb-zgrvLpetY2S0ZsWRTspT6xCDzfM',
  projectId:         'imep-f61f6',
  messagingSenderId: '446913190693',
  appId:             '1:446913190693:web:2985f7ec3195fdf26558cc',
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
