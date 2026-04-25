import React, { useState, useEffect, useMemo } from 'react';
import './MissionPage.css';
import MissionSettingModal from '../components/mission/MissionSettingModal';
import MissionProgressBar from '../components/mission/MissionProgressBar';
import { useModal } from '../components/common/GlobalModal';
import { useClassStudents } from '../hooks/useClassStudents'; // useAllStudents 대신 useClassStudents 사용
import { db } from '../firebase/config';
import { doc, onSnapshot, setDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';

function MissionPage() {
  const { showConfirm, showAlert } = useModal();
  const { classes, clubs, currentUser } = useClassStudents(); // classes, clubs 직접 가져옴
  
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [currentMission, setCurrentMission] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // 1. 학급 및 동아리 목록 통합 추출
  const availableGroups = useMemo(() => {
    const groups = [];
    
    // 학급 추가
    classes.forEach(c => {
      groups.push({
        id: `class:${c.grade}-${c.class_number}`,
        label: `${c.grade}학년 ${c.class_number}반`,
        type: 'class',
        grade: c.grade,
        class_number: c.class_number
      });
    });

    // 동아리 추가
    clubs.forEach(c => {
      groups.push({
        id: `club:${c.name}`,
        label: `[동아리] ${c.name}`,
        type: 'club',
        name: c.name
      });
    });

    // 정렬: 학급 우선(학년/반 순), 그 다음 동아리(이름 순)
    return groups.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'class' ? -1 : 1;
      if (a.type === 'class') {
        if (a.grade !== b.grade) return a.grade - b.grade;
        return a.class_number - b.class_number;
      }
      return a.name.localeCompare(b.name);
    });
  }, [classes, clubs]);

  // 2. 초기 선택 및 변경 대응
  useEffect(() => {
    if (availableGroups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(availableGroups[0].id);
    }
  }, [availableGroups, selectedGroupId]);

  // 3. Firebase 미션 데이터 실시간 감시
  useEffect(() => {
    if (!currentUser || !selectedGroupId) return;

    // ":" 문자가 Firebase 경로에서 문제를 일으킬 수 있으므로 안전한 ID로 변환하여 사용 (슬래시 등으로 치환 가능하지만 여기서는 단순하게 사용)
    const safeId = selectedGroupId.replace(':', '_');
    const missionRef = doc(db, 'users', currentUser.uid, 'missions', safeId);
    
    const unsubscribe = onSnapshot(missionRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentMission(data);
        
        if (data.currentScore >= data.targetScore) {
          setShowConfetti(true);
        } else {
          setShowConfetti(false);
        }
      } else {
        setCurrentMission(null);
        setShowConfetti(false);
      }
    }, (error) => {
      console.error("Mission fetch error:", error);
    });

    return () => unsubscribe();
  }, [currentUser, selectedGroupId]);

  const handleGroupChange = (e) => {
    setSelectedGroupId(e.target.value);
  };

  const handleSaveMission = async (newMission) => {
    if (!currentUser || !selectedGroupId) return;

    try {
      const safeId = selectedGroupId.replace(':', '_');
      const missionRef = doc(db, 'users', currentUser.uid, 'missions', safeId);
      
      const groupInfo = availableGroups.find(g => g.id === selectedGroupId);

      await setDoc(missionRef, {
        ...newMission,
        groupId: selectedGroupId,
        groupLabel: groupInfo?.label || selectedGroupId,
        updatedAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      showAlert(`${groupInfo?.label}의 새로운 미션이 시작되었습니다!`, '미션 등록');
    } catch (error) {
      console.error("Save mission error:", error);
      showAlert('미션 저장 중 오류가 발생했습니다.', '오류', 'error');
    }
  };

  const handleUpdateScore = async (amount) => {
    if (!currentMission || !currentUser || !selectedGroupId) return;
    
    if (amount > 0 && currentMission.currentScore >= currentMission.targetScore) {
       return;
    }

    try {
      const safeId = selectedGroupId.replace(':', '_');
      const missionRef = doc(db, 'users', currentUser.uid, 'missions', safeId);
      await updateDoc(missionRef, {
        currentScore: increment(amount),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Update score error:", error);
    }
  };

  const handleClearMission = () => {
    if (!currentUser || !selectedGroupId) return;

    const groupInfo = availableGroups.find(g => g.id === selectedGroupId);
    showConfirm(`${groupInfo?.label}의 미션을 종료하고 삭제하시겠습니까?`, async () => {
      try {
        const safeId = selectedGroupId.replace(':', '_');
        const missionRef = doc(db, 'users', currentUser.uid, 'missions', safeId);
        await deleteDoc(missionRef);
        showAlert('미션이 종료되었습니다.', '알림');
      } catch (error) {
        console.error("Delete mission error:", error);
      }
    }, '미션 삭제');
  };

  const selectedGroup = availableGroups.find(g => g.id === selectedGroupId);

  return (
    <div className="mission-dashboard">
      <div className="dashboard-header-modern">
        <div>
          <h2 className="title">🎯 단체 미션</h2>
          <p className="subtitle">우리 반 또는 동아리원들과 함께 목표를 달성해보세요!</p>
        </div>
        
        <div className="class-selector">
          <label>학급/동아리 선택:</label>
          <select value={selectedGroupId} onChange={handleGroupChange} className="class-select-dropdown">
            {availableGroups.length > 0 ? (
              availableGroups.map(g => (
                <option key={g.id} value={g.id}>{g.label}</option>
              ))
            ) : (
              <option value="">정보 없음</option>
            )}
          </select>
        </div>
      </div>

      <div className="mission-content">
        {!currentMission ? (
          <div className="empty-mission-state">
            <div className="empty-icon">🌱</div>
            <h3>{selectedGroup ? `${selectedGroup.label}은 ` : ''}아직 진행 중인 미션이 없어요.</h3>
            <p>이 그룹만을 위한 특별한 목표와 보상을 정해보세요!</p>
            <button className="start-mission-btn" onClick={() => setIsModalOpen(true)} disabled={!selectedGroupId}>
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
              <div className="progress-section">
                <MissionProgressBar currentMission={currentMission} />
              </div>

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
