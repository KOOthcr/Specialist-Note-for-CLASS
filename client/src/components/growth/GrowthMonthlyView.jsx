import React from 'react';
import SophisticatedDatePicker from '../common/SophisticatedDatePicker';
import GroupSelectionGrid from '../common/GroupSelectionGrid';

/**
 * GrowthMonthlyView: 성장 기록의 월별 기록 뷰 컴포넌트
 */
function GrowthMonthlyView({ 
  selectedMonth, setSelectedMonth, 
  selectedGroup, setSelectedGroup, 
  classes, clubs, students, 
  renderCategoryTabs, 
  selectedCategory, 
  handleMonthlyExcelDownload, 
  setViewMode, 
  getFilteredGroupStudents, 
  monthlyRecords, 
  setActiveStudentForGraph, 
  setIsGraphModalOpen 
}) {
  const days = new Date(selectedMonth.split('-')[0], selectedMonth.split('-')[1], 0).getDate();

  return (
    <>
      <div className="dashboard-header-container">
        <div className="dashboard-header-top">
          <SophisticatedDatePicker value={selectedMonth} mode="monthly" onChange={setSelectedMonth} />
          <div style={{ display: 'flex', gap: '10px' }}>
            {selectedGroup ? (
              <>
                <button className="btn-outline-green" style={{ borderRadius: '50px' }} onClick={handleMonthlyExcelDownload}>월별기록 다운로드</button>
                <button className="btn-outline-green" style={{ borderRadius: '50px' }} onClick={() => setSelectedGroup(null)}>뒤로가기</button>
              </>
            ) : (
              <button className="btn-outline-green" style={{ borderRadius: '50px' }} onClick={() => setViewMode(null)}>메인으로</button>
            )}
          </div>
        </div>
        {selectedGroup && renderCategoryTabs()}
      </div>

      {!selectedGroup ? (
        <GroupSelectionGrid classes={classes} clubs={clubs} students={students} onSelectGroup={(g) => setSelectedGroup({ type: 'class', ...g })} />
      ) : (
        <div className="table-container" style={{ marginTop: '15px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#333', marginBottom: '16px' }}>📅 {selectedCategory?.title || '항목 선택'} 월별 성장 기록</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="student-table" style={{ fontSize: '11px', minWidth: '100%' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8faf8' }}>
                  <th style={{ minWidth: '80px' }}>번호/반</th>
                  <th style={{ minWidth: '80px' }}>성명</th>
                  {Array.from({ length: days }, (_, i) => i + 1).map(d => <th key={d} style={{ minWidth: '35px' }}>{d}</th>)}
                  <th style={{ minWidth: '80px' }}>성장 그래프</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredGroupStudents().map((student) => (
                  <tr key={student.id}>
                    <td>{selectedGroup.type === 'class' ? student.student_number : `${student.grade}-${student.class_number}`}</td>
                    <td 
                      style={{ fontWeight: '700', color: 'var(--color-primary-dark)', cursor: 'pointer' }} 
                      onClick={() => { setActiveStudentForGraph(student); setIsGraphModalOpen(true); }}
                    >
                      {student.name}
                    </td>
                    {Array.from({ length: days }, (_, i) => i + 1).map(d => {
                      const date = `${selectedMonth}-${String(d).padStart(2, '0')}`;
                      const rec = monthlyRecords[date]?.[student.id];
                      let displayValue = '-';
                      let hasData = false;
                      if (rec) {
                        if (rec.values && rec.values.length > 0) {
                          const validValues = rec.values.filter(v => v !== '' && v !== undefined);
                          if (validValues.length > 0) { displayValue = validValues.join(' / '); hasData = true; }
                        } else if (rec.value) { displayValue = rec.value; hasData = true; }
                      }
                      const cellStyle = { 
                        color: hasData ? 'var(--color-primary)' : '#ccc', 
                        fontSize: hasData && String(displayValue).length > 4 ? '10px' : '11px', 
                        whiteSpace: 'nowrap' 
                      };
                      return <td key={d} style={cellStyle}>{displayValue}</td>;
                    })}
                    <td>
                      <button 
                        className="btn-outline-green" 
                        style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '50px' }} 
                        onClick={() => { setActiveStudentForGraph(student); setIsGraphModalOpen(true); }}
                      >
                        개인 리포트
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

export default GrowthMonthlyView;
