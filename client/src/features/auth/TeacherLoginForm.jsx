import React from 'react';
import { Link } from 'react-router-dom';

/**
 * TeacherLoginForm: 교사 전용 로그인 폼 컴포넌트
 * UI와 직접적인 입력 핸들러만 담당하며, 실제 로그인 로직은 부모로부터 전달받습니다.
 */
function TeacherLoginForm({ email, setEmail, password, setPassword, handleTeacherLogin }) {
  return (
    <form className="auth-form" onSubmit={handleTeacherLogin}>
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
          required 
        />
      </div>
      <button type="submit" className="auth-button">로그인</button>
      
      <div className="auth-footer" style={{ marginTop: '24px' }}>
        계정이 없으신가요? <Link to="/signup" className="auth-link">회원가입</Link>
      </div>
    </form>
  );
}

export default TeacherLoginForm;
