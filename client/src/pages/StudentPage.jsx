import React, { useState, useEffect } from 'react';
import './StudentPage.css';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, onSnapshot, serverTimestamp, addDoc, query, where } from 'firebase/firestore';
import StudentGrowthModal from '../components/student/StudentGrowthModal';
import StudentDiaryModal from '../components/student/StudentDiaryModal';
import StudentQnaModal from '../components/student/StudentQnaModal';
import StudentMissionModal from '../components/student/StudentMissionModal';

function StudentPage() {
  // 모달 관리 (null, 'attendance', 'growth', 'diary', 'qna', 'mission')
  const [activeModal, setActiveModal] = useState(null);

  // 폼 입력 상태
  const [growthType, setGrowthType] = useState('');
  const [growthRecords, setGrowthRecords] = useState([{ round: 1, value: '' }]);
  const [growthMemo, setGrowthMemo] = useState('');
  const [diaryText, setDiaryText] = useState('');
  const [qnaText, setQnaText] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);

  // Firebase 연동 상태
  const [categories, setCategories] = useState([]);
  const [teacherUid, setTeacherUid] = useState(null);
  const [studentDocId, setStudentDocId] = useState(null);
  const [classDocId, setClassDocId] = useState(null); // 동아리 모드일 때는 clubDocId가 들어감
  const [entryMode, setEntryMode] = useState('class');

  const [studentInfo, setStudentInfo] = useState({ grade: 5, classNum: 1, name: '학생을 불러오는 중...' });

  useEffect(() => {
    // 로그인 페이지에서 입력한 학생 정보 가져오기
    const savedStudent = localStorage.getItem('studentInfo');
    let targetGrade = 5, targetClassNum = 1, targetName = '', savedTeacherUid = null;

    if (savedStudent) {
      const parsed = JSON.parse(savedStudent);
      targetGrade = parsed.grade; targetClassNum = parsed.classNumber;
      targetName = parsed.name; savedTeacherUid = parsed.teacherUid;
      setStudentInfo({ grade: targetGrade, classNum: targetClassNum, name: targetName });
    }

    const savedEntryMode = localStorage.getItem('entryMode') || 'class';
    setEntryMode(savedEntryMode);

    const loadData = async (uid) => {
      setTeacherUid(uid);
      try {
        const studentSnap = await getDocs(collection(db, 'users', uid, 'students'));
        if (!studentSnap.empty) {
          let targetStudentDoc = null;
          // 1. 이름/학년/반으로 정확히 검색
          if (targetName) {
            targetStudentDoc = studentSnap.docs.find(d => {
              const data = d.data();
              return data.grade === targetGrade && data.class_number === targetClassNum && data.name === targetName;
            });
          }
          // 2. 없으면 첫 번째 학생을 기본 선택
          if (!targetStudentDoc) targetStudentDoc = studentSnap.docs[0];

          if (targetStudentDoc) {
            const sData = targetStudentDoc.data();
            setStudentInfo({ grade: sData.grade, classNum: sData.class_number, studentNum: sData.student_number, name: sData.name, club: sData.club || '' });
            setStudentDocId(targetStudentDoc.id);

            let groupIdToFetch = null;
            if (savedEntryMode === 'club' && sData.club) {
              const clubSnap = await getDocs(collection(db, 'users', uid, 'clubs'));
              const targetClub = clubSnap.docs.find(d => d.data().name === sData.club);
              if (targetClub) { setClassDocId(targetClub.id); groupIdToFetch = targetClub.id; }
            } else {
              const classSnap = await getDocs(collection(db, 'users', uid, 'classes'));
              const targetClass = classSnap.docs.find(d => { const cData = d.data(); return cData.grade === sData.grade && cData.class_number === sData.class_number; });
              if (targetClass) { setClassDocId(targetClass.id); groupIdToFetch = targetClass.id; }
            }

            // 그룹 확인 후 해당 그룹의 성장 기록 카테고리 실시간 연동
            if (groupIdToFetch) {
              const catQ = query(collection(db, 'users', uid, 'growth_categories'), where('groupId', '==', groupIdToFetch));
              onSnapshot(catQ, (catSnap) => {
                const catList = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                setCategories(catList);
                if (catList.length > 0) {
                  setGrowthType(prevType => {
                    if (!catList.find(c => c.id === prevType)) {
                      const firstCat = catList[0];
                      setGrowthRecords(Array.from({ length: firstCat.columnCount || 1 }, (_, i) => ({ round: i + 1, value: '' })));
                      return firstCat.id;
                    }
                    return prevType;
                  });
                } else { setGrowthType(''); setGrowthRecords([{ round: 1, value: '' }]); }
              }, (error) => console.error('카테고리 실시간 연동 오류:', error));
            }
          }
        }
      } catch (e) { console.error('데이터 로딩 오류:', e); }
    };

    if (savedTeacherUid) { loadData(savedTeacherUid); }
    else {
      const unsubscribe = onAuthStateChanged(auth, (user) => { if (user) loadData(user.uid); });
      return () => unsubscribe();
    }
  }, []);

  // 성장 기록 모달 열릴 때 기존 데이터 실시간 연동
  useEffect(() => {
    let unsubscribeRecord = null;
    if (activeModal === 'growth' && growthType && teacherUid && classDocId && studentDocId) {
      const docId = `${selectedDate}_${entryMode}_${classDocId}_${growthType}`;
      const docRef = doc(db, 'users', teacherUid, 'growth_detail_records', docId);
      unsubscribeRecord = onSnapshot(docRef, (docSnap) => {
        let existingData = null;
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.records && data.records[studentDocId]) existingData = data.records[studentDocId];
        }
        const selectedCat = categories.find(c => c.id === growthType);
        const count = selectedCat ? (selectedCat.columnCount || 1) : 1;
        if (existingData) {
          setGrowthRecords(Array.from({ length: count }, (_, i) => ({ round: i + 1, value: existingData.values && existingData.values[i] !== undefined ? existingData.values[i] : (i === 0 ? existingData.value || '' : '') })));
          setGrowthMemo(existingData.note || '');
        } else {
          setGrowthRecords(Array.from({ length: count }, (_, i) => ({ round: i + 1, value: '' })));
          setGrowthMemo('');
        }
      }, (error) => console.error('기존 기록 가져오기 오류:', error));
    }
    return () => { if (unsubscribeRecord) unsubscribeRecord(); };
  }, [activeModal, growthType, teacherUid, classDocId, studentDocId, categories, selectedDate]);

  const closeModal = () => {
    setActiveModal(null);
    if (categories.length > 0) {
      const firstCat = categories[0];
      setGrowthType(firstCat.id);
      setGrowthRecords(Array.from({ length: firstCat.columnCount || 1 }, (_, i) => ({ round: i + 1, value: '' })));
    } else { setGrowthRecords([{ round: 1, value: '' }]); }
    setGrowthMemo(''); setDiaryText(''); setQnaText('');
  };

  const handleSubmit = async (type) => {
    if (type === 'growth') {
      if (!teacherUid || !classDocId || !studentDocId || !growthType) {
        alert('데이터베이스 연결 정보를 찾을 수 없습니다. (교사 미로그인 상태이거나 학급/학생 정보 없음)');
        return;
      }
      const docId = `${selectedDate}_${entryMode}_${classDocId}_${growthType}`;
      const docRef = doc(db, 'users', teacherUid, 'growth_detail_records', docId);
      const values = growthRecords.map(r => r.value).filter(v => v !== '');
      try {
        await setDoc(docRef, { date: selectedDate, categoryId: growthType, groupId: classDocId, groupType: entryMode, records: { [studentDocId]: { values, value: values[0] || '', note: growthMemo } }, updated_at: new Date().toISOString() }, { merge: true });
        alert('성장 기록이 성공적으로 제출되어 선생님 기록표에 즉시 반영되었습니다! 😊');
      } catch (e) { console.error('기록 제출 실패:', e); alert('기록 제출 중 오류가 발생했습니다.'); }
    } else if (type === 'diary' || type === 'qna') {
      if (!teacherUid || !studentDocId) { alert('데이터베이스 연결 정보를 찾을 수 없습니다.'); return; }
      const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const text = type === 'diary' ? diaryText : qnaText;
      if (!text.trim()) { alert('내용을 입력해주세요.'); return; }
      const collectionName = type === 'diary' ? 'accumulated_records' : 'student_questions';
      try {
        await addDoc(collection(db, 'users', teacherUid, collectionName), { type: 'text', content: type === 'diary' ? `[체육일기] ${text}` : text, date: today, studentId: studentDocId, studentName: studentInfo.name, grade: studentInfo.grade, classNum: studentInfo.classNum, studentNum: studentInfo.studentNum, club: studentInfo.club, timestamp: serverTimestamp(), isStudentEntry: true });
        alert(`${type === 'diary' ? '체육 일기가' : '선생님께 한마디가'} 성공적으로 전달되었습니다! 😊`);
        closeModal();
      } catch (e) { console.error('저장 실패:', e); alert('저장 중 오류가 발생했습니다.'); }
    } else {
      alert('기록이 성공적으로 제출되었습니다! 선생님께서 확인하실 거예요. 😊');
      closeModal();
    }
  };

  // 분리된 모달 컴포넌트를 type에 따라 렌더링
  const renderModalContent = () => {
    switch (activeModal) {
      case 'growth':
        return <StudentGrowthModal categories={categories} growthType={growthType} setGrowthType={setGrowthType} growthRecords={growthRecords} setGrowthRecords={setGrowthRecords} growthMemo={growthMemo} setGrowthMemo={setGrowthMemo} selectedDate={selectedDate} setSelectedDate={setSelectedDate} onSubmit={() => handleSubmit('growth')} onClose={closeModal} />;
      case 'diary':
        return <StudentDiaryModal diaryText={diaryText} setDiaryText={setDiaryText} onSubmit={() => handleSubmit('diary')} onClose={closeModal} />;
      case 'qna':
        return <StudentQnaModal qnaText={qnaText} setQnaText={setQnaText} onSubmit={() => handleSubmit('qna')} onClose={closeModal} />;
      case 'mission':
        return <StudentMissionModal onClose={closeModal} />;
      default: return null;
    }
  };

  return (
    <div className="student-page-container">
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

      <main className="student-menu-grid">
        <button className="menu-card card-green" onClick={() => setActiveModal('growth')}>
          <div className="card-icon">📏</div>
          <div className="card-content"><h3>성장 기록 입력</h3><p>오늘 나의 팝스(PAPS)나 활동 측정 기록을 입력해요.</p></div>
        </button>
        <button className="menu-card card-orange" onClick={() => setActiveModal('diary')}>
          <div className="card-icon">📓</div>
          <div className="card-content"><h3>오늘의 체육 일기</h3><p>오늘 수업에서 배운 점이나 느낀 점을 짧게 기록해요.</p></div>
        </button>
        <button className="menu-card card-purple" onClick={() => setActiveModal('qna')}>
          <div className="card-icon">💬</div>
          <div className="card-content"><h3>선생님께 한마디</h3><p>질문이 있거나 선생님께 하고 싶은 말이 있다면 적어주세요.</p></div>
        </button>
        <button className="menu-card card-pink" onClick={() => setActiveModal('mission')}>
          <div className="card-icon">🎯</div>
          <div className="card-content"><h3>우리 반 미션 진행 상황</h3><p>현재 우리 반의 단체 칭찬 점수와 미션 현황을 확인해요!</p></div>
        </button>
      </main>

      {activeModal && (
        <div className="student-modal-overlay" onClick={closeModal}>
          <div className="student-modal-content" onClick={(e) => e.stopPropagation()}>
            {renderModalContent()}
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentPage;
