import React, { useState } from 'react';
import './DicePage.css';

function DicePage() {
  const [numDice, setNumDice] = useState(1);
  const [diceValues, setDiceValues] = useState([1]);
  const [isRolling, setIsRolling] = useState(false);

  const rollDice = () => {
    if (isRolling) return;
    setIsRolling(true);

    // 굴러가는 애니메이션 효과를 위해 여러 번 값을 변경
    let rolls = 0;
    const maxRolls = 10;
    
    const rollInterval = setInterval(() => {
      setDiceValues(Array.from({ length: numDice }, () => Math.floor(Math.random() * 6) + 1));
      rolls++;
      
      if (rolls >= maxRolls) {
        clearInterval(rollInterval);
        setIsRolling(false);
      }
    }, 100);
  };

  const handleNumChange = (num) => {
    setNumDice(num);
    setDiceValues(Array.from({ length: num }, () => 1));
  };

  const renderDiceFace = (value) => {
    // 주사위 눈금 렌더링 (점 표시)
    const dots = {
      1: ['center'],
      2: ['top-left', 'bottom-right'],
      3: ['top-left', 'center', 'bottom-right'],
      4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
      6: ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right']
    };

    return (
      <div className={`dice-face ${isRolling ? 'rolling' : ''}`}>
        {dots[value].map((pos, idx) => (
          <span key={idx} className={`dot ${pos}`}></span>
        ))}
      </div>
    );
  };

  return (
    <div className="tool-page-container">
      <div className="dice-card">
        <h2 className="tool-title">🎲 주사위</h2>

        <div className="dice-controls">
          <span className="control-label">주사위 갯수:</span>
          <div className="num-selector">
            {[1, 2, 3].map(num => (
              <button 
                key={num} 
                className={`num-btn ${numDice === num ? 'active' : ''}`}
                onClick={() => handleNumChange(num)}
              >
                {num}개
              </button>
            ))}
          </div>
        </div>

        <div className="dice-container">
          {diceValues.map((val, idx) => (
            <div key={idx} className="dice-wrapper">
              {renderDiceFace(val)}
            </div>
          ))}
        </div>

        {!isRolling && diceValues.length > 1 && (
          <div className="dice-sum">
            합계: {diceValues.reduce((a, b) => a + b, 0)}
          </div>
        )}

        <button 
          className="roll-btn control-btn start-btn" 
          onClick={rollDice}
          disabled={isRolling}
        >
          {isRolling ? '굴리는 중...' : '주사위 굴리기'}
        </button>
      </div>
    </div>
  );
}

export default DicePage;
