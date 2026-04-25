import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/LoginPage';
import SignupPage from './features/auth/SignupPage';
import DashboardHome from './pages/DashboardHome';
import AllStudentListPage from './pages/AllStudentListPage';
import ClassStudentListPage from './pages/ClassStudentListPage';
import GrowthRecordPage from './pages/GrowthRecordPage';
import AccumulatedRecordPage from './pages/AccumulatedRecordPage';
import StudentQuestionPage from './pages/StudentQuestionPage';
import AttendancePage from './pages/AttendancePage';
import ProgressRecordPage from './pages/ProgressRecordPage';
import ProgressCheckPage from './pages/ProgressCheckPage';
import ClassHoursPage from './pages/ClassHoursPage';
import TimerPage from './pages/tools/TimerPage';
import DicePage from './pages/tools/DicePage';
import CoinPage from './pages/tools/CoinPage';
import RoulettePage from './pages/tools/RoulettePage';
import NoiseMeterPage from './pages/tools/NoiseMeterPage';
import DustPage from './pages/tools/DustPage';
import ScoreboardPage from './pages/tools/ScoreboardPage';
import WhiteboardPage from './pages/tools/WhiteboardPage';
import MetronomePage from './pages/tools/MetronomePage';
import MissionPage from './pages/MissionPage';
import StudentPage from './pages/StudentPage';
import DashboardLayout from './layouts/DashboardLayout';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/student" element={<StudentPage />} />
      
      {/* 권한이 필요한 대시보드 라우트 그룹 */}
      <Route path="/main" element={<DashboardLayout />}>
        {/* /main 진입 시 대시보드 홈 화면 렌더링 */}
        <Route index element={<DashboardHome />} />
        <Route path="all-students" element={<AllStudentListPage />} />
        <Route path="class-list" element={<ClassStudentListPage />} />
        
        {/* 행동기록 탭 리다이렉션 및 라우트 */}
        <Route path="behavior" element={<Navigate to="attendance" replace />} />
        <Route path="behavior/task" element={<GrowthRecordPage />} />
        <Route path="behavior/accumulated" element={<AccumulatedRecordPage />} />
        <Route path="behavior/qna" element={<StudentQuestionPage />} />
        <Route path="behavior/attendance" element={<AttendancePage />} />
        
        {/* 진도 확인 라우트 */}
        <Route path="progress" element={<Navigate to="record" replace />} />
        <Route path="progress/timetable" element={<ClassHoursPage />} />
        <Route path="progress/record" element={<ProgressRecordPage />} />
        <Route path="progress/check" element={<ProgressCheckPage />} />
        
        {/* 수업 도구 라우트 */}
        <Route path="tools" element={<Navigate to="timer" replace />} />
        <Route path="tools/timer" element={<TimerPage />} />
        <Route path="tools/dice" element={<DicePage />} />
        <Route path="tools/coin" element={<CoinPage />} />
        <Route path="tools/roulette" element={<RoulettePage />} />
        <Route path="tools/noise" element={<NoiseMeterPage />} />
        <Route path="tools/dust" element={<DustPage />} />
        <Route path="tools/scoreboard" element={<ScoreboardPage />} />
        <Route path="tools/whiteboard" element={<WhiteboardPage />} />
        <Route path="tools/metronome" element={<MetronomePage />} />
        
        <Route path="mission" element={<MissionPage />} />
      </Route>
    </Routes>
  );
}

export default App;
