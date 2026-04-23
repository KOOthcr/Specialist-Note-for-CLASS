import React, { useState } from 'react';
import './CoinPage.css';

function CoinPage() {
  const [result, setResult] = useState('앞면');
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipCount, setFlipCount] = useState(0);

  const flipCoin = () => {
    if (isFlipping) return;
    
    setIsFlipping(true);
    setFlipCount(prev => prev + 1);
    
    // 1초 애니메이션 후 결과 결정
    setTimeout(() => {
      const isHeads = Math.random() < 0.5;
      setResult(isHeads ? '앞면' : '뒷면');
      setIsFlipping(false);
    }, 1000);
  };

  return (
    <div className="tool-page-container">
      <div className="coin-card">
        <h2 className="tool-title">🪙 동전던지기</h2>

        <div className="coin-container">
          <div className={`coin ${isFlipping ? 'flipping' : ''} ${result === '뒷면' ? 'tails' : 'heads'}`}>
            <div className="coin-face coin-front">
              앞면
            </div>
            <div className="coin-face coin-back">
              뒷면
            </div>
          </div>
        </div>

        <div className="coin-result">
          {isFlipping ? '던지는 중...' : flipCount > 0 ? `결과: ${result}` : '동전을 던져보세요!'}
        </div>

        <button 
          className="control-btn start-btn" 
          onClick={flipCoin}
          disabled={isFlipping}
          style={{ maxWidth: '300px', width: '100%', padding: '16px' }}
        >
          던지기
        </button>
      </div>
    </div>
  );
}

export default CoinPage;
