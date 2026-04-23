import React, { useState } from 'react';
import './MissionSettingModal.css';

function MissionSettingModal({ isOpen, onClose, onSave }) {
  const [missionName, setMissionName] = useState('');
  const [reward, setReward] = useState('');
  const [targetScore, setTargetScore] = useState(50);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!missionName.trim() || !reward.trim() || targetScore <= 0) {
      alert('모든 항목을 올바르게 입력해주세요.');
      return;
    }
    
    onSave({
      missionName,
      reward,
      targetScore: Number(targetScore),
      currentScore: 0,
      createdAt: new Date().toISOString()
    });
    
    // 폼 초기화
    setMissionName('');
    setReward('');
    setTargetScore(50);
  };

  return (
    <div className="modal-overlay">
      <div className="mission-modal-content">
        <h2 className="mission-modal-title">✨ 새 단체 미션 만들기</h2>
        
        <form onSubmit={handleSubmit} className="mission-form">
          <div className="form-group">
            <label>어떤 미션인가요?</label>
            <input 
              type="text" 
              placeholder="예: 바른 자세로 수업 듣기, 협동하기 등" 
              value={missionName}
              onChange={(e) => setMissionName(e.target.value)}
              autoFocus
            />
          </div>
          
          <div className="form-group">
            <label>달성 시 보상은 무엇인가요?</label>
            <input 
              type="text" 
              placeholder="예: 자유 체육 1시간, 영화 감상 등" 
              value={reward}
              onChange={(e) => setReward(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label>목표 점수</label>
            <div className="score-input-wrapper">
              <input 
                type="number" 
                min="10" 
                max="1000" 
                step="10"
                value={targetScore}
                onChange={(e) => setTargetScore(e.target.value)}
              />
              <span className="score-unit">점</span>
            </div>
            <p className="help-text">10점 ~ 1000점 사이로 설정할 수 있습니다.</p>
          </div>
          
          <div className="mission-modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>취소</button>
            <button type="submit" className="save-btn">시작하기!</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MissionSettingModal;
