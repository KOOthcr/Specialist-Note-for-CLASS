import React, { useState, useRef } from 'react';
import './RoulettePage.css';
import { useModal } from '../../components/common/GlobalModal';

function RoulettePage() {
  const { showAlert } = useModal();
  const [items, setItems] = useState(['1모둠', '2모둠', '3모둠', '4모둠', '5모둠', '6모둠']);
  const [inputValue, setInputValue] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const wheelRef = useRef(null);

  // 기본 색상 팔레트
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FDCB6E', 
    '#6C5CE7', '#FF8ED4', '#00B894', '#E17055'
  ];

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    if (items.includes(inputValue.trim())) {
      showAlert('이미 존재하는 항목입니다.', '알림');
      return;
    }
    setItems([...items, inputValue.trim()]);
    setInputValue('');
    setResult(null);
  };

  const handleRemoveItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
    setResult(null);
  };

  // 효과음 생성기
  const playSound = (freq, type, duration, vol = 0.1) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
      setTimeout(() => audioCtx.close(), duration * 1000 + 100);
    } catch (e) {}
  };

  const playTickSound = () => playSound(1000, 'sine', 0.05, 0.05);
  const playWinSound = () => {
    [523.25, 659.25, 783.99].forEach((f, i) => {
      setTimeout(() => playSound(f, 'triangle', 0.3, 0.1), i * 150);
    });
  };

  const spin = () => {
    if (isSpinning || items.length < 2) {
      if (items.length < 2) showAlert('최소 2개 이상의 항목이 필요합니다.', '알림');
      return;
    }

    setIsSpinning(true);
    setResult(null);

    const extraDegrees = Math.floor(Math.random() * 360);
    const spinDegrees = 1800 + extraDegrees;
    const newRotation = rotation + spinDegrees;
    
    setRotation(newRotation);

    // 회전 소리 연출 (애니메이션과 동기화)
    const startTime = performance.now();
    const duration = 3000;
    const sliceAngle = 360 / items.length;
    let lastTickAngle = rotation;

    const checkTick = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // cubic-bezier(0.2, 0.8, 0.2, 1) 근사치 계산
      // easeOutQuart: 1 - (1 - x)^4
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentRotation = rotation + (spinDegrees * easeProgress);
      
      if (Math.abs(currentRotation - lastTickAngle) >= sliceAngle) {
        playTickSound();
        lastTickAngle = currentRotation;
      }

      if (progress < 1) {
        requestAnimationFrame(checkTick);
      }
    };
    requestAnimationFrame(checkTick);

    // 애니메이션 종료 후 결과 계산
    setTimeout(() => {
      setIsSpinning(false);
      
      const sliceAngleFinal = 360 / items.length;
      const normalizedRotation = newRotation % 360;
      const winningIndex = Math.floor((360 - normalizedRotation) % 360 / sliceAngleFinal) % items.length;
      
      setResult(items[winningIndex]);
      playWinSound(); // 당첨 소리
    }, duration);
  };

  // 룰렛 배경 스타일 (conic-gradient)
  const getWheelStyle = () => {
    if (items.length === 0) return { background: '#f1f5f9' };
    
    const slicePercentage = 100 / items.length;
    let gradientParts = [];
    
    items.forEach((_, idx) => {
      const color = colors[idx % colors.length];
      gradientParts.push(`${color} ${idx * slicePercentage}% ${(idx + 1) * slicePercentage}%`);
    });

    return {
      background: `conic-gradient(${gradientParts.join(', ')})`,
      transform: `rotate(${rotation}deg)`,
      transition: isSpinning ? 'transform 3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'
    };
  };

  return (
    <div className="tool-page-container">
      <div className="roulette-layout">
        
        {/* 왼쪽: 항목 리스트 */}
        <div className="items-panel">
          <h3 className="panel-title">항목 설정 ({items.length}개)</h3>
          
          <form className="add-item-form" onSubmit={handleAddItem}>
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="항목 입력..."
              className="item-input"
            />
            <button type="submit" className="add-btn">추가</button>
          </form>

          <ul className="items-list">
            {items.map((item, idx) => (
              <li key={idx} className="item-row">
                <span className="item-color-dot" style={{ backgroundColor: colors[idx % colors.length] }}></span>
                <span className="item-text">{item}</span>
                <button 
                  className="remove-item-btn" 
                  onClick={() => handleRemoveItem(idx)}
                  disabled={isSpinning}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          {items.length === 0 && <p className="empty-items-msg">항목을 추가해주세요.</p>}
        </div>

        {/* 오른쪽: 룰렛 원판 */}
        <div className="roulette-card">
          <h2 className="tool-title">🎯 돌림판</h2>

          <div className="wheel-container">
            {/* 지시선 (화살표) */}
            <div className="pointer-container">
              <div className="pointer-arrow"></div>
            </div>
            
            {/* 룰렛 */}
            <div 
              className="wheel" 
              ref={wheelRef}
              style={getWheelStyle()}
            >
              {items.map((item, idx) => {
                const sliceAngle = 360 / items.length;
                // conic-gradient가 12시(0도)부터 시작하므로, 
                // 텍스트 위치도 12시 기준(각도 - 90도)으로 배치하여 중앙에 오도록 함
                const textAngle = (sliceAngle * idx) + (sliceAngle / 2) - 90;
                return (
                  <div 
                    key={idx} 
                    className="wheel-text"
                    style={{ 
                      transform: `rotate(${textAngle}deg)`,
                    }}
                  >
                    <span className="item-label">{item}</span>
                  </div>
                );
              })}
              {/* 중앙 원 (핀) */}
              <div className="wheel-center"></div>
            </div>
          </div>

          <div className="roulette-result">
            {isSpinning ? (
              <span className="spinning-text">돌아가는 중...</span>
            ) : result ? (
              <span className="result-text">🎉 당첨: <strong>{result}</strong> 🎉</span>
            ) : (
              <span className="ready-text">버튼을 눌러 시작하세요</span>
            )}
          </div>

          <button 
            className="control-btn start-btn spin-btn" 
            onClick={spin}
            disabled={isSpinning || items.length === 0}
          >
            돌리기
          </button>
        </div>

      </div>
    </div>
  );
}

export default RoulettePage;
