import React from 'react';

/**
 * StudentModeSelectionModal: 동아리 활동 학생을 위한 입장 모드(학급/동아리) 선택 모달
 */
function StudentModeSelectionModal({ show, studentData, onSelect, onCancel }) {
  if (!show || !studentData) return null;

  return (
    <div className="global-modal-overlay" onClick={onCancel}>
      <div className="global-modal-content" onClick={e => e.stopPropagation()} style={{ width: '400px', textAlign: 'center' }}>
        <div className="modal-icon" style={{ backgroundColor: '#f0f4ff', color: '#2196F3' }}>🏫</div>
        <h3 className="modal-title" style={{ marginTop: '16px' }}>어떤 반으로 입장할까요?</h3>
        <p className="modal-text">동아리 활동을 하는 학생이군요! 오늘 수업에 맞게 선택해 주세요.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
          <button 
            onClick={() => onSelect(studentData, 'class')}
            style={{
              padding: '16px', borderRadius: '12px', border: '2px solid #e2e8f0', backgroundColor: '#fff',
              fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = '#2196F3'}
            onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
          >
            <span>📘</span> {studentData.grade}학년 {studentData.classNumber}반 (원래 학급)
          </button>
          
          <button 
            onClick={() => onSelect(studentData, 'club')}
            style={{
              padding: '16px', borderRadius: '12px', border: '2px solid #e2e8f0', backgroundColor: '#fff',
              fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = '#4CAF50'}
            onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
          >
            <span>⚽</span> {studentData.club} (동아리반)
          </button>
        </div>
        
        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <button className="btn-modal-cancel" onClick={onCancel} style={{ width: '100%' }}>취소</button>
        </div>
      </div>
    </div>
  );
}

export default StudentModeSelectionModal;
