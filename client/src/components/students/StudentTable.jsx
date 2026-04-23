import React from 'react';

function StudentTable({ students, onEdit, onToggleHide, onDelete, readonly = false, showSerialNumber = false }) {
  return (
    <div className="table-container">
      <table className="student-table">
        <thead>
          <tr>
            {showSerialNumber && <th>순번</th>}
            <th>학년</th>
            <th>반</th>
            <th>번호</th>
            <th>이름</th>
            <th>성별</th>
            <th>동아리</th>
            {!readonly && <th>관리</th>}
          </tr>
        </thead>
        <tbody>
          {students.length > 0 ? (
            students.map((student, index) => (
              <tr key={student.id} style={{ opacity: student.is_hidden ? 0.5 : 1 }}>
                {showSerialNumber && <td>{index + 1}</td>}
                <td>{student.grade}</td>
                <td>{student.class_number}</td>
                <td>{student.student_number}</td>
                <td>
                  {student.name} 
                  {student.is_hidden && <span style={{fontSize: '12px', color: '#999', marginLeft:'4px'}}>(숨김)</span>}
                </td>
                <td>{student.gender}</td>
                <td>{student.club}</td>
                {!readonly && (
                  <td>
                    <div className="row-actions">
                      <button className="btn-action edit" onClick={() => onEdit(student)}>수정</button>
                      <button className="btn-action hide" onClick={() => onToggleHide(student)}>
                        {student.is_hidden ? '표시' : '숨김'}
                      </button>
                      <button className="btn-action delete" onClick={() => onDelete(student.id)}>삭제</button>
                    </div>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={readonly ? (showSerialNumber ? "7" : "6") : (showSerialNumber ? "8" : "7")} className="empty-state">
                <div className="empty-content">
                  <div className="empty-icon">!</div>
                  <p className="empty-text">등록된 학생 명단이 없습니다. 명단을 추가해주세요.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default StudentTable;
