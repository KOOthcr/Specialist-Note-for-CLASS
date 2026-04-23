import React from 'react';

function ProgressTablePage() {
  return (
    <div className="student-dashboard">
      <div className="empty-state" style={{flex: 1, backgroundColor: 'var(--color-white)', borderRadius: 'var(--radius-md)'}}>
        <div className="empty-content">
          <div className="empty-icon">📅</div>
          <p className="empty-text">진도표 페이지 (개발 중)</p>
        </div>
      </div>
    </div>
  );
}

export default ProgressTablePage;
