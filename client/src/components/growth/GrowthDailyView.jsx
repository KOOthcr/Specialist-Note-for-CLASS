import React from 'react';
import SophisticatedDatePicker from '../common/SophisticatedDatePicker';
import GroupSelectionGrid from '../common/GroupSelectionGrid';

/**
 * GrowthDailyView: 성장 기록의 일별 기록 뷰 컴포넌트
 */
function GrowthDailyView({ 
  today, setToday, 
  selectedGroup, setSelectedGroup, 
  classes, clubs, students, 
  renderCategoryTabs, 
  selectedCategory, 
  setEditingCategory, 
  setIsCategoryModalOpen, 
  handleDailyExcelDownload, 
  handleSave, 
  setViewMode, 
  getFilteredGroupStudents, 
  recordData, 
  setRecordData, 
  handleDecrementColumnCount, 
  handleIncrementColumnCount, 
  handleRecordValueChange 
}) {
  return (
    <>
      <div className="dashboard-header-container">
        <div className="dashboard-header-top">
          <SophisticatedDatePicker value={today} onChange={setToday} />
          <div style={{ display: 'flex', gap: '10px' }}>
            {selectedGroup ? (
              <>
                <button className="btn-outline-green" style={{ borderRadius: '50px' }} onClick={handleDailyExcelDownload}>일일기록 다운로드</button>
                <button className="btn-solid-green" style={{ borderRadius: '50px', padding: '10px 24px' }} onClick={handleSave}>기록 저장하기</button>
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
        <div className="table-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#333' }}>📈 {selectedCategory?.title || '항목 선택'} 일일 기록</h3>
            {selectedCategory && (
              <button 
                className="btn-outline-green" 
                style={{ padding: '6px 14px', borderRadius: '50px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} 
                onClick={() => { setEditingCategory(selectedCategory); setIsCategoryModalOpen(true); }}
              >
                <span>✏️</span> 항목 수정
              </button>
            )}
          </div>
          <table className="student-table" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8faf8' }}>
                {selectedGroup.type === 'class' ? (
                  <>
                    <th style={{ width: '50px' }}>번호</th>
                    <th style={{ width: '100px' }}>이름</th>
                    <th style={{ width: '70px' }}>성별</th>
                  </>
                ) : (
                  <>
                    <th style={{ width: '50px' }}>순번</th>
                    <th style={{ width: '70px' }}>반</th>
                    <th style={{ width: '50px' }}>번호</th>
                    <th style={{ width: '100px' }}>이름</th>
                    <th style={{ width: '70px' }}>성별</th>
                  </>
                )}
                <th style={{ width: 'auto' }}>관찰 메모</th>
                {Array.from({ length: selectedCategory?.columnCount || 1 }).map((_, i) => (
                  <th key={i} style={{ width: '110px', position: 'relative', padding: '15px 5px' }}>
                    <button 
                      onClick={handleDecrementColumnCount} 
                      style={{ position: 'absolute', top: '5px', right: '5px', width: '20px', height: '20px', borderRadius: '50%', border: '1px solid #ff4d4f', color: '#ff4d4f', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', zIndex: 5 }} 
                      title="이 열 삭제"
                    >-</button>
                    <span style={{ fontSize: '13px', color: '#555' }}>{selectedCategory?.unit || '기록'}{selectedCategory?.columnCount > 1 ? ` ${i + 1}` : ''}</span>
                  </th>
                ))}
                <th style={{ width: '60px', borderRight: 'none' }}>
                  <button 
                    onClick={handleIncrementColumnCount} 
                    style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', margin: '0 auto' }} 
                    title="측정 열 추가"
                  >+</button>
                </th>
              </tr>
            </thead>
            <tbody>
              {getFilteredGroupStudents().map((student, idx) => {
                const record = recordData[student.id] || { value: '', note: '', values: [] };
                return (
                  <tr key={student.id}>
                    {selectedGroup.type === 'class' ? (
                      <>
                        <td style={{ fontSize: '13px' }}>{student.student_number}</td>
                        <td style={{ fontWeight: '700', color: '#222' }}>{student.name}</td>
                        <td>{student.gender}</td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontSize: '13px' }}>{idx + 1}</td>
                        <td>{student.grade}-{student.class_number}</td>
                        <td>{student.student_number}</td>
                        <td style={{ fontWeight: '700' }}>{student.name}</td>
                        <td>{student.gender}</td>
                      </>
                    )}
                    <td>
                      <input 
                        type="text" 
                        className="auth-input" 
                        style={{ width: '95%', padding: '10px', fontSize: '13px', background: '#fdfdfd' }} 
                        value={record.note} 
                        placeholder="학생 특이사항 기록" 
                        onChange={(e) => setRecordData(prev => ({ ...prev, [student.id]: { ...prev[student.id], note: e.target.value } }))} 
                      />
                    </td>
                    {Array.from({ length: selectedCategory?.columnCount || 1 }).map((_, i) => (
                      <td key={i}>
                        <input 
                          type="number" 
                          className="auth-input" 
                          style={{ width: '85px', textAlign: 'center', fontWeight: '700', color: 'var(--color-primary-dark)' }} 
                          value={record.values?.[i] ?? (i === 0 ? record.value : '')} 
                          onChange={(e) => handleRecordValueChange(student.id, i, e.target.value)} 
                        />
                      </td>
                    ))}
                    <td />
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

export default GrowthDailyView;
