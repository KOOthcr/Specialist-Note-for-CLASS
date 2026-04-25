import React from 'react';

/**
 * MissionProgressBar: 온도계 형태의 미션 진행률 프로그레스바 컴포넌트
 * 로직은 MissionPage에 있으며, props로 currentMission 데이터를 받아 렌더링만 합니다.
 */
function MissionProgressBar({ currentMission }) {
  if (!currentMission) return null;

  const percentage = Math.min(100, (currentMission.currentScore / currentMission.targetScore) * 100);
  const isCompleted = percentage >= 100;

  return (
    <div className="thermometer-container">
      <div className="thermometer-wrapper">
        {/* 온도계 배경 */}
        <div className="thermometer-bg">
          {/* 눈금선 */}
          <div className="marks">
            <div className="mark mark-100"></div>
            <div className="mark mark-75"></div>
            <div className="mark mark-50"></div>
            <div className="mark mark-25"></div>
          </div>
          
          {/* 채워지는 게이지 */}
          <div 
            className={`thermometer-fill ${isCompleted ? 'completed' : ''}`}
            style={{ height: `${percentage}%` }}
          >
            {percentage > 5 && <span className="current-points-badge">{currentMission.currentScore}</span>}
          </div>
        </div>
        {/* 온도계 둥근 하단 */}
        <div className={`thermometer-bulb ${isCompleted ? 'completed' : ''}`}></div>
      </div>

      <div className="progress-text">
        <span className="current">{currentMission.currentScore}점</span>
        <span className="divider">/</span>
        <span className="target">{currentMission.targetScore}점</span>
      </div>
    </div>
  );
}

export default MissionProgressBar;
