import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './auth.css';
import { auth } from '../../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useModal } from '../../components/common/GlobalModal';
import SchoolInfoFields from './SchoolInfoFields';
import ClassAssignmentField from './ClassAssignmentField';

function SignupPage() {
  const { showAlert } = useModal();
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  
  // 새로 추가된 스키마 필드
  const [schoolName, setSchoolName] = useState('');
  const [subject, setSubject] = useState('');
  const [roomName, setRoomName] = useState('');
  
  // 담당 학급 관리
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [tempGrade, setTempGrade] = useState('');
  const [tempClassNumber, setTempClassNumber] = useState('');

  const handleAddClass = () => {
    if (!tempGrade || !tempClassNumber) {
      showAlert("학년과 반을 모두 입력해주세요!", "입력 오류", "error");
      return;
    }
    const newClass = { grade: Number(tempGrade), class_number: Number(tempClassNumber) };
    
    // 중복 방지
    const isDuplicate = assignedClasses.some(
      (c) => c.grade === newClass.grade && c.class_number === newClass.class_number
    );
    if (isDuplicate) {
      showAlert("이미 추가된 학급입니다.", "중복 오류", "error");
      return;
    }

    setAssignedClasses([...assignedClasses, newClass]);
    setTempGrade('');
    setTempClassNumber('');
  };

  const handleRemoveClass = (index) => {
    setAssignedClasses(assignedClasses.filter((_, i) => i !== index));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (password !== passwordConfirm) {
      showAlert("비밀번호가 일치하지 않습니다.", "입력 오류", "error");
      return;
    }

    if (assignedClasses.length === 0) {
      showAlert("최소 1개 이상의 담당 학급을 등록해 주세요.", "학급 미등록", "error");
      return;
    }
    
    try {
      // 1. Firebase Auth 계정 생성
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. 백엔드 API를 통해 선생님 정보 저장 (보안 강화)
      const idToken = await user.getIdToken();
      
      const response = await fetch(`${apiUrl}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          name,
          school_name: schoolName,
          subject,
          room_name: roomName || '',
          room_code: '', // 초기값
          assigned_classes: assignedClasses
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '서버 저장 중 오류가 발생했습니다.');
      }

      // 4. 로컬 스토리지 저장 (기존 코드 유지)
      localStorage.setItem('teacherName', name);
      localStorage.setItem('roomName', roomName || '전담교실');
      
      showAlert(`회원가입이 완료되었습니다! 반갑습니다, ${name} 선생님.`, "환영합니다");
      navigate('/main');
    } catch (error) {
      console.error("Signup error:", error);
      if (error.code === 'auth/email-already-in-use') {
        showAlert("이미 사용 중인 이메일입니다.", "가입 실패", "error");
      } else if (error.code === 'auth/weak-password') {
        showAlert("비밀번호는 최소 6자 이상이어야 합니다.", "가입 실패", "error");
      } else {
        showAlert("회원가입 중 오류가 발생했습니다: " + error.message, "오류", "error");
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h1 className="auth-title">전담노트 시작하기</h1>
        <p className="auth-greeting" style={{color: 'var(--color-text-muted)'}}>선생님의 편리한 학급 관리를 도와드립니다.</p>
      </div>

      <div className="auth-card">
        <form className="auth-form" onSubmit={handleSignup}>
          <div className="input-group">
            <label className="input-label" htmlFor="name">이름 (선생님 성함)</label>
            <input 
              id="name"
              type="text" 
              className="auth-input" 
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="email">이메일</label>
            <input 
              id="email"
              type="email" 
              className="auth-input" 
              placeholder="teacher@school.kr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label" htmlFor="password">비밀번호</label>
            <input 
              id="password"
              type="password" 
              className="auth-input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="passwordConfirm">비밀번호 확인 *</label>
            <input 
              id="passwordConfirm"
              type="password" 
              className="auth-input" 
              placeholder="••••••••"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <hr style={{borderTop: '1px solid var(--color-border)', margin: '24px 0'}} />
          <p style={{fontSize: '14px', fontWeight: 'bold', color: 'var(--color-primary-dark)', marginBottom: '16px'}}>학교 및 담당 학급 정보</p>

          <SchoolInfoFields 
            schoolName={schoolName} setSchoolName={setSchoolName}
            subject={subject} setSubject={setSubject}
            roomName={roomName} setRoomName={setRoomName}
          />

          <ClassAssignmentField 
            tempGrade={tempGrade} setTempGrade={setTempGrade}
            tempClassNumber={tempClassNumber} setTempClassNumber={setTempClassNumber}
            handleAddClass={handleAddClass}
            assignedClasses={assignedClasses}
            handleRemoveClass={handleRemoveClass}
          />
          
          <button type="submit" className="auth-button" style={{marginTop: '24px'}}>회원가입 완료</button>
        </form>

        <div className="auth-footer">
          이미 계정이 있으신가요? 
          <Link to="/" className="auth-link">로그인</Link>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
