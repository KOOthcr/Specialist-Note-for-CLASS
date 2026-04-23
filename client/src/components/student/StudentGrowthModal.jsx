import React from 'react';

// 학생용 성장 기록 입력 모달 (StudentPage에서 분리)
function StudentGrowthModal({ categories, growthType, setGrowthType, growthRecords, setGrowthRecords, growthMemo, setGrowthMemo, selectedDate, setSelectedDate, onSubmit, onClose }) {
  const getDayOfWeek = (dateStr) => {
    const d = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[d.getDay()];
  };

  return (
    <div className="modal-body">
      <div className="modal-icon-large">📏</div>
      <h3 className="modal-title">성장 기록 입력</h3>
      <p className="modal-desc">오늘 측정한 나의 기록을 입력해 주세요.</p>

      <div className="form-group">
        <label>측정 날짜</label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input type="date" className="modal-input" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ fontWeight: 'bold', border: '1px solid #e2e8f0', width: '100%', paddingRight: '45px' }} />
          <span style={{ position: 'absolute', right: '40px', fontWeight: 'bold', color: 'var(--color-primary)' }}>({getDayOfWeek(selectedDate)})</span>
        </div>
      </div>

      <div className="form-group">
        <label>측정 종목</label>
        <select value={growthType} onChange={(e) => setGrowthType(e.target.value)} className="modal-input">
          {categories.length === 0 && <option value="">종목 없음 (선생님이 추가해야 합니다)</option>}
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.title} ({cat.unit})</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>나의 기록</label>
        {growthRecords.map((record, index) => (
          <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <span style={{ lineHeight: '46px', fontWeight: 'bold', color: '#475569' }}>{record.round}차</span>
            <input type="number" value={record.value} onChange={(e) => {
              const newRecords = [...growthRecords];
              newRecords[index].value = e.target.value;
              setGrowthRecords(newRecords);
            }} className="modal-input" placeholder="숫자 입력" style={{ flex: 1 }} autoFocus={index === growthRecords.length - 1} />
          </div>
        ))}
      </div>

      <div className="form-group">
        <label>짧은 느낀점 (관찰 메모)</label>
        <textarea className="modal-textarea" placeholder="예: 저번보다 기록이 늘어서 뿌듯하다, 다음엔 더 잘하고 싶다 등" value={growthMemo} onChange={(e) => setGrowthMemo(e.target.value)} style={{ height: '80px', marginBottom: '0' }} />
      </div>

      <div className="modal-actions">
        <button className="btn-cancel" onClick={onClose}>취소</button>
        <button className="btn-submit" onClick={onSubmit} disabled={!growthRecords.some(r => r.value)}>기록 제출하기</button>
      </div>
    </div>
  );
}

export default StudentGrowthModal;
