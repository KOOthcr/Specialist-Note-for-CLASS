import React from 'react';

// 주차 이동 버튼 컴포넌트 (ProgressCheckPage에서 분리)
function WeekNavigator({ week, period, onPrev, onNext }) {
  return (
    <div className="week-navigator-center">
      <button className="week-nav-btn" onClick={onPrev}>◀</button>
      <div className="week-info-display">
        <div className="week-num-text">{week}주차</div>
        <div className="week-period-text">{period}</div>
      </div>
      <button className="week-nav-btn" onClick={onNext}>▶</button>
    </div>
  );
}

export default WeekNavigator;
