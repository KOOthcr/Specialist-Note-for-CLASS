/**
 * bowlingUtils.js
 * 볼링 점수 계산 및 입력 규칙 제어에 필요한 유틸리티 함수 모음입니다.
 * 초보 프로그래머를 위해 각 함수에 설명 주석을 상세히 달았습니다.
 */

// 1. 각 프레임의 누적 점수를 계산하여 반환하는 함수
export function calculateFrameScores(frames) {
  // 투구(pins) 정보를 순차적으로 담을 1차원 배열 생성
  const flatRolls = [];
  
  // 1~9프레임과 10프레임의 투구를 차례대로 flatRolls에 모읍니다.
  for (let i = 0; i < 10; i++) {
    const r = frames[i].rolls;
    if (i < 9) {
      // 1~9프레임의 경우, 스트라이크(10점)이면 1구만 flatRolls에 넣습니다.
      if (r[0] === 10) {
        flatRolls.push(10);
      } else {
        if (r[0] !== null) flatRolls.push(r[0]);
        if (r[1] !== null) flatRolls.push(r[1]);
      }
    } else {
      // 10프레임은 최대 3구까지 던진 점수를 모두 넣습니다.
      if (r[0] !== null) flatRolls.push(r[0]);
      if (r[1] !== null) flatRolls.push(r[1]);
      if (r[2] !== null) flatRolls.push(r[2]);
    }
  }

  // 계산을 위해 기존 프레임 구조를 복사하여 준비합니다.
  const newFrames = frames.map(f => ({ ...f, rolls: [...f.rolls], score: null }));
  let rollIdx = 0;
  let accumulatedScore = 0;

  for (let i = 0; i < 10; i++) {
    if (rollIdx >= flatRolls.length) break;

    if (i < 9) {
      // 1~9프레임 계산 규칙
      if (flatRolls[rollIdx] === 10) {
        // 스트라이크: 10점 + 다음 2구의 점수를 더함
        if (rollIdx + 2 < flatRolls.length) {
          accumulatedScore += 10 + flatRolls[rollIdx + 1] + flatRolls[rollIdx + 2];
          newFrames[i].score = accumulatedScore;
        }
        rollIdx += 1;
      } else if (flatRolls[rollIdx] + (flatRolls[rollIdx + 1] || 0) === 10) {
        // 스페어: 10점 + 다음 1구의 점수를 더함
        if (rollIdx + 2 < flatRolls.length) {
          accumulatedScore += 10 + flatRolls[rollIdx + 2];
          newFrames[i].score = accumulatedScore;
        }
        rollIdx += 2;
      } else {
        // 오픈 프레임: 두 투구의 점수만 합산
        if (rollIdx + 1 < flatRolls.length) {
          accumulatedScore += flatRolls[rollIdx] + flatRolls[rollIdx + 1];
          newFrames[i].score = accumulatedScore;
        }
        rollIdx += 2;
      }
    } else {
      // 10프레임 계산 규칙
      const r0 = flatRolls[rollIdx];
      const r1 = flatRolls[rollIdx + 1];
      const r2 = flatRolls[rollIdx + 2];

      const isStrike = r0 === 10;
      const isSpare = !isStrike && (r0 + r1 === 10);

      if (isStrike || isSpare) {
        // 스트라이크나 스페어면 3구까지 점수가 모두 있어야 완료
        if (r0 !== undefined && r1 !== undefined && r2 !== undefined) {
          accumulatedScore += r0 + r1 + r2;
          newFrames[i].score = accumulatedScore;
        }
      } else {
        // 오픈 프레임이면 2구만 던지고 완료
        if (r0 !== undefined && r1 !== undefined) {
          accumulatedScore += r0 + r1;
          newFrames[i].score = accumulatedScore;
        }
      }
    }
  }

  return newFrames;
}

// 2. 현재 입력 포지션에서 입력 가능한 최대 핀 개수를 구하는 함수
export function getAvailablePins(rolls, frameIdx, rollIdx) {
  if (frameIdx < 9) {
    // 1~9프레임
    if (rollIdx === 0) return 10;
    // 2구째는 10에서 1구째 쓰러뜨린 핀 수만큼 제외한 나머지만 입력 가능
    const firstRoll = rolls[0] || 0;
    return 10 - firstRoll;
  } else {
    // 10프레임
    if (rollIdx === 0) return 10;
    if (rollIdx === 1) {
      const firstRoll = rolls[0] || 0;
      // 첫 구가 스트라이크였다면 2구도 10핀 다 칠 수 있음
      if (firstRoll === 10) return 10;
      return 10 - firstRoll;
    }
    // 3구째 (보너스 구)
    const firstRoll = rolls[0] || 0;
    const secondRoll = rolls[1] || 0;
    // 첫 구 스트라이크 & 두 번째 스트라이크면 3구는 10핀 가능
    if (firstRoll === 10 && secondRoll === 10) return 10;
    // 첫 구 스트라이크 & 두 번째 스트라이크가 아니면 (10 - 2구)
    if (firstRoll === 10 && secondRoll < 10) return 10 - secondRoll;
    // 첫 구 + 두 번째 합이 스페어(10핀)면 3구는 10핀 가능
    if (firstRoll + secondRoll === 10) return 10;
    return 0; // 스페어/스트라이크 실패 시 3구 기회 없음
  }
}

// 3. 점수판 셀에 표시할 텍스트 기호를 구하는 함수
export function getDisplayRoll(rolls, frameIdx, rollIdx) {
  const val = rolls[rollIdx];
  if (val === null || val === undefined) return '';
  
  if (frameIdx < 9) {
    if (rollIdx === 0) {
      return val === 10 ? 'X' : (val === 0 ? '-' : val.toString());
    } else {
      const first = rolls[0] || 0;
      if (first + val === 10) return '/';
      return val === 0 ? '-' : val.toString();
    }
  } else {
    // 10프레임
    if (rollIdx === 0) {
      return val === 10 ? 'X' : (val === 0 ? '-' : val.toString());
    }
    if (rollIdx === 1) {
      const first = rolls[0] || 0;
      if (first === 10) {
        return val === 10 ? 'X' : (val === 0 ? '-' : val.toString());
      }
      if (first + val === 10) return '/';
      return val === 0 ? '-' : val.toString();
    }
    // 3구째
    const first = rolls[0] || 0;
    const second = rolls[1] || 0;
    
    // 두 번째 구가 스페어 혹은 스트라이크이고 세 번째가 10이면 X, 아니면 일반 숫자
    if (first === 10 && second === 10) {
      return val === 10 ? 'X' : (val === 0 ? '-' : val.toString());
    }
    if (first === 10 && second < 10) {
      if (second + val === 10) return '/';
      return val === 0 ? '-' : val.toString();
    }
    if (first + second === 10) {
      return val === 10 ? 'X' : (val === 0 ? '-' : val.toString());
    }
    return val === 0 ? '-' : val.toString();
  }
}

// 4. 초기 빈 프레임 세트를 생성하는 함수 (1~9프레임은 2구, 10프레임은 3구)
export function createEmptyFrames() {
  return Array.from({ length: 10 }, (_, i) => ({
    rolls: i === 9 ? [null, null, null] : [null, null],
    score: null,
  }));
}

