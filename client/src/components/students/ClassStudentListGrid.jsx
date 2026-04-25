import React from 'react';

/**
 * ClassStudentListGrid: 학급 및 동아리 선택 카드 그리드 컴포넌트 (명단 관리 전용)
 */
function ClassStudentListGrid({ 
  classes, 
  clubs, 
  students, 
  onSelectGroup, 
  onEditClass, 
  onDeleteClass, 
  onEditClub, 
  onDeleteClub 
}) {
  return (
    <div className="card-grid-container">
      <div className="group-section">
        <h3 className="section-title">🏫 학급 선택</h3>
        <div className="card-grid">
          {classes.sort((a,b) => {
            if(a.grade !== b.grade) return a.grade - b.grade;
            return a.class_number - b.class_number;
          }).map((cls) => (
            <div 
              key={cls.id} 
              className="group-card class-card"
              onClick={() => onSelectGroup({ type: 'class', grade: cls.grade, class_number: cls.class_number })}
            >
              <div className="card-actions">
                <button className="card-btn edit" onClick={(e) => onEditClass(e, cls)}>✏️</button>
                <button className="card-btn delete" onClick={(e) => onDeleteClass(e, cls)}>🗑️</button>
              </div>
              <div className="card-icon">🏫</div>
              <div className="card-info">
                <span className="card-name">{cls.grade}학년 {cls.class_number}반</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span className="card-count" style={{ fontSize: '13px', color: '#64748b' }}>
                    👤 반장: {cls.leader || '미지정'}
                  </span>
                  <span className="card-count">
                    {students.filter(s => s.grade === cls.grade && s.class_number === cls.class_number).length}명
                  </span>
                </div>
              </div>
            </div>
          ))}
          {classes.length === 0 && <p className="empty-msg">등록된 학급이 없습니다. 학급을 추가해 주세요.</p>}
        </div>
      </div>

      <div className="group-section" style={{ marginTop: '40px' }}>
        <h3 className="section-title">
          <img src="/club_icon.png" alt="동아리" style={{ width: '28px', height: '28px', borderRadius: '6px', marginRight: '8px' }} />
          동아리 선택
        </h3>
        <div className="card-grid">
          {clubs.map((club) => (
            <div 
              key={club.id} 
              className="group-card club-card"
              onClick={() => onSelectGroup({ type: 'club', name: club.name })}
            >
              <div className="card-actions">
                <button className="card-btn edit" onClick={(e) => onEditClub(e, club)}>✏️</button>
                <button className="card-btn delete" onClick={(e) => onDeleteClub(e, club)}>🗑️</button>
              </div>
              <div className="card-icon">
                <img src="/club_icon.png" alt="동아리" style={{ width: '40px', height: '40px' }} />
              </div>
              <div className="card-info">
                <span className="card-name">{club.name}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span className="card-count" style={{ fontSize: '13px', color: '#64748b' }}>
                    👤 부장: {club.leader || '미지정'}
                  </span>
                  <span className="card-count">{students.filter(s => s.club === club.name).length}명</span>
                </div>
              </div>
            </div>
          ))}
          {clubs.length === 0 && <p className="empty-msg">등록된 동아리가 없습니다.</p>}
        </div>
      </div>
    </div>
  );
}

export default ClassStudentListGrid;
