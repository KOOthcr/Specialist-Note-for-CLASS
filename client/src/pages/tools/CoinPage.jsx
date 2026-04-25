import React, { useState, useRef } from 'react';
import './CoinPage.css';

function CoinPage() {
  const [result, setResult] = useState('앞면');
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipCount, setFlipCount] = useState(0);
  const audioCtxRef = useRef(null);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playFlipSound = () => {
    try {
      const audioCtx = getAudioCtx();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1500, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (e) {}
  };

  const playResultSound = () => {
    try {
      const audioCtx = getAudioCtx();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {}
  };

  const flipCoin = () => {
    if (isFlipping) return;
    
    setIsFlipping(true);
    setFlipCount(prev => prev + 1);
    playFlipSound(); 
    
    setTimeout(() => {
      const isHeads = Math.random() < 0.5;
      setResult(isHeads ? '앞면' : '뒷면');
      setIsFlipping(false);
      playResultSound(); 
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
          className="coin-flip-btn" 
          onClick={flipCoin}
          disabled={isFlipping}
        >
          {isFlipping ? '던지는 중...' : '동전 던지기'}
        </button>
      </div>
    </div>
  );
}

export default CoinPage;
