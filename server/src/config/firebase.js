const admin = require('firebase-admin');

// .env에 등록된 GOOGLE_APPLICATION_CREDENTIALS 환경변수를 통해 초기화됨
// 서비스 계정 키를 찾지 못하는 경우 에러가 발생할 수 있습니다.
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Firebase Admin initialization error:', error.message);
  console.warn('=> .env 파일에 GOOGLE_APPLICATION_CREDENTIALS 경로가 올바른지 확인하세요.');
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
