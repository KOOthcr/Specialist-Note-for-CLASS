import React from 'react';

/**
 * MainTabNavigation: 대시보드 상단 탭 내비게이션 컴포넌트
 * 현재 URL(location.pathname)에 따라 적절한 탭 버튼을 렌더링합니다.
 * 라우팅 로직은 이 컴포넌트 안에 없으며, 단순 렌더링만 담당합니다.
 */
function MainTabNavigation({ location, getTabTitle }) {
  const path = location.pathname;

  if (path === '/main' || path === '/main/') return null;

  return (
    <header className="main-header">
      <div className="tab-container">
        {(path.startsWith('/main/all-students') || path.startsWith('/main/class-list')) ? (
          <>
            <a href="/main/all-students" className={`tab-item ${path === '/main/all-students' ? 'active-tab' : ''}`}>
              전체 학생 명단 관리
            </a>
            <a href="/main/class-list" className={`tab-item ${path === '/main/class-list' ? 'active-tab' : ''}`}>
              반별 학생 명단 관리
            </a>
          </>
        ) : path.startsWith('/main/behavior') ? (
          <>
            <a href="/main/behavior/attendance" className={`tab-item ${path === '/main/behavior/attendance' ? 'active-tab' : ''}`}>
              반별 인원 체크
            </a>
            <a href="/main/behavior/task" className={`tab-item ${path === '/main/behavior/task' ? 'active-tab' : ''}`}>
              성장 기록
            </a>
            <a href="/main/behavior/accumulated" className={`tab-item ${path === '/main/behavior/accumulated' ? 'active-tab' : ''}`}>
              누가기록
            </a>
            <a href="/main/behavior/qna" className={`tab-item ${path === '/main/behavior/qna' ? 'active-tab' : ''}`}>
              학생 질문
            </a>
          </>
        ) : path.startsWith('/main/progress') ? (
          <>
            <a
              href="/main/progress/timetable"
              className={`tab-item ${path === '/main/progress/timetable' ? 'active-tab' : ''}`}
              style={path === '/main/progress/timetable' ? { color: '#4f46e5', borderBottomColor: '#4f46e5' } : {}}
            >
              📅 기초시간표 작성
            </a>
            <a href="/main/progress/record" className={`tab-item ${path === '/main/progress/record' ? 'active-tab' : ''}`}>
              진도 기록
            </a>
            <a href="/main/progress/check" className={`tab-item ${path === '/main/progress/check' ? 'active-tab' : ''}`}>
              진도 확인
            </a>
          </>
        ) : path.startsWith('/main/tools') ? (
          <>
            <a href="/main/tools/timer" className={`tab-item ${path === '/main/tools/timer' ? 'active-tab' : ''}`}>⏱️ 타이머</a>
            <a href="/main/tools/dice" className={`tab-item ${path === '/main/tools/dice' ? 'active-tab' : ''}`}>🎲 주사위</a>
            <a href="/main/tools/coin" className={`tab-item ${path === '/main/tools/coin' ? 'active-tab' : ''}`}>🪙 동전던지기</a>
            <a href="/main/tools/roulette" className={`tab-item ${path === '/main/tools/roulette' ? 'active-tab' : ''}`}>🎯 돌림판</a>
            <a href="/main/tools/noise" className={`tab-item ${path === '/main/tools/noise' ? 'active-tab' : ''}`}>🔔 소음측정기</a>
            <a href="/main/tools/dust" className={`tab-item ${path === '/main/tools/dust' ? 'active-tab' : ''}`}>☁️ 미세먼지</a>
            <a href="/main/tools/scoreboard" className={`tab-item ${path === '/main/tools/scoreboard' ? 'active-tab' : ''}`}>📊 점수판</a>
            <a href="/main/tools/whiteboard" className={`tab-item ${path === '/main/tools/whiteboard' ? 'active-tab' : ''}`}>🖍️ 판서</a>
          </>
        ) : (
          <span className="tab-item active-tab">{getTabTitle()}</span>
        )}
      </div>
    </header>
  );
}

export default MainTabNavigation;
