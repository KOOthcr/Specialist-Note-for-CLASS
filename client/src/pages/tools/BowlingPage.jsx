import React, { useState } from 'react';
import './BowlingPage.css';
import { useModal } from '../../components/common/GlobalModal';
import { calculateFrameScores, getAvailablePins, createEmptyFrames } from './utils/bowlingUtils';
import BowlingTable from './components/BowlingTable';
import BowlingKeypad from './components/BowlingKeypad';
import BowlingTeamSummary from './components/BowlingTeamSummary';

function BowlingPage() {
  const { showConfirm } = useModal();

  // 1. 상태 정의
  const [players, setPlayers] = useState([
    { id: 1, name: '학생 1', team: '1모둠', frames: createEmptyFrames() },
    { id: 2, name: '학생 2', team: '2모둠', frames: createEmptyFrames() },
  ]);
  const [activePlayerId, setActivePlayerId] = useState(1);
  const [activeFrameIdx, setActiveFrameIdx] = useState(0);
  const [activeRollIdx, setActiveRollIdx] = useState(0);
  const [switchMode, setSwitchMode] = useState('shot'); // 'shot' | 'frame' | 'manual'
  const [isTeamMode, setIsTeamMode] = useState(true);
  const [history, setHistory] = useState([]); // Undo를 위한 이력 저장소

  // 2. 플레이어 추가 및 제거
  const handleAddPlayer = () => {
    setPlayers((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: `학생 ${prev.length + 1}`,
        team: isTeamMode ? `${Math.ceil((prev.length + 1) / 2)}모둠` : '',
        frames: createEmptyFrames(),
      },
    ]);
  };

  const handleRemovePlayer = (id) => {
    if (players.length <= 1) return;
    setPlayers((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      if (activePlayerId === id) setActivePlayerId(filtered[0].id);
      return filtered;
    });
  };

  // 3. 플레이어 정보 수정
  const handleNameChange = (id, newName) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, name: newName } : p)));
  };

  const handleTeamChange = (id, newTeam) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, team: newTeam } : p)));
  };

  // 4. 수동 포커스 선택
  const handleCellClick = (playerId, frameIdx, rollIdx) => {
    setActivePlayerId(playerId);
    setActiveFrameIdx(frameIdx);
    setActiveRollIdx(rollIdx);
  };

  // 5. 다음 포커스 이동 로직 (보조 헬퍼)
  const getNextPos = (currentPlayers, pId, fIdx, rIdx, val) => {
    const is10 = fIdx === 9;
    const isStrike = val === 10;
    const pIdx = currentPlayers.findIndex((p) => p.id === pId);
    const rolls = currentPlayers[pIdx].frames[fIdx].rolls;
    const first = rolls[0] || 0;

    let finished = !is10 ? (isStrike || rIdx === 1) : (rIdx === 2 || (rIdx === 1 && first !== 10 && first + (val || 0) !== 10));
    const nextPIdx = (pIdx + 1) % currentPlayers.length;
    const nextPId = currentPlayers[nextPIdx].id;

    if (switchMode === 'manual') {
      return finished ? { pId, fIdx: Math.min(9, fIdx + 1), rIdx: 0 } : { pId, fIdx, rIdx: rIdx + 1 };
    }
    if (switchMode === 'frame') {
      if (finished) {
        const isLast = pIdx === currentPlayers.length - 1;
        return isLast ? { pId: currentPlayers[0].id, fIdx: Math.min(9, fIdx + 1), rIdx: 0 } : { pId: nextPId, fIdx, rIdx: 0 };
      }
      return { pId, fIdx, rIdx: rIdx + 1 };
    }
    // 'shot' 모드 (투구 교대)
    const isLast = pIdx === currentPlayers.length - 1;
    if (finished) {
      return isLast ? { pId: currentPlayers[0].id, fIdx: Math.min(9, fIdx + 1), rIdx: 0 } : { pId: nextPId, fIdx, rIdx: 0 };
    }
    return isLast ? { pId: currentPlayers[0].id, fIdx, rIdx: rIdx + 1 } : { pId: nextPId, fIdx, rIdx };
  };

  // 포커스 자동 보정 (유효하지 않은 투구 칸 건너뛰기)
  const getValidFocus = (currentPlayers, startPos) => {
    let { pId, fIdx, rIdx } = startPos;
    for (let i = 0; i < 20; i++) {
      const player = currentPlayers.find((p) => p.id === pId);
      if (!player) break;
      const is10 = fIdx === 9;
      // 10프레임 3구 기회 체크
      if (is10 && rIdx === 2) {
        const f = player.frames[fIdx].rolls[0];
        const s = player.frames[fIdx].rolls[1];
        if (f !== 10 && (f || 0) + (s || 0) !== 10) {
          const next = getNextPos(currentPlayers, pId, fIdx, rIdx, null);
          pId = next.pId; fIdx = next.fIdx; rIdx = next.rIdx;
          continue;
        }
      }
      // 1~9프레임 스트라이크 시 2구 체크
      if (!is10 && rIdx === 1 && player.frames[fIdx].rolls[0] === 10) {
        const next = getNextPos(currentPlayers, pId, fIdx, rIdx, null);
        pId = next.pId; fIdx = next.fIdx; rIdx = next.rIdx;
        continue;
      }
      break;
    }
    return { pId, fIdx, rIdx };
  };

  // 6. 점수 입력 제어 핸들러
  const handleInputPin = (pinValue) => {
    setHistory((prev) => [...prev, { players: JSON.parse(JSON.stringify(players)), activePlayerId, activeFrameIdx, activeRollIdx }]);
    setPlayers((prev) => {
      const updated = prev.map((p) => {
        if (p.id !== activePlayerId) return p;
        const newFrames = p.frames.map((f, idx) => {
          if (idx !== activeFrameIdx) return f;
          const newRolls = [...f.rolls];
          newRolls[activeRollIdx] = pinValue;
          return { ...f, rolls: newRolls };
        });
        return { ...p, frames: calculateFrameScores(newFrames) };
      });

      const rawNext = getNextPos(updated, activePlayerId, activeFrameIdx, activeRollIdx, pinValue);
      const validNext = getValidFocus(updated, rawNext);
      setActivePlayerId(validNext.pId);
      setActiveFrameIdx(validNext.fIdx);
      setActiveRollIdx(validNext.rIdx);

      return updated;
    });
  };

  // 7. 제어 제어 기능 (Undo, Clear, Skip)
  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setPlayers(last.players);
    setActivePlayerId(last.activePlayerId);
    setActiveFrameIdx(last.activeFrameIdx);
    setActiveRollIdx(last.activeRollIdx);
    setHistory((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPlayers((prev) => prev.map((p) => {
      if (p.id !== activePlayerId) return p;
      const newFrames = p.frames.map((f, idx) => {
        if (idx !== activeFrameIdx) return f;
        const newRolls = [...f.rolls];
        newRolls[activeRollIdx] = null;
        return { ...f, rolls: newRolls };
      });
      return { ...p, frames: calculateFrameScores(newFrames) };
    }));
  };

  const handleSkip = () => {
    const rawNext = getNextPos(players, activePlayerId, activeFrameIdx, activeRollIdx, null);
    const validNext = getValidFocus(players, rawNext);
    setActivePlayerId(validNext.pId);
    setActiveFrameIdx(validNext.fIdx);
    setActiveRollIdx(validNext.rIdx);
  };

  // 8. 플레이어 정렬 및 리셋
  const handleSortPlayers = () => {
    setPlayers((prev) => [...prev].sort((a, b) => {
      const getScore = (p) => {
        const last = [...p.frames].reverse().find((f) => f.score !== null);
        return last ? last.score : 0;
      };
      return getScore(b) - getScore(a);
    }));
  };

  const handleResetAll = () => {
    showConfirm('점수판 전체를 초기화하시겠습니까? 기록이 모두 지워집니다.', () => {
      setPlayers((prev) => prev.map((p) => ({ ...p, frames: createEmptyFrames() })));
      setActivePlayerId(players[0].id);
      setActiveFrameIdx(0);
      setActiveRollIdx(0);
      setHistory([]);
    });
  };

  const activePlayer = players.find((p) => p.id === activePlayerId) || players[0];
  const maxPins = getAvailablePins(activePlayer.frames[activeFrameIdx].rolls, activeFrameIdx, activeRollIdx);

  return (
    <div className="tool-page-container">
      <div className="bowling-container">
        {/* 상단 설정 툴바 */}
        <div className="bowling-settings-toolbar">
          <div className="setting-controls">
            <button className="tb-btn add-btn" onClick={handleAddPlayer}>➕ 플레이어 추가</button>
            <button className="tb-btn sort-btn" onClick={handleSortPlayers}>🏆 순위 정렬</button>
            <button className="tb-btn reset-btn" onClick={handleResetAll}>🔄 전체 초기화</button>
          </div>
          <div className="mode-controls">
            <label className="toggle-container">
              <span>팀전 모드</span>
              <input type="checkbox" checked={isTeamMode} onChange={(e) => setIsTeamMode(e.target.checked)} />
            </label>
            <div className="select-container">
              <span>순서 전환:</span>
              <select value={switchMode} onChange={(e) => setSwitchMode(e.target.value)}>
                <option value="shot">투구별 전환 (교대)</option>
                <option value="frame">프레임별 전환</option>
                <option value="manual">수동 선택</option>
              </select>
            </div>
          </div>
        </div>

        {/* 팀전 현황판 (팀전 모드 활성화 시에만 렌더링) */}
        {isTeamMode && <BowlingTeamSummary players={players} />}

        {/* 메인 점수판 테이블 */}
        <BowlingTable
          players={players}
          activePlayerId={activePlayerId}
          activeFrameIdx={activeFrameIdx}
          activeRollIdx={activeRollIdx}
          onCellClick={handleCellClick}
          onNameChange={handleNameChange}
          onTeamChange={handleTeamChange}
          onRemovePlayer={handleRemovePlayer}
          isTeamMode={isTeamMode}
        />

        {/* 하단 입력 키패드 */}
        <div className="keypad-section-wrapper">
          <div className="active-indicator">
            🎯 현재 입력: <strong className="highlight-text">{activePlayer.name}</strong> 님의{' '}
            <strong className="highlight-text">{activeFrameIdx + 1}프레임 {activeRollIdx + 1}구째</strong>
          </div>
          <BowlingKeypad
            maxPins={maxPins}
            onInputPin={handleInputPin}
            onUndo={handleUndo}
            onClear={handleClear}
            onSkip={handleSkip}
            activeRollIdx={activeRollIdx}
            currentRolls={activePlayer.frames[activeFrameIdx].rolls}
            frameIdx={activeFrameIdx}
          />
        </div>
      </div>
    </div>
  );
}

export default BowlingPage;
