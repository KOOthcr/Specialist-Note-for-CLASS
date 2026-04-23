import React, { useState, useEffect, useRef } from 'react';
import './TimerPage.css';

function TimerPage() {
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [timeLeft, setTimeLeft] = useState(minutes * 60 + seconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isRunning) {
      setTimeLeft(minutes * 60 + seconds);
    }
  }, [minutes, seconds, isRunning]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft]);

  const toggleTimer = () => {
    if (timeLeft > 0) {
      setIsRunning(!isRunning);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(minutes * 60 + seconds);
  };

  const handleMinutesChange = (e) => {
    const val = parseInt(e.target.value) || 0;
    setMinutes(val);
  };

  const handleSecondsChange = (e) => {
    const val = parseInt(e.target.value) || 0;
    setSeconds(val);
  };

  const displayMinutes = Math.floor(timeLeft / 60);
  const displaySeconds = timeLeft % 60;

  // 진행률 계산
  const totalTime = minutes * 60 + seconds;
  const progress = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;
  
  // 색상 결정 (10% 미만이면 빨간색 경고)
  const isWarning = progress < 10 && totalTime > 0 && timeLeft > 0;

  return (
    <div className="tool-page-container">
      <div className="timer-card">
        <h2 className="tool-title">⏱️ 타이머</h2>
        
        {!isRunning ? (
          <div className="time-inputs">
            <div className="input-group">
              <input 
                type="number" 
                min="0" 
                max="99" 
                value={minutes} 
                onChange={handleMinutesChange} 
                className="time-input"
              />
              <span className="time-label">분</span>
            </div>
            <span className="time-separator">:</span>
            <div className="input-group">
              <input 
                type="number" 
                min="0" 
                max="59" 
                value={seconds} 
                onChange={handleSecondsChange} 
                className="time-input"
              />
              <span className="time-label">초</span>
            </div>
          </div>
        ) : (
          <div className="time-display">
            <span className={`time-text ${isWarning ? 'warning' : ''} ${timeLeft === 0 ? 'finished' : ''}`}>
              {String(displayMinutes).padStart(2, '0')}:{String(displaySeconds).padStart(2, '0')}
            </span>
          </div>
        )}

        {/* 프로그레스 바 */}
        <div className="progress-container">
          <div 
            className={`progress-bar ${isWarning ? 'warning-bar' : ''}`} 
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {timeLeft === 0 && <div className="time-up-message">시간이 종료되었습니다! 🔔</div>}

        <div className="timer-controls">
          <button className={`control-btn ${isRunning ? 'pause-btn' : 'start-btn'}`} onClick={toggleTimer}>
            {isRunning ? '일시정지' : '시작'}
          </button>
          <button className="control-btn reset-btn" onClick={resetTimer}>
            초기화
          </button>
        </div>
      </div>
    </div>
  );
}

export default TimerPage;
