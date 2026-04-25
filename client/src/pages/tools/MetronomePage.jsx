import React, { useState, useEffect, useRef, useCallback } from 'react';
import './MetronomePage.css';

const TEMPOS = [
  { name: 'Grave', min: 0, max: 40 },
  { name: 'Largo', min: 40, max: 45 },
  { name: 'Larghetto', min: 45, max: 50 },
  { name: 'Adagio', min: 50, max: 55 },
  { name: 'Andante', min: 55, max: 65 },
  { name: 'Moderato', min: 65, max: 80 },
  { name: 'Allegro', min: 80, max: 120 },
  { name: 'Vivace', min: 120, max: 150 },
  { name: 'Presto', min: 150, max: 200 },
  { name: 'Prestissimo', min: 200, max: 300 },
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

  return (
    <div className="metronome-container">
      <div className="metronome-header">
        <div className="header-left">
          <button className="icon-btn">⚙️</button>
          <button className="icon-btn">⏱️</button>
        </div>
        <div className="header-right">
          <button className="icon-btn">✋</button>
          <button className="icon-btn">⛶</button>
          <button className="icon-btn">📑</button>
        </div>
      </div>

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
            <span className="tempo-sec">{(60 / bpm).toFixed(3)}sec</span>
            <span className="tempo-name">{getTempoName(bpm)}</span>
          </div>
        </div>

        <div className="control-section">
          <div className="settings-grid">
            <div className="setting-item">
              <span className="setting-icon">🔔</span>
              <span className="setting-label">소리</span>
              <select className="setting-select" value={soundType} onChange={(e) => setSoundType(e.target.value)}>
                <option value="wood">Wood Block</option>
                <option value="beep">Digital Beep</option>
                <option value="drum">High Snare</option>
              </select>
            </div>
            <div className="setting-item">
              <span className="setting-icon">4</span>
              <span className="setting-label">비트</span>
              <select className="setting-select" value={beatsPerMeasure} onChange={(e) => setBeatsPerMeasure(Number(e.target.value))}>
                {Array.from({ length: 16 }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>{num} 박자</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <span className="setting-icon">♩</span>
              <span className="setting-label">패턴</span>
              <select className="setting-select">
                <option>Quarter</option>
                <option>Eighth</option>
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
            <button className="adj-btn" onClick={() => handleBpmChange(bpm - 5)}>- 5</button>
            <button className="adj-btn" onClick={() => handleBpmChange(bpm - 1)}>- 1</button>
            <button className={`play-btn ${isPlaying ? 'playing' : ''}`} onClick={startMetronome}>
              {isPlaying ? '■' : '▶'}
            </button>
            <button className="adj-btn" onClick={() => handleBpmChange(bpm + 1)}>+ 1</button>
            <button className="adj-btn" onClick={() => handleBpmChange(bpm + 5)}>+ 5</button>
          </div>
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
            <span className="preset-sub">4 ♩</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default MetronomePage;
