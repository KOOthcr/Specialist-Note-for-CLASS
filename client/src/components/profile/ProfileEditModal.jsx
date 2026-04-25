import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase/config';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useModal } from '../common/GlobalModal';

function ProfileEditModal({ isOpen, onClose, onUpdate }) {
  const { showAlert } = useModal();
  const [loading, setLoading] = useState(false);
  
  // 폼 필드
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [currentPassword, setCurrentPassword] = useState(''); // 비밀번호 변경 시 필요할 수 있음
  const [schoolName, setSchoolName] = useState('');
  const [subject, setSubject] = useState('');
  const [roomName, setRoomName] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUserData();
    }
  }, [isOpen]);

  const fetchUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const data = userSnap.data();
        setSchoolName(data.school_name || '');
        setSubject(data.subject || '');
        setRoomName(data.room_name || '');
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("로그인 정보가 없습니다.");

      // 1. 비밀번호 변경 (입력된 경우만)
      if (password) {
        if (password !== passwordConfirm) {
          showAlert("비밀번호가 일치하지 않습니다.", "오류", "error");
          setLoading(false);
          return;
        }
        
        // Firebase 비밀번호 변경은 최근 로그인 기록이 필요함
        // 여기서는 단순 변경 시도 (실패 시 재인증 필요 알림)
        try {
          await updatePassword(user, password);
        } catch (pwErr) {
          if (pwErr.code === 'auth/requires-recent-login') {
            showAlert("비밀번호 변경을 위해 다시 로그인해주시기 바랍니다.", "보안 알림", "error");
            setLoading(false);
            return;
          }
          throw pwErr;
        }
      }

      // 2. Firestore 정보 업데이트
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        school_name: schoolName,
        subject: subject,
        room_name: roomName
      });

      // 3. 로컬 스토리지 업데이트 (사이드바 반영용)
      localStorage.setItem('roomName', roomName);
      
      if (onUpdate) onUpdate({ roomName });
      
      showAlert("정보가 성공적으로 수정되었습니다.", "수정 완료");
      onClose();
    } catch (err) {
      console.error("Error updating profile:", err);
      showAlert("정보 수정 중 오류가 발생했습니다: " + err.message, "오류", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="global-modal-overlay" onClick={onClose}>
      <div className="global-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px', padding: '32px' }}>
        <h3 className="modal-title" style={{ marginBottom: '24px' }}>내 정보 수정</h3>
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
          
          <div className="input-group">
            <label className="input-label" style={{ fontSize: '13px', fontWeight: 'bold', color: '#666' }}>새 비밀번호 (변경 시에만 입력)</label>
            <input 
              type="password" 
              className="auth-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>

          <div className="input-group">
            <label className="input-label" style={{ fontSize: '13px', fontWeight: 'bold', color: '#666' }}>비밀번호 확인 *</label>
            <input 
              type="password" 
              className="auth-input" 
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '8px 0' }} />
          <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-dark)' }}>학교 및 담당 학급 정보</p>

          <div className="input-group">
            <label className="input-label" style={{ fontSize: '13px', fontWeight: 'bold', color: '#666' }}>학교 이름 *</label>
            <input 
              type="text" 
              className="auth-input" 
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="예) 미래초등학교"
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>

          <div className="input-group">
            <label className="input-label" style={{ fontSize: '13px', fontWeight: 'bold', color: '#666' }}>전담 과목 *</label>
            <input 
              type="text" 
              className="auth-input" 
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="예) 체육"
              required
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', marginTop: '4px' }}
            />
          </div>

          <div className="input-group">
            <label className="input-label" style={{ fontSize: '13px', fontWeight: 'bold', color: '#666' }}>전담 교실 (반 이름)</label>
            <input 
              type="text" 
              className="auth-input" 
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="예) 체육관, 영어1실"
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', marginTop: '4px' }}
            />
            <p style={{ fontSize: '11px', color: 'var(--color-primary)', marginTop: '4px' }}>
              💡 '열정', '도전', '행복'과 같은 멋진 이름을 추천합니다!
            </p>
          </div>

          <div className="modal-actions" style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className="btn-modal-cancel" 
              onClick={onClose}
              style={{ flex: 1 }}
            >
              취소
            </button>
            <button 
              type="submit" 
              className="btn-modal-confirm" 
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfileEditModal;
