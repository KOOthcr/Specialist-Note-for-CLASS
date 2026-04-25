import React from 'react';

/**
 * ClassStudentListPageHeader: 명단 관리 페이지의 상단 타이틀 및 버튼 영역
 */
function ClassStudentListPageHeader({ 
  title, 
  selectedGroup, 
  setIsClassModalOpen, 
  setIsClubModalOpen, 
  handleOpenStudentModal, 
  handleExcelExport, 
  setSelectedGroup 
}) {
  return (
    <div className="dashboard-header-container">
      <div className="dashboard-header-top">
        <h2 className="title">{title}</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!selectedGroup ? (
            <>
              <button className="btn-solid-green" onClick={() => setIsClassModalOpen(true)}>
                + 반 추가하기
              </button>
              <button className="btn-solid-green" onClick={() => setIsClubModalOpen(true)}>
                + 동아리 추가하기
              </button>
            </>
          ) : (
            <>
              <button className="btn-solid-green" onClick={() => handleOpenStudentModal(null)}>
                + 학생 추가
              </button>
              <button className="btn-outline-green" style={{ backgroundColor: '#e8f5e9', fontWeight: 'bold' }} onClick={handleExcelExport}>
                📥 명단 출력 (엑셀)
              </button>
              <button className="btn-outline-green" onClick={() => setSelectedGroup(null)}>
                ← 뒤로가기 (목록으로)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClassStudentListPageHeader;
