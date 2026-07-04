import React from 'react';

/**
 * BowlingTeamSummary
 * 팀전 모드가 활성화되었을 때, 팀별 점수와 평균, 순위를 요약하여 보여주는 컴포넌트입니다.
 */
function BowlingTeamSummary({ players }) {
  // 1. 플레이어 데이터 중 팀명이 입력된 사람들을 그룹화합니다.
  const teamsMap = {};

  players.forEach((player) => {
    // 팀명이 비어있지 않은 경우에만 팀 점수로 집계합니다.
    const teamName = player.team ? player.team.trim() : '';
    if (!teamName) return;

    if (!teamsMap[teamName]) {
      teamsMap[teamName] = {
        name: teamName,
        totalScore: 0,
        memberCount: 0,
      };
    }

    // 각 팀원의 프레임 계산 결과 중 최종 점수를 더합니다.
    // 아직 첫 프레임도 다 못 던진 경우는 총점이 0점입니다.
    const lastCalculatedFrame = [...player.frames]
      .reverse()
      .find((f) => f.score !== null);
    const score = lastCalculatedFrame ? lastCalculatedFrame.score : 0;

    teamsMap[teamName].totalScore += score;
    teamsMap[teamName].memberCount += 1;
  });

  const teamsList = Object.values(teamsMap);

  // 팀 정보가 전혀 없으면 요약 현황판을 표시하지 않습니다.
  if (teamsList.length === 0) {
    return (
      <div className="team-summary-empty">
        💡 플레이어 정보에 팀명(예: 1모둠)을 입력하면 팀전 현황판이 활성화됩니다.
      </div>
    );
  }

  // 2. 평균 점수를 구하고 순위를 정렬합니다.
  const processedTeams = teamsList.map((team) => ({
    ...team,
    average: team.memberCount > 0 ? (team.totalScore / team.memberCount).toFixed(1) : '0.0',
  }));

  // 평균 점수 기준 내림차순, 평균이 같으면 총점 기준 내림차순 정렬
  processedTeams.sort((a, b) => {
    const avgA = parseFloat(a.average);
    const avgB = parseFloat(b.average);
    if (avgB !== avgA) return avgB - avgA;
    return b.totalScore - a.totalScore;
  });

  return (
    <div className="team-summary-container">
      <h3 className="team-summary-title">🏆 모둠별 팀전 순위 현황</h3>
      <div className="team-cards-grid">
        {processedTeams.map((team, idx) => {
          // 1위, 2위, 3위 등에 어울리는 뱃지 부여
          const rank = idx + 1;
          const rankBadge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}등`;

          return (
            <div key={team.name} className={`team-summary-card rank-${rank}`}>
              <div className="team-card-header">
                <span className="team-rank-badge">{rankBadge}</span>
                <span className="team-card-name">{team.name}</span>
              </div>
              <div className="team-card-body">
                <div className="team-info-row">
                  <span>팀원 수:</span>
                  <strong>{team.memberCount}명</strong>
                </div>
                <div className="team-info-row">
                  <span>합산 총점:</span>
                  <strong>{team.totalScore}점</strong>
                </div>
                <div className="team-info-row">
                  <span>팀 평균:</span>
                  <strong className="team-avg-highlight">{team.average}점</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BowlingTeamSummary;
