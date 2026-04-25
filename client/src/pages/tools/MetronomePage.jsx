import React, { useState, useEffect, useRef, useCallback } from 'react';
import './MetronomePage.css';

const TEMPOS = [
  { name: '매우 느리게 (Grave)', min: 0, max: 40 },
  { name: '느리게 (Largo)', min: 40, max: 45 },
  { name: '조금 느리게 (Larghetto)', min: 45, max: 50 },
  { name: '매우 천천히 (Adagio)', min: 50, max: 55 },
  { name: '천천히 (Andante)', min: 55, max: 65 },
  { name: '보통 빠르기 (Moderato)', min: 65, max: 80 },
  { name: '빠르게 (Allegro)', min: 80, max: 120 },
  { name: '아주 빠르게 (Vivace)', min: 120, max: 150 },
  { name: '매우 빠르게 (Presto)', min: 150, max: 200 },
  { name: '가장 빠르게 (Prestissimo)', min: 200, max: 300 },
];

const PRESETS = [80, 90, 100, 110, 120, 130, 140, 150, 160, 170];

function MetronomePage() {
  const [bpm, setBpm] = useState(130);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [soundType, setSoundType] = useState('wood'); // wood, beep, drum
  
  const audioContextRef = useRef(null);
  const timerIDRef = useRef(null);
  const nextNoteTimeRef = useRef(0.0);
  const beatRef = useRef(0);
  const bpmRef = useRef(130);

  // BPM이 변경될 때마다 ref 업데이트 (스케줄러에서 최신 BPM을 참조하기 위함)
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  const getTempoName = (val) => {
    const tempo = TEMPOS.find(t => val >= t.min && val < t.max);
    return tempo ? tempo.name : 'Allegro';
  };

  const playClick = useCallback((time, isAccent) => {
    if (!audioContextRef.current) return;
    
    const osc = audioContextRef.current.createOscillator();
    const envelope = audioContextRef.current.createGain();

    if (soundType === 'beep') {
      osc.type = 'sine';
      osc.frequency.value = isAccent ? 1000 : 800;
    } else if (soundType === 'wood') {
      osc.type = 'triangle';
      osc.frequency.value = isAccent ? 1200 : 900;
    } else {
      osc.type = 'square';
      osc.frequency.value = isAccent ? 400 : 300;
    }

    envelope.gain.value = 1;
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(envelope);
    envelope.connect(audioContextRef.current.destination);

    osc.start(time);
    osc.stop(time + 0.1);
  }, [soundType]);

  const scheduler = useCallback(() => {
    const scheduleAheadTime = 0.1; // 100ms 앞을 미리 스케줄링
    
    while (nextNoteTimeRef.current < audioContextRef.current.currentTime + scheduleAheadTime) {
      const isAccent = beatRef.current === 0;
      playClick(nextNoteTimeRef.current, isAccent);
      
      // UI 업데이트를 위한 상태 변경 (requestAnimationFrame을 쓰는 것이 더 정확하지만 여기서는 단순화)
      const capturedBeat = beatRef.current;
      setTimeout(() => setCurrentBeat(capturedBeat), (nextNoteTimeRef.current - audioContextRef.current.currentTime) * 1000);

      // 다음 박자 시간 계산
      const secondsPerBeat = 60.0 / bpmRef.current;
      nextNoteTimeRef.current += secondsPerBeat;
      
      // 비트 카운트 업데이트
      beatRef.current = (beatRef.current + 1) % beatsPerMeasure;
    }
    
    timerIDRef.current = setTimeout(scheduler, 25); // 25ms마다 체크
  }, [beatsPerMeasure, playClick]);

  const startMetronome = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (isPlaying) {
      clearTimeout(timerIDRef.current);
      setIsPlaying(false);
      setCurrentBeat(-1);
    } else {
      beatRef.current = 0;
      nextNoteTimeRef.current = audioContextRef.current.currentTime + 0.05;
      setIsPlaying(true);
      scheduler();
    }
  };

  useEffect(() => {
    return () => clearTimeout(timerIDRef.current);
  }, []);

  const handleBpmChange = (newBpm) => {
    const val = Math.min(Math.max(Number(newBpm), 20), 300);
    setBpm(val);
  };

  const [tapTimes, setTapTimes] = useState([]);

  // Tap Tempo 기능
  const handleTap = () => {
    const now = Date.now();
    const newTapTimes = [...tapTimes, now].slice(-4); // 최근 4개만 유지
    setTapTimes(newTapTimes);

    if (newTapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTapTimes.length; i++) {
        intervals.push(newTapTimes[i] - newTapTimes[i-1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b) / intervals.length;
      const newBpm = Math.round(60000 / avgInterval);
      handleBpmChange(newBpm);
    }
  };

  return (
    <div className="metronome-container">
      <div className="metronome-main">
        <div className="display-section">
          <div className="beat-indicator">
            {Array.from({ length: beatsPerMeasure }).map((_, i) => (
              <div key={i} className={`beat-dot ${currentBeat === i && isPlaying ? 'active' : ''}`} />
            ))}
          </div>
          <div className="bpm-display">
            <span className="bpm-number">{bpm}</span>
            <span className="bpm-decimal">.00</span>
          </div>
          <div className="tempo-info">
            <span className="tempo-name">{getTempoName(bpm)}</span>
            <span className="tempo-sec">{(60 / bpm).toFixed(3)} 초 / 박자</span>
          </div>
        </div>

        <div className="control-section">
          <div className="settings-grid">
            <div className="setting-item">
              <span className="setting-label">소리 선택</span>
              <select className="setting-select" value={soundType} onChange={(e) => setSoundType(e.target.value)}>
                <option value="wood">우드 블록</option>
                <option value="beep">디지털 비프</option>
                <option value="drum">스네어 드럼</option>
              </select>
            </div>
            <div className="setting-item">
              <span className="setting-label">박자 설정</span>
              <select className="setting-select" value={beatsPerMeasure} onChange={(e) => setBeatsPerMeasure(Number(e.target.value))}>
                {Array.from({ length: 16 }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>{num} 박자</option>
                ))}
              </select>
            </div>
          </div>

          <div className="slider-container">
            <input 
              type="range" 
              className="bpm-slider" 
              min="20" 
              max="300" 
              value={bpm} 
              onChange={(e) => handleBpmChange(e.target.value)} 
            />
          </div>

          <div className="playback-controls">
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="adj-btn" onClick={() => handleBpmChange(bpm - 5)}>-5</button>
              <button className="adj-btn" onClick={() => handleBpmChange(bpm - 1)}>-1</button>
            </div>
            
            <button className={`play-btn ${isPlaying ? 'playing' : ''}`} onClick={startMetronome}>
              {isPlaying ? '정지' : '시작'}
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="adj-btn" onClick={() => handleBpmChange(bpm + 1)}>+1</button>
              <button className="adj-btn" onClick={() => handleBpmChange(bpm + 5)}>+5</button>
            </div>
          </div>

          <button 
            className="adj-btn" 
            style={{ width: '100%', marginTop: '20px', background: 'rgba(34, 211, 238, 0.1)', color: '#22d3ee', border: '1px solid rgba(34, 211, 238, 0.3)' }}
            onClick={handleTap}
          >
            탭 템포 (Tap Tempo)
          </button>
        </div>
      </div>

      <div className="presets-grid">
        {PRESETS.map((p) => (
          <button 
            key={p} 
            className={`preset-btn ${bpm === p ? 'active' : ''}`}
            onClick={() => handleBpmChange(p)}
          >
            <span className="preset-bpm">{p}</span>
            <span className="preset-sub">4박자</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default MetronomePage;
