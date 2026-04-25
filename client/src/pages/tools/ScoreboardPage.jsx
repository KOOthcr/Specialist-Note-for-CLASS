import React, { useState, useEffect } from 'react';
import './ScoreboardPage.css';
import { useModal } from '../../components/common/GlobalModal';

function ScoreboardPage() {
  const { showAlert } = useModal();
  
  // 설정 상태
  const [settings, setSettings] = useState({
    increment: 1,
    allowDecrement: true,
    numTeams: 2,
    showNames: true
  });

  // 팀 데이터 상태
  const [teams, setTeams] = useState([]);

  // 60가지 색상 생성 (HSL 활용)
  const generateColors = (count) => {
    return Array.from({ length: count }, (_, i) => `hsl(${(i * 360) / count}, 70%, 50%)`);
  };
  const colors = generateColors(60);

  // 팀 수 변경 시 데이터 동기화
  useEffect(() => {
    setTeams(prev => {
      const newTeams = [...prev];
      if (newTeams.length < settings.numTeams) {
        // 팀 추가
        for (let i = newTeams.length; i < settings.numTeams; i++) {
          newTeams.push({
            id: i + 1,
            name: `${i + 1}팀`,
            score: 0,
            sets: 0,
            color: colors[i % colors.length]
          });
        }
      } else if (newTeams.length > settings.numTeams) {
        // 팀 제거
        return newTeams.slice(0, settings.numTeams);
      }
      return newTeams;
    });
  }, [settings.numTeams]);

  // 점수 변경 함수
  const handleScoreChange = (teamId, delta) => {
    setTeams(prev => prev.map(team => {
      if (team.id === teamId) {
        const newScore = Math.max(0, team.score + delta);
        return { ...team, score: newScore };
      }
      return team;
    }));
  };

  // 세트 포인트 변경 함수
  const handleSetChange = (teamId, delta) => {
    setTeams(prev => prev.map(team => {
      if (team.id === teamId) {
        const newSets = Math.max(0, team.sets + delta);
        return { ...team, sets: newSets };
      }
      return team;
    }));
  };

  // 팀 이름 변경 함수
  const handleNameChange = (teamId, newName) => {
    setTeams(prev => prev.map(team => {
      if (team.id === teamId) {
        return { ...team, name: newName };
      }
      return team;
    }));
  };

  // 전체 초기화
  const resetAll = () => {
    setTeams(prev => prev.map(team => ({ ...team, score: 0, sets: 0 })));
  };

  return (
    <div className="tool-page-container">
      <div className="scoreboard-container">
        
        {/* 점수판 설정 바 */}
        <div className="scoreboard-settings">
          <div className="setting-group">
            <span className="setting-label">증가량:</span>
            <input 
              type="number" 
              className="setting-input" 
              value={settings.increment}
              onChange={(e) => setSettings({ ...settings, increment: Math.min(1000, Number(e.target.value)) })}
            />
          </div>

          <div className="setting-group">
            <span className="setting-label">팀 수:</span>
            <input 
              type="number" 
              className="setting-input" 
              value={settings.numTeams}
              min="1"
              max="60"
              onChange={(e) => setSettings({ ...settings, numTeams: Math.min(60, Math.max(1, Number(e.target.value))) })}
            />
          </div>

          <div className="setting-group">
            <span className="setting-label">감점 허용:</span>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings.allowDecrement}
                onChange={(e) => setSettings({ ...settings, allowDecrement: e.target.checked })}
              />
              <span className="slider"></span>
            </label>
          </div>

          <button className="reset-all-btn" onClick={resetAll}>🔄 전체 초기화</button>
        </div>

        {/* 점수판 메인 그리드 */}
        <div className="scoreboard-grid">
          {teams.map(team => (
            <div 
              key={team.id} 
              className="team-card" 
              style={{ borderTopColor: team.color }}
            >
              {settings.showNames && (
                <input 
                  className="team-name-input"
                  value={team.name}
                  onChange={(e) => handleNameChange(team.id, e.target.value)}
                  placeholder="팀 이름"
                />
              )}

              <div className="score-display-wrapper">
                {settings.allowDecrement && (
                  <button 
                    className="control-btn-circle btn-minus"
                    onClick={() => handleScoreChange(team.id, -settings.increment)}
                    disabled={team.score <= 0}
                  >
                    -
                  </button>
                )}
                
                <input 
                  type="number"
                  className="score-number"
                  value={team.score}
                  onChange={(e) => handleScoreChange(team.id, Number(e.target.value) - team.score)}
                />

                <button 
                  className="control-btn-circle btn-plus"
                  onClick={() => handleScoreChange(team.id, settings.increment)}
                >
                  +
                </button>
              </div>

              {/* 세트 포인트 */}
              <div className="set-point-container">
                <span className="set-point-label">SET POINT</span>
                <div className="set-point-value">
                  <span className="set-btn" onClick={() => handleSetChange(team.id, -1)}>‹</span>
                  <span className="set-number">{team.sets}</span>
                  <span className="set-btn" onClick={() => handleSetChange(team.id, 1)}>›</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

export default ScoreboardPage;
