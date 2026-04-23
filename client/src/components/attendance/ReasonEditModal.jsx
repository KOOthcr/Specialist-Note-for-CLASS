import React, { useState, useEffect } from 'react';

// 출결 사유 입력 모달 (AttendancePage에서 분리)
// 월별 뷰에서 특정 학생의 결석/지각/조퇴 사유를 날짜별로 입력하는 모달
function ReasonEditModal({ isOpen, student, selectedMonth, monthlyRecords, onSave, onClose }) {
  const [selectedDay, setSelectedDay] = useState('');
  const [reasonInput, setReasonInput] = useState('');

  // 이 학생에게 출결 기록이 있는 날짜 목록 추출
  const markedDays = Object.entries(monthlyRecords)
    .filter(([, records]) => records?.[student?.id]?.status)
    .map(([date, records]) => ({
      date,
      day: date.split('-')[2],
      status: records[student.id].status,
      reason: records[student.id].reason || ''
    }))
    .sort((a, b) => Number(a.day) - Number(b.day));

  // 모달이 열릴 때 첫 번째 날짜 자동 선택
  useEffect(() => {
    if (isOpen) {
      if (markedDays.length > 0) {
        setSelectedDay(markedDays[0].date);
        setReasonInput(markedDays[0].reason);
      } else {
        setSelectedDay('');
        setReasonInput('');
      }
    }
  }, [isOpen, student]);

  const handleDaySelect = (dateStr) => {
    setSelectedDay(dateStr);
    const existing = markedDays.find(m => m.date === dateStr);
    setReasonInput(existing?.reason || '');
  };

  if (!isOpen || !student) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '420px', borderRadius: '24px', padding: '32px' }}>
        <h3 style={{ marginBottom: '24px', color: 'var(--color-primary-dark)', fontSize: '20px', fontWeight: '800' }}>[{student.name}] 사유 등록</h3>

        {markedDays.length > 0 ? (
          <>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="input-label" style={{ fontSize: '14px', fontWeight: '600', color: '#666' }}>기록된 일자 선택</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                {markedDays.map((m) => (
                  <button key={m.date} onClick={() => handleDaySelect(m.date)} style={{ padding: '8px 16px', borderRadius: '12px', fontSize: '14px', cursor: 'pointer', border: selectedDay === m.date ? 'none' : '1px solid #eee', backgroundColor: selectedDay === m.date ? 'var(--color-primary)' : '#f8f9fa', color: selectedDay === m.date ? 'white' : '#555', fontWeight: selectedDay === m.date ? 'bold' : 'normal', transition: 'all 0.2s' }}>
                    {Number(m.day)}일 ({m.status})
                  </button>
                ))}
              </div>
            </div>
            {selectedDay && (
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="input-label" style={{ fontSize: '14px', fontWeight: '600', color: '#666' }}>{Number(selectedDay.split('-')[2])}일 사유 입력</label>
                <textarea className="auth-input" style={{ height: '120px', padding: '15px', borderRadius: '12px', resize: 'none', marginTop: '8px', fontSize: '15px' }} placeholder="상세 내용을 적어주세요" value={reasonInput} onChange={(e) => setReasonInput(e.target.value)} />
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn-cancel" onClick={onClose} style={{ padding: '12px 24px', borderRadius: '12px' }}>취소</button>
              <button className="btn-submit" onClick={() => onSave(selectedDay, reasonInput)} disabled={!selectedDay} style={{ padding: '12px 24px', borderRadius: '12px' }}>저장하기</button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
            <p style={{ color: '#888', marginBottom: '24px', lineHeight: '1.6' }}>출결 상태가 기록된 날짜가 없습니다.<br/>먼저 표에서 상태를 체크해 주세요.</p>
            <button className="btn-solid-green" style={{ width: '100%', padding: '14px', borderRadius: '12px' }} onClick={onClose}>알겠습니다</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReasonEditModal;
