import React from 'react';

// 날짜 선택기 공통 컴포넌트 (일별/월별 모드 지원)
// AttendancePage, GrowthRecordPage, ProgressCheckPage에서 공통으로 사용
function SophisticatedDatePicker({ value, onChange, mode = 'daily' }) {
  const date = new Date(value);
  const days = ['일', '월', '화', '수', '목', '금', '토'];

  // 현재 모드에 맞게 날짜 포맷 문자열 생성
  const formatDate = () => {
    if (mode === 'daily') {
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
    }
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
  };

  // 이전 날짜/월로 이동하는 함수
  const handlePrev = () => {
    const newDate = new Date(date);
    if (mode === 'daily') newDate.setDate(date.getDate() - 1);
    else newDate.setMonth(date.getMonth() - 1);
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const day = String(newDate.getDate()).padStart(2, '0');
    onChange(mode === 'daily' ? `${year}-${month}-${day}` : `${year}-${month}`);
  };

  // 다음 날짜/월로 이동하는 함수
  const handleNext = () => {
    const newDate = new Date(date);
    if (mode === 'daily') newDate.setDate(date.getDate() + 1);
    else newDate.setMonth(date.getMonth() + 1);
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const day = String(newDate.getDate()).padStart(2, '0');
    onChange(mode === 'daily' ? `${year}-${month}-${day}` : `${year}-${month}`);
  };

  return (
    <div className="date-picker-container" style={{ display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#fff', padding: '10px 20px', borderRadius: '50px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
      <button className="date-nav-btn" onClick={handlePrev} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center' }}>◀</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', position: 'relative' }}>
        <span style={{ fontSize: '18px', fontWeight: '800', color: '#333', letterSpacing: '-0.5px' }}>{formatDate()}</span>
        {/* 보이지 않는 실제 input이 클릭을 받아 달력 팝업을 여는 트릭 */}
        <input type={mode === 'daily' ? 'date' : 'month'} value={value} onChange={(e) => onChange(e.target.value)} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
        <span style={{ fontSize: '16px' }}>📅</span>
      </div>
      <button className="date-nav-btn" onClick={handleNext} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center' }}>▶</button>
    </div>
  );
}

export default SophisticatedDatePicker;
