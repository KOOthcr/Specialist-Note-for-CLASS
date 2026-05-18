import React, { useState, useEffect } from 'react';
import './StudentPage.css';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, onSnapshot, serverTimestamp, addDoc, query, where } from 'firebase/firestore';
import { useModal } from '../components/common/GlobalModal';
import StudentGrowthModal from '../components/student/StudentGrowthModal';
import StudentDiaryModal from '../components/student/StudentDiaryModal';
import StudentQnaModal from '../components/student/StudentQnaModal';
import StudentMissionModal from '../components/student/StudentMissionModal';
import { StudentHeader, StudentMenu } from '../components/student/StudentPageComponents';

function StudentPage() {
  const { showAlert } = useModal();
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
  const [classDocId, setClassDocId] = useState(null); 
  const [entryMode, setEntryMode] = useState('class');
  const [studentInfo, setStudentInfo] = useState({ grade: 5, classNum: 1, name: '학생을 불러오는 중...' });

  useEffect(() => {
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
        if (studentSnap.empty) return;
        const targetStudentDoc = (targetName ? studentSnap.docs.find(d => d.data().grade === targetGrade && d.data().class_number === targetClassNum && d.data().name === targetName) : null) || studentSnap.docs[0];
        if (!targetStudentDoc) return;
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
          const targetClass = classSnap.docs.find(d => d.data().grade === sData.grade && d.data().class_number === sData.class_number);
          if (targetClass) { setClassDocId(targetClass.id); groupIdToFetch = targetClass.id; }
        }

        if (groupIdToFetch) {
          onSnapshot(query(collection(db, 'users', uid, 'growth_categories'), where('groupId', '==', groupIdToFetch)), (catSnap) => {
            const catList = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setCategories(catList);
            if (catList.length > 0) {
              setGrowthType(prevType => {
                if (catList.find(c => c.id === prevType)) return prevType;
                const fc = catList[0];
                setGrowthRecords(Array.from({ length: fc.columnCount || 1 }, (_, i) => ({ round: i + 1, value: '' })));
                return fc.id;
              });
            } else { setGrowthType(''); setGrowthRecords([{ round: 1, value: '' }]); }
          }, (error) => console.error(error));
        }
      } catch (e) { console.error('데이터 로딩 오류:', e); }
    };

    if (savedTeacherUid) loadData(savedTeacherUid);
    else {
      const unsubscribe = onAuthStateChanged(auth, (user) => { if (user) loadData(user.uid); });
      return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    let unsub = null;
    if (activeModal === 'growth' && growthType && teacherUid && classDocId && studentDocId) {
      const docId = `${selectedDate}_${entryMode}_${classDocId}_${growthType}`;
      unsub = onSnapshot(doc(db, 'users', teacherUid, 'growth_detail_records', docId), (snap) => {
        const existingData = snap.exists() && snap.data().records?.[studentDocId];
        const count = categories.find(c => c.id === growthType)?.columnCount || 1;
        setGrowthRecords(Array.from({ length: count }, (_, i) => ({ round: i + 1, value: existingData ? (existingData.values?.[i] !== undefined ? existingData.values[i] : (i === 0 ? existingData.value || '' : '')) : '' })));
        setGrowthMemo(existingData ? existingData.note || '' : '');
      }, (error) => console.error('기존 기록 가져오기 오류:', error));
    }
    return () => unsub && unsub();
  }, [activeModal, growthType, teacherUid, classDocId, studentDocId, categories, selectedDate]);

  useEffect(() => {
    document.body.style.overflow = activeModal ? 'hidden' : '';
    if (activeModal) document.body.classList.add('modal-open');
    else document.body.classList.remove('modal-open');
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    };
  }, [activeModal]);

  const closeModal = () => {
    setActiveModal(null);
    if (categories.length > 0) {
      const fc = categories[0]; setGrowthType(fc.id);
      setGrowthRecords(Array.from({ length: fc.columnCount || 1 }, (_, i) => ({ round: i + 1, value: '' })));
    } else { setGrowthRecords([{ round: 1, value: '' }]); }
    setGrowthMemo(''); setDiaryText(''); setQnaText('');
  };

  const handleSubmit = async (type) => {
    if (!teacherUid || !studentDocId) return showAlert('데이터베이스 연결 정보를 찾을 수 없습니다.', '오류', 'error');
    if (type === 'growth') {
      if (!classDocId || !growthType) return showAlert('학급/성장기록 정보를 찾을 수 없습니다.', '오류', 'error');
      const docId = `${selectedDate}_${entryMode}_${classDocId}_${growthType}`;
      const docRef = doc(db, 'users', teacherUid, 'growth_detail_records', docId);
      const values = growthRecords.map(r => r.value).filter(v => v !== '');
      try {
        await setDoc(docRef, { date: selectedDate, categoryId: growthType, groupId: classDocId, groupType: entryMode, records: { [studentDocId]: { values, value: values[0] || '', note: growthMemo } }, updated_at: new Date().toISOString() }, { merge: true });
        showAlert('성장 기록이 제출되어 교사 기록표에 즉시 반영되었습니다! 😊', '제출 완료'); closeModal();
      } catch (e) { console.error(e); showAlert('기록 제출 중 오류가 발생했습니다.', '오류', 'error'); }
    } else if (type === 'diary' || type === 'qna') {
      const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const text = type === 'diary' ? diaryText : qnaText;
      if (!text.trim()) return showAlert('내용을 입력해주세요.', '알림');
      const collectionName = type === 'diary' ? 'accumulated_records' : 'student_questions';
      try {
        await addDoc(collection(db, 'users', teacherUid, collectionName), { type: 'text', content: type === 'diary' ? `[체육일기] ${text}` : text, date: today, studentId: studentDocId, studentName: studentInfo.name, grade: studentInfo.grade, classNum: studentInfo.classNum, studentNum: studentInfo.studentNum, club: studentInfo.club, timestamp: serverTimestamp(), isStudentEntry: true });
        showAlert(`${type === 'diary' ? '체육 일기가' : '선생님께 한마디가'} 성공적으로 전달되었습니다! 😊`, '전달 완료'); closeModal();
      } catch (e) { console.error(e); showAlert('저장 중 오류가 발생했습니다.', '오류', 'error'); }
    }
  };

  const renderModalContent = () => {
    if (activeModal === 'growth') return <StudentGrowthModal categories={categories} growthType={growthType} setGrowthType={setGrowthType} growthRecords={growthRecords} setGrowthRecords={setGrowthRecords} growthMemo={growthMemo} setGrowthMemo={setGrowthMemo} selectedDate={selectedDate} setSelectedDate={setSelectedDate} onSubmit={() => handleSubmit('growth')} onClose={closeModal} />;
    if (activeModal === 'diary') return <StudentDiaryModal diaryText={diaryText} setDiaryText={setDiaryText} onSubmit={() => handleSubmit('diary')} onClose={closeModal} />;
    if (activeModal === 'qna') return <StudentQnaModal qnaText={qnaText} setQnaText={setQnaText} onSubmit={() => handleSubmit('qna')} onClose={closeModal} />;
    if (activeModal === 'mission') return <StudentMissionModal onClose={closeModal} />;
    return null;
  };

  return (
    <div className="student-page-container">
      <StudentHeader entryMode={entryMode} studentInfo={studentInfo} />
      <StudentMenu setActiveModal={setActiveModal} />
      {activeModal && (
        <div className="student-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="student-modal-content" onClick={(e) => e.stopPropagation()}>
            {renderModalContent()}
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentPage;
