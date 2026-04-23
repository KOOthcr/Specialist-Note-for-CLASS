import React from 'react';

// 학급/동아리 선택 카드 그리드 공통 컴포넌트
// AttendancePage, GrowthRecordPage에서 동일한 패턴으로 중복 사용되던 것을 통합
function GroupSelectionGrid({ classes, clubs, students, onSelectGroup }) {
  return (
    <div className="card-grid-container" style={{ animation: 'fadeIn 0.5s ease' }}>
      {/* 학급 카드 목록 */}
      <div className="group-section">
        <h3 className="section-title">🏫 학급 선택</h3>
        <div className="card-grid">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="group-card class-card"
              onClick={() => onSelectGroup({ type: 'class', ...cls })}
            >
              <div className="card-icon">🏫</div>
              <div className="card-info">
                <span className="card-name">{cls.grade}학년 {cls.class_number}반</span>
                <span className="card-count">
                  {students.filter(s => s.grade === cls.grade && s.class_number === cls.class_number).length}명
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 동아리 카드 목록 */}
      <div className="group-section" style={{ marginTop: '40px' }}>
        <h3 className="section-title">✨ 동아리 선택</h3>
        <div className="card-grid">
          {clubs.map((club) => (
            <div
              key={club.id}
              className="group-card club-card"
              onClick={() => onSelectGroup({ type: 'club', ...club })}
            >
              <div className="card-icon">🎨</div>
              <div className="card-info">
                <span className="card-name">{club.name}</span>
                <span className="card-count">
                  {students.filter(s => s.club === club.name).length}명
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GroupSelectionGrid;
