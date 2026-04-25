import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './auth.css';
import { auth, db } from '../../firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { useModal } from '../../components/common/GlobalModal';
import TeacherLoginForm from './TeacherLoginForm';
import StudentLoginForm from './StudentLoginForm';
import StudentModeSelectionModal from './StudentModeSelectionModal';

const GREETINGS = [
  "오늘도 수고하셨습니다 선생님! 🌿",
  "오늘도 힘찬 하루! 항상 파이팅입니다! 💪",
  "선생님의 열정을 응원합니다! ✨",
  "사랑으로 아이들을 품는 선생님, 존경합니다! 💚"
];

function LoginPage() {
  const { showAlert } = useModal();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');
  
  // 로그인 모드 탭 (교사/학생)
  const [activeMode, setActiveMode] = useState('teacher');
  
  // 교사용 state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 학생용 state
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [grade, setGrade] = useState('');
  const [classNumber, setClassNumber] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [studentName, setStudentName] = useState('');

  // 학생 모드 선택 모달 관련 상태
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [tempStudentData, setTempStudentData] = useState(null);

  useEffect(() => {
    const randomIdx = Math.floor(Math.random() * GREETINGS.length);
    setGreeting(GREETINGS[randomIdx]);

    // QR 코드 접속이나 재접속 시 이전 로그인 세션이 남아있을 수 있으므로
    // 로그인 페이지에 진입하면 항상 로그아웃 처리를 하여 깨끗한 상태로 시작합니다.
    const cleanSlate = async () => {
      try {
        await auth.signOut();
        // 세션 초기화 후 로컬 저장소의 일부 정보도 정리 (필요시)
        localStorage.removeItem('teacherName');
      } catch (err) {
        console.error("Sign out error:", err);
      }
    };
    cleanSlate();

    // URL 파라미터 체크 (예: QR 코드 주소를 /?mode=student 로 설정한 경우)
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'student') {
      setActiveMode('student');
    }
  }, []);

  const handleTeacherLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Firestore에서 선생님 정보 가져와서 localStorage 동기화 및 입장 코드 갱신
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        localStorage.setItem('teacherName', userData.name);
        localStorage.setItem('roomName', userData.room_name || '전담교실');
        
        // 방 코드(room_code) 관리: 오늘 날짜 기준으로 하루 동안 일정하게 유지
        const now = new Date();
        const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000)).toISOString().split('T')[0];
        
        if (!userData.room_code || userData.room_code_date !== kstDate) {
          // 코드가 없거나 날짜가 바뀌었을 때만 무작위 6자리 방 코드로 갱신
          const newCode = Math.floor(100000 + Math.random() * 900000).toString();
          await updateDoc(doc(db, "users", user.uid), { 
            room_code: newCode,
            room_code_date: kstDate 
          });
        }
      }

      navigate('/main');
    } catch (error) {
      console.error("Login error:", error);
      if (error.code === 'auth/invalid-login-credentials' || error.code === 'auth/invalid-email') {
        showAlert("이메일 또는 비밀번호가 올바르지 않습니다.", "로그인 실패", "error");
      } else if (error.code === 'auth/user-not-found') {
        showAlert("등록되지 않은 사용자입니다.", "로그인 실패", "error");
      } else if (error.code === 'auth/wrong-password') {
        showAlert("비밀번호가 틀렸습니다.", "로그인 실패", "error");
      } else {
        showAlert("로그인 중 오류가 발생했습니다: " + error.message, "오류", "error");
      }
    }
  };

  const handleStudentLogin = async (e) => {
    e.preventDefault();

    try {
      // 1. 입력한 교실 이름(roomName)이 실제 존재하는지 Firestore에서 검색
      const q = query(collection(db, "users"), where("room_name", "==", roomName));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        showAlert(`'${roomName}'(이)라는 전담 교실을 찾을 수 없습니다. 오타가 없는지 확인해 주세요!`, "교실 찾기 실패", "error");
        return;
      }

      // 2. 교실을 찾았다면 해당 선생님의 데이터와 UID를 가져옴
      const teacherDoc = querySnapshot.docs[0];
      const teacherData = teacherDoc.data();
      const teacherUid = teacherDoc.id;

      // 2-1. 학생이 입력한 방 코드(roomCode)가 선생님의 room_code와 일치하는지 확인
      if (teacherData.room_code !== roomCode) {
        showAlert("학생 입장 코드가 일치하지 않습니다. 선생님 화면에 표시된 6자리 숫자를 다시 확인해 주세요.", "입장 실패", "error");
        return;
      }

      // 3. 선생님의 DB에 해당 학생이 존재하는지 검색
      const studentQ = query(
        collection(db, "users", teacherUid, "students"),
        where("grade", "==", Number(grade)),
        where("class_number", "==", Number(classNumber)),
        where("student_number", "==", Number(studentNumber)),
        where("name", "==", studentName)
      );
      const studentSnap = await getDocs(studentQ);

      if (studentSnap.empty) {
        showAlert("입력하신 정보와 일치하는 학생을 찾을 수 없습니다. 학년, 반, 번호, 이름을 다시 확인해 주세요.", "학생 찾기 실패", "error");
        return;
      }

      // 4. 학생 데이터 확인 및 입장 처리
      const studentData = studentSnap.docs[0].data();
      const sInfo = {
        grade: Number(grade),
        classNumber: Number(classNumber),
        studentNumber: Number(studentNumber),
        name: studentName,
        roomName: roomName,
        teacherUid: teacherUid,
        club: studentData.club || ''
      };

      if (studentData.club) {
        // 동아리가 있는 학생이면 선택 모달 표시
        setTempStudentData(sInfo);
        setShowModeSelection(true);
      } else {
        // 동아리가 없으면 학급 모드로 바로 입장
        proceedLogin(sInfo, 'class');
      }
    } catch (error) {
      console.error("Student Login Error:", error);
      showAlert("교실 정보를 확인하는 중 오류가 발생했습니다.", "오류", "error");
    }
  };

  const proceedLogin = (sInfo, mode) => {
    localStorage.setItem('studentInfo', JSON.stringify(sInfo));
    localStorage.setItem('entryMode', mode);
    navigate('/student');
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h1 className="auth-title">전담노트</h1>
        <p className="auth-greeting">{greeting}</p>
      </div>

      <div className="auth-card" style={{ padding: '0' }}>
        
        {/* 모드 전환 탭 */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
          <button 
            type="button"
            onClick={() => setActiveMode('teacher')}
            style={{ 
              flex: 1, padding: '16px 0', fontSize: '15px', fontWeight: 'bold', border: 'none', cursor: 'pointer',
              backgroundColor: activeMode === 'teacher' ? 'var(--color-white)' : '#f8f9fa',
              color: activeMode === 'teacher' ? 'var(--color-primary-dark)' : '#aaa',
              borderBottom: activeMode === 'teacher' ? '2px solid var(--color-primary)' : 'none',
              borderRadius: 'var(--radius-lg) 0 0 0'
            }}
          >
            👩‍🏫 선생님 로그인
          </button>
          <button 
            type="button"
            onClick={() => setActiveMode('student')}
            style={{ 
              flex: 1, padding: '16px 0', fontSize: '15px', fontWeight: 'bold', border: 'none', cursor: 'pointer',
              backgroundColor: activeMode === 'student' ? 'var(--color-white)' : '#f8f9fa',
              color: activeMode === 'student' ? 'var(--color-primary-dark)' : '#aaa',
              borderBottom: activeMode === 'student' ? '2px solid var(--color-primary)' : 'none',
              borderRadius: '0 var(--radius-lg) 0 0'
            }}
          >
            👦 학생 가입/접속
          </button>
        </div>

        <div style={{ padding: '32px' }}>
          {activeMode === 'teacher' ? (
            <TeacherLoginForm 
              email={email} 
              setEmail={setEmail} 
              password={password} 
              setPassword={setPassword} 
              handleTeacherLogin={handleTeacherLogin} 
            />
          ) : (
            <StudentLoginForm 
              roomName={roomName} setRoomName={setRoomName}
              grade={grade} setGrade={setGrade}
              classNumber={classNumber} setClassNumber={setClassNumber}
              studentNumber={studentNumber} setStudentNumber={setStudentNumber}
              studentName={studentName} setStudentName={setStudentName}
              roomCode={roomCode} setRoomCode={setRoomCode}
              handleStudentLogin={handleStudentLogin}
            />
          )}
        </div>
      </div>

      {/* 모드 선택 모달 — 컴포넌트로 분리 */}
      <StudentModeSelectionModal 
        show={showModeSelection} 
        studentData={tempStudentData} 
        onSelect={proceedLogin} 
        onCancel={() => setShowModeSelection(false)} 
      />
    </div>
  );
}

export default LoginPage;
