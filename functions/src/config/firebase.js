const admin = require('firebase-admin');

// Firebase Cloud 환경에서는 인자 없이 호출하면 자동 설정됩니다.
try {
  admin.initializeApp();
  console.log('Firebase Admin initialized successfully in Cloud Functions');
} catch (error) {
  console.error('Firebase Admin initialization error:', error.message);
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
