import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useModal } from '../components/common/GlobalModal';
import './DashboardLayout.css';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import ProfileEditModal from '../components/profile/ProfileEditModal';
import MainTabNavigation from '../components/common/MainTabNavigation';

function DashboardLayout() {
  const { showConfirm, showAlert } = useModal();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedClass, setSelectedClass] = useState('5-1');

  // 사이드바 상단 프로필용 상태
  const [teacherName, setTeacherName] = useState('홍길동');
  const [roomName, setRoomName] = useState('체육관');
  const [sessionCode, setSessionCode] = useState('');
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);

  useEffect(() => {
    // 회원가입 시 저장했던 정보를 임시로 불러옵니다
    const savedName = localStorage.getItem('teacherName');
    const savedRoom = localStorage.getItem('roomName');
    if (savedName) setTeacherName(savedName);
    if (savedRoom) setRoomName(savedRoom);

    // DB에서 선생님의 고정된 입장 코드(room_code)를 가져오거나 없으면 생성
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          const now = new Date();
          const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000)).toISOString().split('T')[0];

          if (data.room_code && data.room_code_date === kstDate) {
            setSessionCode(data.room_code);
          } else {
            // 코드가 없거나 날짜가 바뀌었을 때만 무작위 6자리 방 코드로 갱신
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            await updateDoc(userRef, { 
              room_code: code,
              room_code_date: kstDate
            });
            setSessionCode(code);
          }
        }
      } else {
        // 로그인되어 있지 않은데 대시보드 접근 시 로그인 페이지로 강제 이동
        navigate('/', { replace: true });
      }
    });

    return () => unsubscribe();
  }, []);

  const getTabTitle = () => {
    const path = location.pathname;
    if (path === '/main' || path === '/main/') return '홈 (대시보드)';
    if (path.includes('/behavior')) return '행동기록 관리';
    if (path.includes('/progress')) return '진도 확인';
    if (path.includes('/tools')) return '수업 도구';
    if (path.includes('/mission')) return '단체 미션';
    return '학생명단관리';
  };

  const handleLogout = async () => {
    showConfirm("정말 로그아웃 하시겠습니까?", async () => {
      try {
        await auth.signOut();
        localStorage.removeItem('teacherName');
        localStorage.removeItem('roomName');
        showAlert("로그아웃 되었습니다.", "알림");
        navigate('/', { replace: true });
      } catch (err) {
        console.error("Logout error:", err);
        showAlert("로그아웃 중 오류가 발생했습니다.", "오류", "error");
      }
    }, "로그아웃 확인");
  };

  return (
    <div className="layout-container">
      {/* 1. 좌측 사이드바 */}
      <aside className="sidebar">
        {/* 로고 영역 (홈 버튼 역할) */}
        <div className="sidebar-logo-container">
          <a href="/main" className="sidebar-logo">
            전담노트
          </a>
        </div>

        {/* 학급 선택 영역 */}
        {/* 사이드바 프로필 영역 */}
        <div className="sidebar-profile-area">
          <div className="teacher-profile-card">
            <div className="profile-subtitle">{teacherName} 선생님의</div>
            <div className="profile-title">{roomName} 전담교실</div>
            <button 
              className="profile-edit-btn" 
              onClick={() => setIsProfileEditOpen(true)}
              title="정보 수정"
            >
              ⚙️
            </button>
          </div>

          <div className="pin-code-card">
            <div className="pin-label">입장 코드 (PIN)</div>
            <div className="pin-number">{sessionCode}</div>
          </div>
        </div>

        {/* 내비게이션 메뉴 */}
        <nav className="sidebar-nav">
          <ul>
            <li>
              <a href="/main/all-students" className={`nav-item ${location.pathname.startsWith('/main/all-students') || location.pathname.startsWith('/main/class-list') ? 'active' : ''}`}>
                학생 명단
              </a>
            </li>
            <li>
              <a href="/main/behavior" className={`nav-item ${location.pathname.startsWith('/main/behavior') ? 'active' : ''}`}>
                행동기록
              </a>
            </li>
            <li>
              <a href="/main/progress" className={`nav-item ${location.pathname.startsWith('/main/progress') ? 'active' : ''}`}>
                수업 관리
              </a>
            </li>
            <li>
              <a href="/main/tools" className={`nav-item ${location.pathname.startsWith('/main/tools') ? 'active' : ''}`}>
                수업 도구
              </a>
            </li>
            <li>
              <a href="/main/mission" className={`nav-item ${location.pathname.startsWith('/main/mission') ? 'active' : ''}`}>
                단체 미션
              </a>
            </li>
          </ul>
        </nav>

        {/* 사이드바 하단 로그아웃 */}
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>로그아웃</button>
        </div>
      </aside>

      <div className="main-content">
        {/* 상단 전역 탭 영역 — MainTabNavigation 컴포넌트로 분리 */}
        <MainTabNavigation location={location} getTabTitle={getTabTitle} />

        {/* 실제 페이지(MainPage, 등)가 렌더링되는 영역 */}
        <div className="page-content">
          <Outlet />
        </div>
      </div>

      {/* 내 정보 수정 모달 */}
      <ProfileEditModal 
        isOpen={isProfileEditOpen} 
        onClose={() => setIsProfileEditOpen(false)}
        onUpdate={(newData) => {
          if (newData.roomName) setRoomName(newData.roomName);
        }}
      />
    </div>
  );
}

export default DashboardLayout;
