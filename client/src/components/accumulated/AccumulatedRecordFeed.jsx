import React from 'react';

/**
 * AccumulatedRecordFeed: 학생의 이전 행동 기록들을 보여주는 피드 컴포넌트
 */
function AccumulatedRecordFeed({ 
  selectedStudents, 
  studentRecords, 
  activeFilter, 
  setActiveFilter, 
  filters, 
  onEdit, 
  onDelete 
}) {
  if (selectedStudents.length !== 1) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
        <div style={{ fontSize: '40px', marginBottom: '15px', opacity: 0.5 }}>👥</div>
        <p style={{ fontSize: '15px', textAlign: 'center', lineHeight: '1.6' }}>여러 명의 학생이 선택되어 있습니다.<br/>상단의 버튼을 눌러 일괄 기록을 추가할 수 있습니다.</p>
        <p style={{ fontSize: '13px', marginTop: '10px', color: '#bbb' }}>개별 이전 기록을 보려면 1명만 선택해주세요.</p>
      </div>
    );
  }

  const filteredRecords = studentRecords.filter(rec => {
    // 선생님께 한마디는 누가기록 페이지에서 제외
    if (rec.content && rec.content.includes('[선생님께 한마디]')) return false;
    if (activeFilter === '전체') return true;
    if (activeFilter === '사진') return rec.type === 'photo';
    if (activeFilter === '동영상') return rec.type === 'video';
    if (activeFilter === '누가기록') return rec.type === 'text';
    return true;
  });

  return (
    <div style={{ padding: '25px', flex: 1, overflowY: 'auto', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h4 style={{ fontSize: '18px', fontWeight: '800', color: '#333' }}>이전 기록 <span style={{ color: 'var(--color-primary)', fontSize: '14px' }}>총 {studentRecords.length}개</span></h4>
        <div className="filter-chips">
          {filters.map((filter) => (
            <button key={filter} className={`chip ${activeFilter === filter ? 'active' : ''}`} onClick={() => setActiveFilter(filter)}>{filter}</button>
          ))}
        </div>
      </div>

      {filteredRecords.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {filteredRecords.map(record => (
            <div key={record.id} style={{ padding: '20px', border: '1px solid #f0f0f0', borderRadius: '15px', backgroundColor: '#fdfdfd' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '10px', fontWeight: 'bold', backgroundColor: record.type === 'text' ? '#e8f5e9' : record.type === 'photo' ? '#e3f2fd' : '#fff3e0', color: record.type === 'text' ? '#2e7d32' : record.type === 'photo' ? '#1976d2' : '#f57c00' }}>
                  {record.type === 'text' ? '📋 누가기록' : record.type === 'photo' ? '🖼️ 사진' : '▶️ 동영상'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ fontSize: '13px', color: '#999', fontWeight: 'bold' }}>
                    📅 {record.date} {record.time || (record.timestamp ? new Date(record.timestamp.seconds * 1000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '')}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => onEdit(record)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px', padding: '2px 5px' }}>수정</button>
                    <button onClick={() => onDelete(record.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', padding: '2px 5px' }}>삭제</button>
                  </div>
                </div>
              </div>
              {record.fileUrl && record.type === 'photo' && (
                <div style={{ marginTop: '10px', marginBottom: '15px' }}>
                  <img src={record.fileUrl} alt="첨부 사진" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '12px', objectFit: 'contain', border: '1px solid #e0e0e0' }} />
                </div>
              )}
              {record.fileUrl && record.type === 'video' && (
                <div style={{ marginTop: '10px', marginBottom: '15px' }}>
                  <video src={record.fileUrl} controls style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '12px', backgroundColor: '#000' }} />
                </div>
              )}
              <p style={{ fontSize: '15px', color: '#444', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{record.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-list" style={{ height: '200px' }}>
          <div className="empty-icon">📝</div>
          <p className="empty-text">등록된 행동 기록이 없습니다.</p>
        </div>
      )}
    </div>
  );
}

export default AccumulatedRecordFeed;
