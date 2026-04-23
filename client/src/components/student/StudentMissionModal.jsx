import React from 'react';

// 학생용 미션 현황 확인 모달 (StudentPage에서 분리)
function StudentMissionModal({ onClose }) {
  return (
    <div className="modal-body">
      <div className="modal-icon-large">🎯</div>
      <h3 className="modal-title">우리 반 미션 확인</h3>

      <div className="mission-status-card">
        <h4 className="mission-name">바른 자세로 수업 듣기</h4>
        <p className="mission-reward">🎁 목표 달성 보상: <strong>자유 체육 1시간</strong></p>

        <div className="student-thermometer">
          <div className="student-thermo-bar">
            <div className="student-thermo-fill" style={{ width: '48%' }}></div>
          </div>
          <div className="student-thermo-text">
            <span>현재: 24점</span>
            <span>목표: 50점</span>
          </div>
        </div>
        <p className="mission-cheer">절반 정도 왔어요! 조금만 더 힘내요 화이팅! 🔥</p>
      </div>

      <div className="modal-actions center-actions">
        <button className="btn-submit" onClick={onClose}>확인했습니다</button>
      </div>
    </div>
  );
}

export default StudentMissionModal;
