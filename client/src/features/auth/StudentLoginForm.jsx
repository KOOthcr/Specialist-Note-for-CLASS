import React from 'react';

/**
 * StudentLoginForm: 학생 전용 로그인 및 입장 폼 컴포넌트
 * UI와 직접적인 입력 핸들러만 담당합니다.
 */
function StudentLoginForm({ 
  roomName, setRoomName, 
  grade, setGrade, 
  classNumber, setClassNumber, 
  studentNumber, setStudentNumber, 
  studentName, setStudentName, 
  roomCode, setRoomCode, 
  handleStudentLogin 
}) {
  return (
    <form className="auth-form" onSubmit={handleStudentLogin}>
      <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '24px', textAlign: 'center' }}>
        선생님이 알려주신 방 이름과 내 정보를 입력해 주세요!
      </p>
      
      <div className="input-group">
        <label className="input-label" htmlFor="roomName">전담 교실 (방 찾기)</label>
        <input 
          id="roomName" 
          type="text" 
          className="auth-input" 
          placeholder="예: 체육관" 
          value={roomName} 
          onChange={(e) => setRoomName(e.target.value)} 
          required 
        />
      </div>
      
      <div style={{ display: 'flex', gap: '8px' }}>
        <div className="input-group" style={{ flex: 1 }}>
          <label className="input-label" htmlFor="grade">학년</label>
          <input 
            id="grade" 
            type="number" 
            className="auth-input" 
            placeholder="숫자" 
            value={grade} 
            onChange={(e) => setGrade(e.target.value)} 
            required 
          />
        </div>
        <div className="input-group" style={{ flex: 1 }}>
          <label className="input-label" htmlFor="classNumber">반</label>
          <input 
            id="classNumber" 
            type="number" 
            className="auth-input" 
            placeholder="숫자" 
            value={classNumber} 
            onChange={(e) => setClassNumber(e.target.value)} 
            required 
          />
        </div>
        <div className="input-group" style={{ flex: 1 }}>
          <label className="input-label" htmlFor="studentNumber">번호</label>
          <input 
            id="studentNumber" 
            type="number" 
            className="auth-input" 
            placeholder="숫자" 
            value={studentNumber} 
            onChange={(e) => setStudentNumber(e.target.value)} 
            required 
          />
        </div>
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="studentName">이름</label>
        <input 
          id="studentName" 
          type="text" 
          className="auth-input" 
          placeholder="예: 김민수" 
          value={studentName} 
          onChange={(e) => setStudentName(e.target.value)} 
          required 
        />
      </div>

      <div className="input-group" style={{ marginTop: '16px' }}>
        <label className="input-label" htmlFor="roomCode">학생 입장 코드 (6자리 숫자)</label>
        <input 
          id="roomCode" 
          type="text" 
          className="auth-input" 
          placeholder="선생님 화면의 숫자 6자리 입력" 
          value={roomCode} 
          onChange={(e) => setRoomCode(e.target.value)} 
          required 
          maxLength={6} 
          style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '8px', fontWeight: 'bold' }}
        />
      </div>
      
      <button type="submit" className="auth-button" style={{ backgroundColor: '#2196F3' }}>🚀 교실 바로 입장하기</button>
    </form>
  );
}

export default StudentLoginForm;
