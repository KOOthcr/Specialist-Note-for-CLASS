import React, { useState } from 'react';

function ClassManagementModal({ isOpen, classes, onAdd, onDelete, onClose }) {
  const [grade, setGrade] = useState('');
  const [classNumber, setClassNumber] = useState('');
  const [leader, setLeader] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e) => {
    e.preventDefault();
    if (!grade || !classNumber) return;
    onAdd(Number(grade), Number(classNumber), leader);
    setGrade('');
    setClassNumber('');
    setLeader('');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '550px' }}>
        <h3 style={{ marginBottom: '20px', color: 'var(--color-primary-dark)' }}>학급 관리 (추가/삭제)</h3>
        
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <input 
            type="number" 
            className="auth-input" 
            style={{ width: '70px' }}
            placeholder="학년"
            min="1" max="6"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          />
          <input 
            type="number" 
            className="auth-input" 
            style={{ width: '70px' }}
            placeholder="반"
            min="1" max="25"
            value={classNumber}
            onChange={(e) => setClassNumber(e.target.value)}
          />
          <input 
            type="text" 
            className="auth-input" 
            style={{ flex: 1 }}
            placeholder="반장(부장) 이름"
            value={leader}
            onChange={(e) => setLeader(e.target.value)}
          />
          <button type="submit" className="btn-solid-green">추가</button>
        </form>

        <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '10px' }}>
          {classes.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {classes.sort((a,b) => {
                if(a.grade !== b.grade) return a.grade - b.grade;
                return a.class_number - b.class_number;
              }).map((cls) => (
                <li key={cls.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 500 }}>{cls.grade}학년 {cls.class_number}반</span>
                    <span style={{ fontSize: '13px', color: '#666' }}>({cls.leader || '반장 미지정'})</span>
                  </div>
                  <button 
                    onClick={() => onDelete(cls)}
                    style={{ color: 'var(--color-error)', fontSize: '12px', background: '#fff1f0', border: '1px solid #ffa39e', padding: '2px 8px', borderRadius: '4px' }}
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>등록된 학급이 없습니다.</p>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button className="btn-outline-green" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}

export default ClassManagementModal;
