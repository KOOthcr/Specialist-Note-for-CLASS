import React, { useState, useEffect } from 'react';

function ClassEditModal({ isOpen, cls, onSave, onClose }) {
  const [grade, setGrade] = useState('');
  const [classNumber, setClassNumber] = useState('');
  const [leader, setLeader] = useState('');

  useEffect(() => {
    if (cls) {
      setGrade(cls.grade || '');
      setClassNumber(cls.class_number || '');
      setLeader(cls.leader || '');
    }
  }, [cls, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!grade || !classNumber) return;
    onSave({
      grade: Number(grade),
      class_number: Number(classNumber),
      leader: leader || ''
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '400px', padding: '30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🏫</div>
          <h3 style={{ color: 'var(--color-primary-dark)', fontSize: '20px', fontWeight: 700 }}>학급 정보 수정</h3>
          <p style={{ color: '#64748b', fontSize: '14px' }}>변경할 학급의 상세 정보를 입력해 주세요.</p>
        </div>
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#475569' }}>학년</label>
            <input 
              type="number" 
              className="auth-input" 
              style={{ width: '100%' }}
              placeholder="학년 입력"
              min="1" max="6"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#475569' }}>반</label>
            <input 
              type="number" 
              className="auth-input" 
              style={{ width: '100%' }}
              placeholder="반 입력"
              min="1" max="25"
              value={classNumber}
              onChange={(e) => setClassNumber(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#475569' }}>반장(부장) 이름</label>
            <input 
              type="text" 
              className="auth-input" 
              style={{ width: '100%' }}
              placeholder="반장(부장) 이름 입력"
              value={leader}
              onChange={(e) => setLeader(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn-outline-green" style={{ flex: 1 }} onClick={onClose}>취소</button>
            <button type="submit" className="btn-solid-green" style={{ flex: 2 }}>수정 완료</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClassEditModal;
