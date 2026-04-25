import React, { useState, useEffect, useMemo } from 'react';
import './MissionPage.css';
import MissionSettingModal from '../components/mission/MissionSettingModal';
import MissionProgressBar from '../components/mission/MissionProgressBar';
import { useModal } from '../components/common/GlobalModal';
import { useAllStudents } from '../hooks/useAllStudents';
import { db } from '../firebase/config';
import { doc, onSnapshot, setDoc, deleteDoc, updateDoc, increment } from 'firebase/firestore';

function MissionPage() {
  const { showConfirm, showAlert } = useModal();
  const { students, currentUser } = useAllStudents();
  
  const [selectedClass, setSelectedClass] = useState('');
  const [currentMission, setCurrentMission] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // 1. 학생 데이터에서 학급 목록 추출
  const availableClasses = useMemo(() => {
    if (!students || students.length === 0) return [];
    
    const classSet = new Set();
    students.forEach(s => {
      if (s.grade && s.class_number) {
        classSet.add(`${s.grade}-${s.class_number}`);
      }
    });

    return Array.from(classSet).sort((a, b) => {
      const [ga, ca] = a.split('-').map(Number);
      const [gb, cb] = b.split('-').map(Number);
      return ga !== gb ? ga - gb : ca - cb;
    });
  }, [students]);

  // 2. 초기 학급 선택 및 변경 대응
  useEffect(() => {
    if (availableClasses.length > 0 && !selectedClass) {
      setSelectedClass(availableClasses[0]);
    }
  }, [availableClasses, selectedClass]);

  // 3. Firebase 미션 데이터 실시간 감시
  useEffect(() => {
    if (!currentUser || !selectedClass) return;

    const missionRef = doc(db, 'users', currentUser.uid, 'missions', selectedClass);
    const unsubscribe = onSnapshot(missionRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentMission(data);
        
        // 달성 시 효과
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
  }, [currentUser, selectedClass]);

  const handleClassChange = (e) => {
    setSelectedClass(e.target.value);
  };

  const handleSaveMission = async (newMission) => {
    if (!currentUser || !selectedClass) return;

    try {
      const missionRef = doc(db, 'users', currentUser.uid, 'missions', selectedClass);
      await setDoc(missionRef, {
        ...newMission,
        classId: selectedClass,
        updatedAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      showAlert(`${selectedClass.split('-')[0]}학년 ${selectedClass.split('-')[1]}반의 새로운 미션이 시작되었습니다!`, '미션 등록');
    } catch (error) {
      console.error("Save mission error:", error);
      showAlert('미션 저장 중 오류가 발생했습니다.', '오류', 'error');
    }
  };

  const handleUpdateScore = async (amount) => {
    if (!currentMission || !currentUser || !selectedClass) return;
    
    // 이미 달성한 경우 추가 점수 제한 (감점은 허용)
    if (amount > 0 && currentMission.currentScore >= currentMission.targetScore) {
       return;
    }

    try {
      const missionRef = doc(db, 'users', currentUser.uid, 'missions', selectedClass);
      await updateDoc(missionRef, {
        currentScore: increment(amount),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Update score error:", error);
    }
  };

  const handleClearMission = () => {
    if (!currentUser || !selectedClass) return;

    showConfirm('현재 진행 중인 미션을 종료하고 삭제하시겠습니까? (점수가 모두 초기화됩니다)', async () => {
      try {
        const missionRef = doc(db, 'users', currentUser.uid, 'missions', selectedClass);
        await deleteDoc(missionRef);
        showAlert('미션이 종료되었습니다.', '알림');
      } catch (error) {
        console.error("Delete mission error:", error);
      }
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
            {availableClasses.length > 0 ? (
              availableClasses.map(c => {
                const [g, n] = c.split('-');
                return <option key={c} value={c}>{g}학년 {n}반</option>;
              })
            ) : (
              <option value="">학급 정보 없음</option>
            )}
          </select>
        </div>
      </div>

      <div className="mission-content">
        {!currentMission ? (
          <div className="empty-mission-state">
            <div className="empty-icon">🌱</div>
            <h3>{selectedClass ? `${selectedClass.split('-')[0]}학년 ${selectedClass.split('-')[1]}반은 ` : ''}아직 진행 중인 미션이 없어요.</h3>
            <p>우리 반만의 특별한 목표와 보상을 정해보세요!</p>
            <button className="start-mission-btn" onClick={() => setIsModalOpen(true)} disabled={!selectedClass}>
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
              {/* 왼쪽: 온도계 프로그레스 */}
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
