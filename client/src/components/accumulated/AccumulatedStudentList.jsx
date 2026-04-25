import React from 'react';

/**
 * AccumulatedStudentList: 누가기록 페이지의 좌측 학생 명단 패널
 */
function AccumulatedStudentList({ 
  selectedGroup, 
  selectedStudents, 
  clearSelection, 
  searchTerm, 
  setSearchTerm, 
  studentsToDisplay, 
  groupedData, 
  toggleStudentSelection 
}) {
  return (
    <div className="behavior-left-pane" style={{ flex: selectedStudents.length > 0 ? '0.6' : '1.2' }}>
      <div className="pane-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 className="pane-title" style={{ marginBottom: 0 }}>학생 명단 <span style={{ fontSize: '14px', color: '#888', marginLeft: '10px' }}>{selectedGroup.name}</span></h2>
          {selectedStudents.length > 0 && (
            <button className="btn-outline-green" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={clearSelection}>선택 초기화</button>
          )}
        </div>
        <div className="search-bar">
          <input type="text" placeholder="학생명이나 번호로 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          <div className="search-icons"><span>🔍</span></div>
        </div>
      </div>

      <div className="pane-content student-list-scroll">
        {studentsToDisplay.length > 0 ? (
          <div className="student-items">
            {selectedGroup.type === 'all' ? (
              groupedData.map(group => (
                <div key={group.label} className="class-group-section">
                  <h4 className="class-group-title">{group.label}</h4>
                  {group.students.map(student => {
                    const isSelected = selectedStudents.some(s => s.id === student.id);
                    return (
                      <div key={student.id} className={`student-item-card mini ${isSelected ? 'selected' : ''}`} onClick={() => toggleStudentSelection(student)}>
                        <div className={`student-avatar mini ${isSelected ? 'active' : ''}`}>{isSelected ? '✓' : student.name[0]}</div>
                        <div className="student-info">
                          <span className="student-name" style={{ color: isSelected ? 'var(--color-primary-dark)' : '#333' }}>{student.name}</span>
                          <span className="student-sub">{student.student_number}번</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            ) : (
              studentsToDisplay.map(student => {
                const isSelected = selectedStudents.some(s => s.id === student.id);
                return (
                  <div key={student.id} className={`student-item-card ${isSelected ? 'selected' : ''}`} onClick={() => toggleStudentSelection(student)}>
                    <div className={`student-avatar ${isSelected ? 'active' : ''}`}>{isSelected ? '✓' : student.name[0]}</div>
                    <div className="student-info">
                      <span className="student-name" style={{ color: isSelected ? 'var(--color-primary-dark)' : '#333' }}>{student.name}</span>
                      <span className="student-sub">{student.grade}학년 {student.class_number}반 {student.student_number}번</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="empty-list">
            <div className="empty-icon">!</div>
            <p className="empty-text">해당 그룹에 학생이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AccumulatedStudentList;
