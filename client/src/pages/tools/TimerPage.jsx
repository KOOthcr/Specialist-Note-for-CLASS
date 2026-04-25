import React, { useState, useEffect, useRef } from 'react';
import './TimerPage.css';
import { useModal } from '../../components/common/GlobalModal';
import TimerSidebar from '../../components/timer/TimerSidebar';

function TimerPage() {
  const { showAlert } = useModal();
  
  // 상태 변수
  const [message, setMessage] = useState('즐거운 수업 시간입니다! 📚');
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [totalTime, setTotalTime] = useState(5 * 60);
  
  // 설정 상태
  const [settings, setSettings] = useState({
    clockSound: true,
    warningSound: true,
    endSound: true,
    bgm: 'none'
  });

  const intervalRef = useRef(null);
  const clockSoundRef = useRef(null);
  const warningSoundRef = useRef(null);
  const endSoundRef = useRef(null);

  // 초기 시간 설정 동기화
  useEffect(() => {
    if (!isRunning) {
      const newTotal = minutes * 60 + seconds;
      setTimeLeft(newTotal);
      setTotalTime(newTotal);
    }
  }, [minutes, seconds, isRunning]);

  // 오디오 컨텍스트 생성 (효과음용)
  const playSound = (freq, type, duration) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = type; // 'sine', 'square', 'sawtooth', 'triangle'
      oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.error('Audio play error:', e);
    }
  };

  const playTickSound = () => playSound(800, 'sine', 0.1);
  const playWarningSound = () => {
    playSound(600, 'square', 0.2);
    setTimeout(() => playSound(600, 'square', 0.2), 300);
  };
  const playEndSound = () => {
    const endCtx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 784, 698].forEach((f, i) => {
      setTimeout(() => {
        const osc = endCtx.createOscillator();
        const gain = endCtx.createGain();
        osc.frequency.value = f;
        gain.gain.value = 0.1;
        osc.connect(gain);
        gain.connect(endCtx.destination);
        osc.start();
        osc.stop(endCtx.currentTime + 0.5);
      }, i * 300);
    });
  };

  // 타이머 핵심 로직
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          
          if (settings.clockSound && next > 0) {
            playTickSound(); 
          }
          if (settings.warningSound && next === 10) {
            playWarningSound();
          }
          
          return next;
        });
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      clearInterval(intervalRef.current);
      if (settings.endSound) {
        playEndSound();
      }
      showAlert('시간이 종료되었습니다! 🔔', '알림');
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft, settings, showAlert]);

  const toggleTimer = () => {
    if (timeLeft > 0) {
      setIsRunning(!isRunning);
    } else {
      showAlert('시간을 설정해주세요.', '알림');
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    const originalTime = minutes * 60 + seconds;
    setTimeLeft(originalTime);
    setTotalTime(originalTime);
  };

  // 시간 조절 함수
  const adjustTime = (type, unit, amount) => {
    if (type === 'set') {
      setMinutes(amount);
      setSeconds(0);
    } else if (type === 'add') {
      // 실행 중에도 시간 증감 가능
      setTimeLeft(prev => {
        const next = Math.max(0, prev + (unit === 'min' ? amount * 60 : amount));
        if (isRunning) setTotalTime(prevTotal => prevTotal + (unit === 'min' ? amount * 60 : amount));
        return next;
      });
    }
  };

  const handleManualTimeChange = (unit, value) => {
    if (isRunning) return;
    const num = parseInt(value) || 0;
    if (unit === 'min') {
      setMinutes(Math.max(0, Math.min(99, num)));
    } else {
      setSeconds(Math.max(0, Math.min(59, num)));
    }
  };

  const handleArrowAdjust = (unit, amount) => {
    if (isRunning) return;
    if (unit === 'min') {
      setMinutes(prev => Math.max(0, Math.min(99, prev + amount)));
    } else {
      setSeconds(prev => {
        let next = prev + amount;
        if (next >= 60) {
          setMinutes(m => Math.min(99, m + 1));
          return 0;
        }
        if (next < 0) {
          if (minutes > 0) {
            setMinutes(m => m - 1);
            return 59;
          }
          return 0;
        }
        return next;
      });
    }
  };

  // 진행률 계산 (SVG Stroke용)
  const radius = 180;
  const circumference = 2 * Math.PI * radius;
  const progress = totalTime > 0 ? (timeLeft / totalTime) : 0;
  const strokeDashoffset = circumference - (progress * circumference);

  const displayMin = Math.floor(timeLeft / 60);
  const displaySec = timeLeft % 60;
  const isWarning = timeLeft > 0 && timeLeft <= 10;

  return (
    <div className="tool-page-container">
      <div className="timer-wrapper">
        
        {/* 상단 메시지 바 */}
        <div className="message-bar">
          <input 
            type="text" 
            className="message-input" 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="학생들에게 보여줄 메시지를 입력하세요..."
          />
        </div>

        <div className="timer-main-layout">
          
          {/* 메인 타이머 영역 */}
          <div className="timer-visual-card">
            <div className="clock-canvas-container">
              <svg className="clock-svg" viewBox="0 0 400 400">
                <circle className="clock-bg-circle" cx="200" cy="200" r={radius} />
                <circle 
                  className={`clock-progress-circle ${isWarning ? 'warning' : ''}`}
                  cx="200" cy="200" r={radius}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              
              <div className="digital-display-wrapper">
                <div className="digital-numbers">
                  {/* 분 조절 */}
                  <div className="digit-group">
                    <button className="arrow-btn" onClick={() => handleArrowAdjust('min', 1)} disabled={isRunning}>▲</button>
                    <input 
                      type="text"
                      className={`number-box ${isWarning ? 'warning' : ''}`}
                      value={String(displayMin).padStart(2, '0')}
                      onChange={(e) => handleManualTimeChange('min', e.target.value)}
                      disabled={isRunning}
                      maxLength={2}
                    />
                    <button className="arrow-btn" onClick={() => handleArrowAdjust('min', -1)} disabled={isRunning}>▼</button>
                  </div>

                  <div className={`number-separator ${!isRunning ? 'paused' : ''}`}>:</div>

                  {/* 초 조절 */}
                  <div className="digit-group">
                    <button className="arrow-btn" onClick={() => handleArrowAdjust('sec', 1)} disabled={isRunning}>▲</button>
                    <input 
                      type="text"
                      className={`number-box ${isWarning ? 'warning' : ''}`}
                      value={String(displaySec).padStart(2, '0')}
                      onChange={(e) => handleManualTimeChange('sec', e.target.value)}
                      disabled={isRunning}
                      maxLength={2}
                    />
                    <button className="arrow-btn" onClick={() => handleArrowAdjust('sec', -1)} disabled={isRunning}>▼</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="main-controls">
              <button className="main-btn btn-secondary" onClick={() => adjustTime('set', 'min', 0)}>다시 선택</button>
              <button 
                className={`main-btn ${isRunning ? 'btn-pause' : 'btn-start'}`}
                onClick={toggleTimer}
              >
                {isRunning ? '⏸ 일시정지' : '▶ 시작'}
              </button>
              <button className="main-btn btn-secondary" onClick={resetTimer}>🔄 재설정</button>
            </div>
          </div>

          {/* 우측 사이드바 — TimerSidebar 컴포넌트로 분리 */}
          <TimerSidebar
            settings={settings}
            setSettings={setSettings}
            isRunning={isRunning}
            setMinutes={setMinutes}
            setSeconds={setSeconds}
            adjustTime={adjustTime}
          />

        </div>
      </div>
    </div>
  );
}

export default TimerPage;
