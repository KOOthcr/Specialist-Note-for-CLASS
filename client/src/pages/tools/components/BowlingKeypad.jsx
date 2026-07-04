import React from 'react';

/**
 * BowlingKeypad
 * 핀 점수 입력을 위한 모바일 친화형 키패드 컴포넌트입니다.
 */
function BowlingKeypad({
  maxPins,
  onInputPin,
  onUndo,
  onClear,
  onSkip,
  activeRollIdx,
  currentRolls,
  frameIdx,
}) {
  // 0점부터 10점까지의 버튼 리스트를 정의합니다.
  const pinButtons = Array.from({ length: 11 }, (_, i) => i);

  // 스페어 처리가 가능한 상황인지 판별하는 함수
  const isSpareOpportunity = (pinValue) => {
    if (frameIdx < 9) {
      // 1~9프레임의 2구째 투구인 경우
      if (activeRollIdx === 1) {
        const firstRoll = currentRolls[0] || 0;
        return firstRoll + pinValue === 10;
      }
    } else {
      // 10프레임인 경우
      if (activeRollIdx === 1) {
        const firstRoll = currentRolls[0] || 0;
        // 첫 구가 스트라이크가 아니었고, 첫 구 + 이번 구의 합이 10인 경우 스페어
        return firstRoll !== 10 && firstRoll + pinValue === 10;
      }
      if (activeRollIdx === 2) {
        const firstRoll = currentRolls[0] || 0;
        const secondRoll = currentRolls[1] || 0;
        // 첫 구가 스트라이크이고 두 번째 구가 스트라이크가 아니었으며, 2구 + 3구 합이 10인 경우 스페어
        if (firstRoll === 10 && secondRoll !== 10) {
          return secondRoll + pinValue === 10;
        }
      }
    }
    return false;
  };

  return (
    <div className="bowling-keypad-container">
      {/* 1. 메인 핀 입력 버튼 패널 */}
      <div className="pins-grid">
        {pinButtons.map((pin) => {
          // 현재 입력 포지션에서 넘어설 수 없는 핀 개수인 경우 비활성화
          const isDisabled = pin > maxPins;
          const isSpare = isSpareOpportunity(pin);
          
          // 스트라이크(10점) 및 스페어(/) 텍스트 커스텀
          let buttonText = pin.toString();
          let buttonClass = 'pin-btn';
          
          if (pin === 10) {
            buttonText = 'X (스트라이크)';
            buttonClass += ' strike-btn';
          } else if (isSpare) {
            buttonText = `${pin} (/)`;
            buttonClass += ' spare-btn';
          } else if (pin === 0) {
            buttonText = '- (거터)';
            buttonClass += ' gutter-btn';
          }

          return (
            <button
              key={pin}
              className={buttonClass}
              onClick={() => onInputPin(pin)}
              disabled={isDisabled}
            >
              {buttonText}
            </button>
          );
        })}
      </div>

      {/* 2. 보조 제어 기능 버튼 패널 (Undo, Clear, Skip) */}
      <div className="control-buttons-panel">
        <button className="control-action-btn undo-btn" onClick={onUndo} title="방금 입력한 점수 취소">
          ↩️ 입력 되돌리기
        </button>
        <button className="control-action-btn clear-btn" onClick={onClear} title="현재 셀의 값 지우기">
          ✕ 값 지우기
        </button>
        <button className="control-action-btn skip-btn" onClick={onSkip} title="현재 투구를 건너뛰고 다음으로 이동">
          ➔ 건너뛰기
        </button>
      </div>
    </div>
  );
}

export default BowlingKeypad;
