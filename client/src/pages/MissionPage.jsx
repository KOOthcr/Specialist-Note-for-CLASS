import React, { useState, useEffect } from 'react';
import './MissionPage.css';
import MissionSettingModal from '../components/mission/MissionSettingModal';
import MissionProgressBar from '../components/mission/MissionProgressBar';
import { useModal } from '../components/common/GlobalModal';

function MissionPage() {
  const { showConfirm, showAlert } = useModal();
  const [selectedClass, setSelectedClass] = useState('5-1');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // 더미 데이터 상태 관리
  // 실제 환경에서는 백엔드/Firebase와 연동해야 합니다.
  const [missions, setMissions] = useState({
    '5-1': {
      missionName: '바른 자세로 수업 듣기',
      reward: '자유 체육 1시간',
      targetScore: 50,
      currentScore: 24,
      createdAt: new Date().toISOString()
    },
    '5-2': null,
    '5-3': {
      missionName: '준비물 잘 챙겨오기',
      reward: '영화 감상',
      targetScore: 100,
      currentScore: 100,
      createdAt: new Date().toISOString()
    }
  });

  const currentMission = missions[selectedClass];

  // 반 변경 시 축하 효과 초기화
  useEffect(() => {
    setShowConfetti(false);
    if (currentMission && currentMission.currentScore >= currentMission.targetScore) {
      setShowConfetti(true);
    }
  }, [selectedClass, currentMission?.currentScore]);

  const handleClassChange = (e) => {
    setSelectedClass(e.target.value);
  };

  const handleSaveMission = (newMission) => {
    setMissions(prev => ({
      ...prev,
      [selectedClass]: newMission
    }));
    setIsModalOpen(false);
    setShowConfetti(false);
    showAlert('새로운 단체 미션이 시작되었습니다!', '미션 등록');
  };

  const handleUpdateScore = (amount) => {
    if (!currentMission) return;
    
    // 이미 달성한 경우 점수 올리지 않기 (내리는 것은 허용할 수도 있지만 여기서는 일단 방어)
    if (amount > 0 && currentMission.currentScore >= currentMission.targetScore) {
       // 이미 달성함
       return;
    }

    setMissions(prev => {
      const updatedScore = Math.max(0, prev[selectedClass].currentScore + amount);
      return {
        ...prev,
        [selectedClass]: {
          ...prev[selectedClass],
          currentScore: updatedScore
        }
      };
    });
  };

  const handleClearMission = () => {
    showConfirm('현재 진행 중인 미션을 삭제하시겠습니까? (점수가 모두 초기화됩니다)', () => {
      setMissions(prev => ({
        ...prev,
        [selectedClass]: null
      }));
      setShowConfetti(false);
    }, '미션 삭제');
  };

  return (
    <div className="mission-dashboard">
      <div className="dashboard-header-modern">
        <div>
          <h2 className="title">🎯 단체 미션</h2>
          <p className="subtitle">반 전체가 함께 목표를 달성해보세요!</p>
        </div>
        
        <div className="class-selector">
          <label>학급 선택:</label>
          <select value={selectedClass} onChange={handleClassChange} className="class-select-dropdown">
            <option value="5-1">5학년 1반</option>
            <option value="5-2">5학년 2반</option>
            <option value="5-3">5학년 3반</option>
          </select>
        </div>
      </div>

      <div className="mission-content">
        {!currentMission ? (
          <div className="empty-mission-state">
            <div className="empty-icon">🌱</div>
            <h3>아직 진행 중인 미션이 없어요.</h3>
            <p>우리 반만의 특별한 목표와 보상을 정해보세요!</p>
            <button className="start-mission-btn" onClick={() => setIsModalOpen(true)}>
              + 새 미션 만들기
            </button>
          </div>
        ) : (
          <div className="active-mission-card">
            {showConfetti && (
              <div className="confetti-overlay">
                <div className="confetti-text">🎉 미션 달성! 축하합니다! 🎉</div>
              </div>
            )}
            
            <div className="mission-header-info">
              <div className="mission-title-area">
                <h3 className="mission-name">{currentMission.missionName}</h3>
                <div className="mission-reward">🎁 보상: <strong>{currentMission.reward}</strong></div>
              </div>
              <button className="reset-mission-btn" onClick={handleClearMission}>
                미션 종료/삭제
              </button>
            </div>

            <div className="mission-body">
              {/* 왼쪽: 온도계 프로그레스 — MissionProgressBar 컴포넌트로 분리 */}
              <div className="progress-section">
                <MissionProgressBar currentMission={currentMission} />
              </div>

              {/* 오른쪽: 컨트롤 패널 */}
              <div className="control-section">
                <div className="control-panel">
                  <h4>점수 부여</h4>
                  <p>선생님의 칭찬을 점수로 바꿔주세요!</p>
                  
                  <div className="point-buttons">
                    <button 
                      className="point-btn plus-big" 
                      onClick={() => handleUpdateScore(5)}
                      disabled={currentMission.currentScore >= currentMission.targetScore}
                    >
                      +5점
                    </button>
                    <button 
                      className="point-btn plus-small" 
                      onClick={() => handleUpdateScore(1)}
                      disabled={currentMission.currentScore >= currentMission.targetScore}
                    >
                      +1점
                    </button>
                    <button 
                      className="point-btn minus" 
                      onClick={() => handleUpdateScore(-1)}
                    >
                      -1점
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <MissionSettingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveMission} 
      />
    </div>
  );
}

export default MissionPage;
