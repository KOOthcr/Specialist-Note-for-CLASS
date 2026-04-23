import React, { useState, useEffect } from 'react';

function ClubEditModal({ isOpen, club, onSave, onClose }) {
  const [name, setName] = useState('');
  const [leader, setLeader] = useState('');

  useEffect(() => {
    if (club) {
      setName(club.name || '');
      setLeader(club.leader || '');
    }
  }, [club, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!name) return;
    onSave({
      name: name,
      leader: leader || ''
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '400px', padding: '30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎨</div>
          <h3 style={{ color: 'var(--color-primary-dark)', fontSize: '20px', fontWeight: 700 }}>동아리 정보 수정</h3>
          <p style={{ color: '#64748b', fontSize: '14px' }}>변경할 동아리의 상세 정보를 입력해 주세요.</p>
        </div>
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#475569' }}>동아리 이름</label>
            <input 
              type="text" 
              className="auth-input" 
              style={{ width: '100%' }}
              placeholder="동아리 이름 입력"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 600, color: '#475569' }}>부장 이름</label>
            <input 
              type="text" 
              className="auth-input" 
              style={{ width: '100%' }}
              placeholder="동아리 부장 이름 입력"
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

export default ClubEditModal;
