import React from 'react';

/**
 * SchoolInfoFields: 학교 이름, 전담 과목, 전담 교실 이름을 입력받는 컴포넌트
 */
function SchoolInfoFields({ 
  schoolName, setSchoolName, 
  subject, setSubject, 
  roomName, setRoomName 
}) {
  return (
    <>
      <div className="input-group">
        <label className="input-label" htmlFor="schoolName">학교 이름 *</label>
        <input 
          id="schoolName"
          type="text" 
          className="auth-input" 
          placeholder="예) 미래초등학교"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          required
        />
      </div>
      
      <div className="input-group">
        <label className="input-label" htmlFor="subject">전담 과목 *</label>
        <input 
          id="subject"
          type="text" 
          className="auth-input" 
          placeholder="예) 체육"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
      </div>

      <div className="input-group">
        <label className="input-label" htmlFor="roomName">전담 교실 (반 이름)</label>
        <input 
          id="roomName"
          type="text" 
          className="auth-input" 
          placeholder="예) 열정, 행복"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />
        <p style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '4px', marginLeft: '2px' }}>
          💡 '열정', '도전', '행복'과 같은 단어 이름을 추천합니다!
        </p>
      </div>
    </>
  );
}

export default SchoolInfoFields;
