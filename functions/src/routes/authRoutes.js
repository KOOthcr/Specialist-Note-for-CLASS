const express = require('express');
const router = express.Router();
const { db, auth: adminAuth } = require('../config/firebase');

// Auth API 라우트: 보안 강화된 회원가입
router.post('/signup', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '인증 토큰이 누락되었습니다.' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const { name, subject, assigned_classes, room_name, room_code, school_name } = req.body;

    // 1. Firebase ID Token 검증
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    if (!uid) {
      return res.status(401).json({ error: '유효하지 않은 사용자 토큰입니다.' });
    }

    // 2. 데이터 준비
    const userData = {
      uid,
      email,
      name: name || '',
      role: 'specialist',
      school_name: school_name || '미설정 학교',
      subject: subject || '',
      room_name: room_name || '',
      room_code: room_code || '',
      assigned_classes: assigned_classes || [], // 전체 목록 유지
      settings: {
        is_approved: false,
        push_enabled: true,
        theme: 'green'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 3. Firestore Batch 작업 (사용자 정보 + 학급 목록 초기화)
    const batch = db.batch();
    
    // 유저 문서
    const userRef = db.collection('users').doc(uid);
    batch.set(userRef, userData);

    // 하위 classes 컬렉션 초기화
    if (Array.isArray(assigned_classes)) {
      assigned_classes.forEach(cls => {
        const classRef = userRef.collection('classes').doc();
        batch.set(classRef, {
          ...cls,
          created_at: new Date().toISOString()
        });
      });
    }

    await batch.commit();
    
    res.status(201).json({ message: '서버를 통해 안전하게 회원가입이 처리되었습니다.', user: userData });
  } catch (error) {
    console.error('Secure SignUp Error:', error);
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: '인증 토큰이 만료되었습니다.' });
    }
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

// 기본 상태 조회
router.get('/status', (req, res) => {
  res.json({ message: 'Specialist Note Secure API is active!' });
});

module.exports = router;
