import React from 'react';
import { getDisplayRoll } from '../utils/bowlingUtils';

/**
 * BowlingTable
 * 플레이어 목록과 10프레임 점수 기록 테이블을 렌더링합니다.
 */
function BowlingTable({
  players,
  activePlayerId,
  activeFrameIdx,
  activeRollIdx,
  onCellClick,
  onNameChange,
  onTeamChange,
  onRemovePlayer,
  isTeamMode,
}) {
  // 프레임 헤더 생성 (1프레임 ~ 10프레임)
  const frameHeaders = Array.from({ length: 10 }, (_, i) => `${i + 1}`);

  return (
    <div className="bowling-table-wrapper">
      <table className="bowling-table">
        <thead>
          <tr>
            <th className="col-remove"></th>
            {isTeamMode && <th className="col-team">소속 모둠</th>}
            <th className="col-name">이름</th>
            {frameHeaders.map((f, idx) => (
              <th key={idx} className={`col-frame ${idx === 9 ? 'frame-10' : ''}`}>
                {f}
              </th>
            ))}
            <th className="col-total">총점</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            // 해당 플레이어의 최종 점수를 구합니다 (최지막 계산 완료된 프레임 점수)
            const lastFrameWithScore = [...player.frames]
              .reverse()
              .find((f) => f.score !== null);
            const totalScore = lastFrameWithScore ? lastFrameWithScore.score : 0;

            return (
              <tr key={player.id} className={player.id === activePlayerId ? 'active-player-row' : ''}>
                {/* 1. 플레이어 삭제 버튼 */}
                <td className="cell-remove">
                  <button
                    className="remove-player-btn"
                    onClick={() => onRemovePlayer(player.id)}
                    title="플레이어 삭제"
                  >
                    ✕
                  </button>
                </td>

                {/* 2. 소속 팀 입력란 (팀전 모드 전용) */}
                {isTeamMode && (
                  <td className="cell-team">
                    <input
                      type="text"
                      className="table-input team-input"
                      value={player.team || ''}
                      onChange={(e) => onTeamChange(player.id, e.target.value)}
                      placeholder="팀명"
                    />
                  </td>
                )}

                {/* 3. 이름 입력란 */}
                <td className="cell-name">
                  <input
                    type="text"
                    className="table-input name-input"
                    value={player.name || ''}
                    onChange={(e) => onNameChange(player.id, e.target.value)}
                    placeholder="이름"
                  />
                </td>

                {/* 4. 1~10프레임 점수 칸 */}
                {player.frames.map((frame, fIdx) => {
                  const is10Frame = fIdx === 9;
                  const rollsCount = is10Frame ? 3 : 2;

                  return (
                    <td key={fIdx} className={`cell-frame ${is10Frame ? 'frame-10-cell' : ''}`}>
                      {/* 프레임 상단: 각 투구별 점수/기호 박스 */}
                      <div className="rolls-container">
                        {Array.from({ length: rollsCount }).map((_, rIdx) => {
                          const isActive =
                            player.id === activePlayerId &&
                            fIdx === activeFrameIdx &&
                            rIdx === activeRollIdx;

                          const displaySymbol = getDisplayRoll(frame.rolls, fIdx, rIdx);

                          return (
                            <div
                              key={rIdx}
                              className={`roll-box ${isActive ? 'active-roll' : ''} ${
                                frame.rolls[rIdx] === 10 ? 'strike-box' : ''
                              }`}
                              onClick={() => onCellClick(player.id, fIdx, rIdx)}
                            >
                              {displaySymbol}
                            </div>
                          );
                        })}
                      </div>

                      {/* 프레임 하단: 해당 프레임까지의 누적 점수 */}
                      <div className="frame-score">
                        {frame.score !== null ? frame.score : ''}
                      </div>
                    </td>
                  );
                })}

                {/* 5. 총점 */}
                <td className="cell-total-score">
                  <span className="total-score-badge">{totalScore}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default BowlingTable;
