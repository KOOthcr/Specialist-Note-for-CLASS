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

  const spin = () => {
    if (isSpinning || items.length < 2) {
      if (items.length < 2) showAlert('최소 2개 이상의 항목이 필요합니다.', '알림');
      return;
    }

    setIsSpinning(true);
    setResult(null);

    // 랜덤 각도 계산 (기본 5바퀴(1800도) + 랜덤 추가 각도)
    const extraDegrees = Math.floor(Math.random() * 360);
    const spinDegrees = 1800 + extraDegrees;
    const newRotation = rotation + spinDegrees;
    
    setRotation(newRotation);

    // 애니메이션 종료 후 결과 계산
    setTimeout(() => {
      setIsSpinning(false);
      
      // 결과 인덱스 계산
      // 회전이 끝난 후, CSS 각도(0도는 12시 방향에서 시작한다고 가정할 때, transform: rotate 기준)
      // 항목의 각도 크기
      // 항목의 각도 크기
      const sliceAngle = 360 / items.length;
      
      // 최종 각도를 360으로 나눈 나머지 (시계 방향 회전)
      // CSS rotate(deg)에서 0도는 3시 방향이므로, 12시 방향(포인터 위치)은 -90도 또는 270도 지점임.
      // 하지만 conic-gradient는 12시(0도)부터 시작함.
      const normalizedRotation = newRotation % 360;
      
      // 포인터(12시 방향)에 위치한 항목 계산
      // 회전된 각도만큼 반대 방향으로 이동하여 0도(12시) 위치의 인덱스를 찾음
      const winningIndex = Math.floor((360 - normalizedRotation) % 360 / sliceAngle) % items.length;
      
      setResult(items[winningIndex]);
    }, 3000);
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
