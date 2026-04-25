import React from 'react';
import SophisticatedDatePicker from '../common/SophisticatedDatePicker';

/**
 * AttendanceMonthlyView: 인원 체크의 월별 기록 뷰 컴포넌트
 */
function AttendanceMonthlyView({ 
  selectedMonth, setSelectedMonth, 
  selectedGroup, setSelectedGroup, 
  renderGroupSelection, 
  fetchMonthlyRecords, 
  currentEditStatus, setCurrentEditStatus, 
  isSaving, 
  handleMonthlySave, 
  handleExcelExport, 
  setViewMode, 
  filteredStudents, 
  monthlyRecords, 
  handleCellClick, 
  setActiveStudentForReason, 
  setIsReasonModalOpen, 
  getDayOfWeek, 
  getDaysInMonth 
}) {
  const daysInMonth = getDaysInMonth(selectedMonth);
  const dayColumns = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <>
      <div className="dashboard-header-container">
        <div className="dashboard-header-top">
          <SophisticatedDatePicker 
            value={selectedMonth} 
            mode="monthly" 
            onChange={(val) => { setSelectedMonth(val); if (selectedGroup) fetchMonthlyRecords(selectedGroup); }} 
          />
          <button className="btn-outline-green" onClick={() => selectedGroup ? setSelectedGroup(null) : setViewMode(null)}>
            {selectedGroup ? '뒤로가기' : '메인으로'}
          </button>
        </div>
        {selectedGroup && (
          <div className="monthly-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '15px 25px', borderRadius: '20px', marginTop: '15px', border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#444' }}>입력 모드:</span>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['결석', '지각', '조퇴', '정상'].map(status => (
                  <label key={status} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', color: currentEditStatus === status ? 'var(--color-primary)' : '#888' }}>
                    <input type="radio" name="editMode" value={status} checked={currentEditStatus === status} onChange={() => setCurrentEditStatus(status)} />
                    {status === '정상' ? '기록 삭제' : status}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-solid-green" onClick={handleMonthlySave} disabled={isSaving} style={{ padding: '10px 24px', borderRadius: '12px' }}>
                {isSaving ? '저장 중...' : '기록 저장'}
              </button>
              <button className="btn-outline-green" style={{ borderColor: '#2e7d32', color: '#2e7d32', padding: '10px 20px', borderRadius: '12px' }} onClick={handleExcelExport}>엑셀 출력</button>
            </div>
          </div>
        )}
      </div>

      {!selectedGroup ? (
        renderGroupSelection()
      ) : (
        <div className="table-container" style={{ overflowX: 'auto', marginTop: '15px' }}>
          <table className="student-table" style={{ fontSize: '11px', borderCollapse: 'collapse', width: 'auto', minWidth: '100%' }}>
            <thead>
              <tr>
                {selectedGroup.type === 'class' ? (
                  <>
                    <th rowSpan="2">번호</th>
                    <th rowSpan="2">성명</th>
                    <th rowSpan="2">성별</th>
                  </>
                ) : (
                  <>
                    <th rowSpan="2">순번</th>
                    <th rowSpan="2">학년</th>
                    <th rowSpan="2">반</th>
                    <th rowSpan="2">번호</th>
                    <th rowSpan="2">성명</th>
                    <th rowSpan="2">성별</th>
                  </>
                )}
                {dayColumns.map(d => (
                  <th key={d} style={{ padding: '6px', border: '1px solid #eee', minWidth: '30px', color: getDayOfWeek(selectedMonth, d) === '토' ? '#1890ff' : getDayOfWeek(selectedMonth, d) === '일' ? '#ff4d4f' : '#333', backgroundColor: '#fdfdfd' }}>{d}</th>
                ))}
                <th rowSpan="2" style={{ minWidth: '40px', color: '#ff4d4f' }}>결</th>
                <th rowSpan="2" style={{ minWidth: '40px', color: '#faad14' }}>지</th>
                <th rowSpan="2" style={{ minWidth: '40px', color: '#1890ff' }}>조</th>
                <th rowSpan="2" style={{ minWidth: '150px' }}>사유 등록</th>
              </tr>
              <tr>
                {dayColumns.map(d => (
                  <th key={d} style={{ padding: '2px', border: '1px solid #eee', fontSize: '10px', color: getDayOfWeek(selectedMonth, d) === '토' ? '#1890ff' : getDayOfWeek(selectedMonth, d) === '일' ? '#ff4d4f' : '#777', backgroundColor: '#fdfdfd' }}>{getDayOfWeek(selectedMonth, d)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, idx) => {
                let counts = { '결석': 0, '지각': 0, '조퇴': 0 }; 
                let reasons = [];
                dayColumns.forEach(d => { 
                  const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`; 
                  const dayRecord = monthlyRecords[dateStr]?.[student.id]; 
                  if (dayRecord?.status) counts[dayRecord.status]++; 
                  if (dayRecord?.reason) reasons.push(`${d}일:${dayRecord.reason}`); 
                });
                return (
                  <tr key={student.id}>
                    {selectedGroup.type === 'class' ? (
                      <>
                        <td style={{ border: '1px solid #eee' }}>{student.student_number}</td>
                        <td style={{ border: '1px solid #eee', fontWeight: 'bold' }}>{student.name}</td>
                        <td style={{ border: '1px solid #eee' }}>{student.gender}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ border: '1px solid #eee' }}>{idx + 1}</td>
                        <td style={{ border: '1px solid #eee' }}>{student.grade}</td>
                        <td style={{ border: '1px solid #eee' }}>{student.class_number}</td>
                        <td style={{ border: '1px solid #eee' }}>{student.student_number}</td>
                        <td style={{ border: '1px solid #eee', fontWeight: 'bold' }}>{student.name}</td>
                        <td style={{ border: '1px solid #eee' }}>{student.gender}</td>
                      </>
                    )}
                    {dayColumns.map(d => {
                      const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
                      const status = monthlyRecords[dateStr]?.[student.id]?.status;
                      let symbol = '', color = '';
                      if (status === '결석') { symbol = '●'; color = '#ff4d4f'; } 
                      else if (status === '지각') { symbol = '▲'; color = '#faad14'; } 
                      else if (status === '조퇴') { symbol = '▼'; color = '#1890ff'; }
                      return (
                        <td 
                          key={d} 
                          onClick={() => handleCellClick(dateStr, student.id)} 
                          style={{ padding: '0', border: '1px solid #eee', textAlign: 'center', height: '36px', cursor: 'pointer', backgroundColor: '#fff' }} 
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'} 
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                        >
                          <span style={{ color, fontSize: '16px', fontWeight: 'bold' }}>{symbol}</span>
                        </td>
                      );
                    })}
                    <td style={{ border: '1px solid #eee', fontWeight: 'bold', color: '#ff4d4f' }}>{counts['결석'] || ''}</td>
                    <td style={{ border: '1px solid #eee', fontWeight: 'bold', color: '#faad14' }}>{counts['지각'] || ''}</td>
                    <td style={{ border: '1px solid #eee', fontWeight: 'bold', color: '#1890ff' }}>{counts['조퇴'] || ''}</td>
                    <td style={{ border: '1px solid #eee', padding: '4px' }}>
                      <div 
                        style={{ minHeight: '32px', cursor: 'pointer', fontSize: '11px', color: '#666', display: 'flex', alignItems: 'center', padding: '0 8px', backgroundColor: '#f8f9fa', borderRadius: '6px' }} 
                        onClick={() => { setActiveStudentForReason(student); setIsReasonModalOpen(true); }}
                      >
                        {reasons.length > 0 ? reasons.join(', ') : '+ 사유 입력'}
                      </div>
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

export default AttendanceMonthlyView;
