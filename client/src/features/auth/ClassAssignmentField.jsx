import React from 'react';

/**
 * ClassAssignmentField: 회원가입 시 담당 학급을 추가하고 관리하는 컴포넌트
 */
function ClassAssignmentField({ 
  tempGrade, setTempGrade, 
  tempClassNumber, setTempClassNumber, 
  handleAddClass, 
  assignedClasses, 
  handleRemoveClass 
}) {
  return (
    <div className="input-group">
      <label className="input-label">담당 학급 등록 (모두 추가해 주세요)</label>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <input
          type="number"
          className="auth-input"
          placeholder="학년"
          min="1" max="6"
          style={{ flex: 1 }}
          value={tempGrade}
          onChange={(e) => setTempGrade(e.target.value)}
        />
        <span style={{alignSelf: 'center'}}>학년</span>
        <input
          type="number"
          className="auth-input"
          placeholder="반"
          min="1" max="20"
          style={{ flex: 1 }}
          value={tempClassNumber}
          onChange={(e) => setTempClassNumber(e.target.value)}
        />
        <span style={{alignSelf: 'center'}}>반</span>
        <button 
          type="button" 
          onClick={handleAddClass}
          style={{
            backgroundColor: 'var(--color-primary)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            padding: '0 16px',
            cursor: 'pointer'
          }}
        >
          추가
        </button>
      </div>
      
      {/* 추가된 학급을 보여주는 배지 영역 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
        {assignedClasses.length === 0 && (
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>추가된 학급이 없습니다. 최소 1개 이상 추가해 주세요.</span>
        )}
        {assignedClasses.map((ac, idx) => (
          <span 
            key={idx} 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#e6f4ea',
              color: 'var(--color-primary-dark)',
              padding: '6px 12px',
              borderRadius: '16px',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            {ac.grade}학년 {ac.class_number}반
            <button
              type="button"
              onClick={() => handleRemoveClass(idx)}
              style={{ background: 'none', border: 'none', marginLeft: '6px', cursor: 'pointer', color: '#666', fontSize: '14px', lineHeight: 1 }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

export default ClassAssignmentField;
