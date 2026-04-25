import React, { useState, useEffect, useRef } from 'react';
import './NoiseMeterPage.css';
import { useModal } from '../../components/common/GlobalModal';

function NoiseMeterPage() {
  const { showAlert } = useModal();
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [threshold, setThreshold] = useState(70);
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const animationFrameRef = useRef(null);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      
      // AudioContext 초기화
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      microphoneRef.current.connect(analyserRef.current);

      setIsListening(true);

      const updateVolume = () => {
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        
        // 간단한 볼륨 계산 (0 ~ 100 범위로 매핑)
        const average = sum / bufferLength;
        const mappedVolume = Math.min(100, Math.round((average / 128) * 100));
        
        setVolume(mappedVolume);

        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();

    } catch (err) {
      console.error('마이크 접근 오류:', err);
      showAlert('마이크 접근 권한이 필요합니다. 브라우저 설정에서 마이크를 허용해주세요.', '오류');
    }
  };

  const stopListening = () => {
    setIsListening(false);
    setVolume(0);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  useEffect(() => {
    // 컴포넌트 언마운트 시 정리
    return () => {
      stopListening();
    };
  }, []);

  const getStatusColor = () => {
    if (volume < threshold * 0.6) return '#10b981'; // 초록
    if (volume < threshold) return '#f59e0b'; // 주황
    return '#ef4444'; // 빨강
  };

  const getStatusMessage = () => {
    if (!isListening) return '마이크를 켜주세요';
    if (volume < threshold * 0.6) return '조용합니다 🤫';
    if (volume < threshold) return '주의가 필요해요 😐';
    return '너무 시끄러워요! 🚨';
  };

  return (
    <div className="tool-page-container">
      <div className="noise-card">
        <h2 className="tool-title">🔔 소음측정기</h2>

        <div className="status-display">
          <div className="status-emoji" style={{ color: getStatusColor() }}>
            {getStatusMessage().split(' ').pop()}
          </div>
          <div className="status-text">{getStatusMessage().replace(/[🤫😐🚨]/g, '')}</div>
        </div>

        <div className="meter-container">
          <div className="meter-bg">
            <div 
              className="meter-fill" 
              style={{ 
                height: `${volume}%`, 
                backgroundColor: getStatusColor() 
              }}
            ></div>
          </div>
          
          <div className="threshold-line" style={{ bottom: `${threshold}%` }}>
            <span className="threshold-label">경고 기준</span>
          </div>
        </div>

        <div className="volume-text">
          현재 소음 레벨: <strong style={{ color: getStatusColor() }}>{volume}</strong>
        </div>

        <div className="controls-section">
          <div className="threshold-presets">
            <button 
              className={`preset-btn ${threshold === 30 ? 'active' : ''}`}
              onClick={() => setThreshold(30)}
            >
              🤫 아주 조용히 (30)
            </button>
            <button 
              className={`preset-btn ${threshold === 60 ? 'active' : ''}`}
              onClick={() => setThreshold(60)}
            >
              🗣️ 적당한 대화 (60)
            </button>
            <button 
              className={`preset-btn ${threshold === 85 ? 'active' : ''}`}
              onClick={() => setThreshold(85)}
            >
              🎈 활발한 활동 (85)
            </button>
          </div>

          <label className="threshold-slider">
            <div className="slider-header">
              <span>경고 기준 직접 설정</span>
              <span className="threshold-value" style={{ color: getStatusColor() }}>{threshold}</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="100" 
              value={threshold} 
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </label>

          {isListening ? (
            <button className="control-btn stop-btn" onClick={stopListening}>
              ⏹️ 측정 중지
            </button>
          ) : (
            <button className="control-btn start-btn" onClick={startListening}>
              ▶️ 측정 시작 (마이크 허용 필요)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default NoiseMeterPage;
