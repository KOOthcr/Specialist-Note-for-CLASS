import React from 'react';

/**
 * StudentHeader: 학생 페이지 상단 헤더 영역
 */
function StudentHeader({ entryMode, studentInfo }) {
  return (
    <header className="student-header">
      <div className="school-icon">{entryMode === 'club' ? '⚽' : '🏫'}</div>
      <div className="student-greeting">
        <h1>
          {entryMode === 'club' ? `${studentInfo.club}, ` : `${studentInfo.grade}학년 ${studentInfo.classNum}반, `}
          <strong>{studentInfo.name}</strong> 학생
        </h1>
        <p>오늘도 즐거운 체육(전담) 수업 함께 만들어가요! 😊</p>
      </div>
    </header>
  );
}

/**
 * StudentMenu: 학생 페이지 중앙 메뉴 카드 영역
 */
function StudentMenu({ setActiveModal }) {
  return (
    <main className="student-menu-grid">
      <button className="menu-card card-green" onClick={() => setActiveModal('growth')}>
        <div className="card-icon">📏</div>
        <div className="card-content">
          <h3>성장 기록 입력</h3>
          <p>오늘 나의 팝스(PAPS)나 활동 측정 기록을 입력해요.</p>
        </div>
      </button>
      <button className="menu-card card-orange" onClick={() => setActiveModal('diary')}>
        <div className="card-icon">📓</div>
        <div className="card-content">
          <h3>오늘의 체육 일기</h3>
          <p>오늘 수업에서 배운 점이나 느낀 점을 짧게 기록해요.</p>
        </div>
      </button>
      <button className="menu-card card-purple" onClick={() => setActiveModal('qna')}>
        <div className="card-icon">💬</div>
        <div className="card-content">
          <h3>선생님께 한마디</h3>
          <p>질문이 있거나 선생님께 하고 싶은 말이 있다면 적어주세요.</p>
        </div>
      </button>
      <button className="menu-card card-pink" onClick={() => setActiveModal('mission')}>
        <div className="card-icon">🎯</div>
        <div className="card-content">
          <h3>우리 반 미션 진행 상황</h3>
          <p>현재 우리 반의 단체 칭찬 점수와 미션 현황을 확인해요!</p>
        </div>
      </button>
    </main>
  );
}

export { StudentHeader, StudentMenu };
