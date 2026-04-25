import React from 'react';
import SophisticatedDatePicker from '../common/SophisticatedDatePicker';

/**
 * AttendanceDailyView: 인원 체크의 일별 기록 뷰 컴포넌트
 */
function AttendanceDailyView({ 
  today, setToday, 
  selectedGroup, setSelectedGroup, 
  renderGroupSelection, 
  fetchAttendanceRecord, 
  handleSave, 
  setViewMode, 
  filteredStudents, 
  attendanceData, 
  setAttendanceData 
}) {
  return (
    <>
      <div className="dashboard-header-container">
        <div className="dashboard-header-top">
          <SophisticatedDatePicker 
            value={today} 
            onChange={(val) => { setToday(val); if (selectedGroup) fetchAttendanceRecord(selectedGroup); }} 
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            {selectedGroup ? (
              <>
                <button className="btn-solid-green" onClick={handleSave}>저장하기</button>
                <button className="btn-outline-green" onClick={() => setSelectedGroup(null)}>뒤로가기</button>
              </>
            ) : (
              <button className="btn-outline-green" onClick={() => setViewMode(null)}>메인으로</button>
            )}
          </div>
        </div>
      </div>

      {!selectedGroup ? (
        renderGroupSelection()
      ) : (
        <div className="table-container">
          <table className="student-table">
            <thead>
              {selectedGroup.type === 'class' ? (
                <tr><th>번호</th><th>이름</th><th>성별</th><th>출결 상태</th><th>비고</th></tr>
              ) : (
                <tr><th>순번</th><th>반</th><th>번호</th><th>이름</th><th>성별</th><th>출결 상태</th><th>비고</th></tr>
              )}
            </thead>
            <tbody>
              {filteredStudents.map((student, idx) => {
                const record = attendanceData[student.id] || { status: '', reason: '' };
                return (
                  <tr key={student.id}>
                    {selectedGroup.type === 'class' ? (
                      <>
                        <td style={{ width: '60px' }}>{student.student_number}</td>
                        <td style={{ fontWeight: 'bold' }}>{student.name}</td>
                        <td style={{ width: '60px' }}>{student.gender}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ width: '50px' }}>{idx + 1}</td>
                        <td style={{ width: '60px' }}>{student.grade}-{student.class_number}</td>
                        <td style={{ width: '60px' }}>{student.student_number}</td>
                        <td style={{ fontWeight: 'bold' }}>{student.name}</td>
                        <td style={{ width: '60px' }}>{student.gender}</td>
                      </>
                    )}
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        {['결석', '지각', '조퇴'].map(status => (
                          <button 
                            key={status} 
                            onClick={() => setAttendanceData(prev => ({ ...prev, [student.id]: { ...prev[student.id], status: prev[student.id]?.status === status ? '' : status } }))}
                            style={{ 
                              padding: '6px 14px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', 
                              border: record.status === status ? 'none' : '1px solid #eee', 
                              backgroundColor: record.status === status ? (status === '결석' ? '#ff4d4f' : status === '지각' ? '#faad14' : '#1890ff') : '#f8f9fa', 
                              color: record.status === status ? 'white' : '#777', fontWeight: 'bold' 
                            }}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="auth-input" 
                        style={{ width: '90%', padding: '8px', borderRadius: '8px' }} 
                        value={record.reason} 
                        onChange={(e) => setAttendanceData(prev => ({ ...prev, [student.id]: { ...prev[student.id], reason: e.target.value } }))} 
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default AttendanceDailyView;
