import React from 'react';

/**
 * TimerSidebar: 타이머 우측 사이드바 UI 컴포넌트
 * 사운드 설정, 시간 프리셋, 시간 증감 버튼을 담당합니다.
 * 모든 로직은 TimerPage에 있으며, props로 전달받아 렌더링만 합니다.
 */
function TimerSidebar({ settings, setSettings, isRunning, setMinutes, setSeconds, adjustTime }) {
  return (
    <div className="timer-sidebar">
      
      {/* 사운드 설정 */}
      <div className="sidebar-section">
        <div className="section-title">🔊 사운드 설정</div>
        <div className="settings-list">
          <label className="setting-item">
            <span className="setting-label">시계음</span>
            <input type="checkbox" checked={settings.clockSound} onChange={(e) => setSettings({...settings, clockSound: e.target.checked})} />
          </label>
          <label className="setting-item">
            <span className="setting-label">종료 예고음 (10초 전)</span>
            <input type="checkbox" checked={settings.warningSound} onChange={(e) => setSettings({...settings, warningSound: e.target.checked})} />
          </label>
          <label className="setting-item">
            <span className="setting-label">종료음</span>
            <input type="checkbox" checked={settings.endSound} onChange={(e) => setSettings({...settings, endSound: e.target.checked})} />
          </label>
        </div>
      </div>

      {/* 시간 설정 프리셋 */}
      <div className="sidebar-section">
        <div className="section-title">⏱️ 시간 설정</div>
        <div className="preset-grid">
          {[
            { l: '10초', m: 0, s: 10 },
            { l: '30초', m: 0, s: 30 },
            { l: '1분', m: 1, s: 0 },
            { l: '1분30초', m: 1, s: 30 },
            { l: '2분', m: 2, s: 0 },
            { l: '3분', m: 3, s: 0 },
            { l: '5분', m: 5, s: 0 },
            { l: '10분', m: 10, s: 0 },
            { l: '20분', m: 20, s: 0 }
          ].map(p => (
            <button key={p.l} className="preset-btn" onClick={() => { setMinutes(p.m); setSeconds(p.s); }} disabled={isRunning}>
              {p.l}
            </button>
          ))}
        </div>
      </div>

      {/* 시간 증감 */}
      <div className="sidebar-section">
        <div className="section-title">➕ 시간 증감</div>
        <div className="adjust-grid">
          {[
            { l: '+1초', u: 'sec', a: 1 },
            { l: '+10초', u: 'sec', a: 10 },
            { l: '+30초', u: 'sec', a: 30 },
            { l: '+1분', u: 'min', a: 1 },
            { l: '+5분', u: 'min', a: 5 },
            { l: '+10분', u: 'min', a: 10 }
          ].map(p => (
            <button key={p.l} className="adjust-btn plus" onClick={() => adjustTime('add', p.u, p.a)}>
              <span>{p.l}</span>
            </button>
          ))}
          {[
            { l: '-1초', u: 'sec', a: -1 },
            { l: '-10초', u: 'sec', a: -10 },
            { l: '-30초', u: 'sec', a: -30 },
            { l: '-1분', u: 'min', a: -1 },
            { l: '-5분', u: 'min', a: -5 },
            { l: '-10분', u: 'min', a: -10 }
          ].map(p => (
            <button key={p.l} className="adjust-btn minus" onClick={() => adjustTime('add', p.u, p.a)}>
              <span>{p.l}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

export default TimerSidebar;
