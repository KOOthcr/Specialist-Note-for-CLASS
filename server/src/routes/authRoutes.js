const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

// 테스트용 Auth API 라우트
router.post('/signup', async (req, res) => {
  try {
    // 임시 구조 (실제 구현 시 클라이언트에서 넘겨주는 데이터로 치환합니다)
    const { uid, email, name, subject, assigned_classes, room_name, room_code } = req.body;
    
    if(!uid || !email) {
      return res.status(400).json({ error: 'UID와 Email은 필수입니다.' });
    }

    const userData = {
      email,
      name: name || '',
      role: 'specialist',
      school_name: '테스트초등학교',
      subject: subject || '체육',
      room_name: room_name || '',
      room_code: room_code || '',
      assigned_classes: assigned_classes || [],
      settings: {
        is_approved: false,
        push_enabled: true,
        theme: 'green'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 파이어베이스 DB(Firestore) users 컬렉션에 사용자 데이터 저장
    await db.collection('users').doc(uid).set(userData);
    
    res.status(201).json({ message: '회원가입이 원활하게 처리되었습니다.', user: userData });
  } catch (error) {
    console.error('SignUp Error:', error);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

// 테스트용 기본조회 라우트
router.get('/status', (req, res) => {
  res.json({ message: 'Auth routes are working!' });
});

module.exports = router;
