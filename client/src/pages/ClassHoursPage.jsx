import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase/config';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { useModal } from '../components/common/GlobalModal';
import './ClassHoursPage.css';

function ClassHoursPage() {
  const { showAlert } = useModal();
  const days = ['월요일', '화요일', '수요일', '목요일', '금요일'];
  const periods = ['0교시', '1교시', '2교시', '3교시', '4교시', '5교시', '6교시', '7교시'];

  const [classOptions, setClassOptions] = useState([{ id: 'none', name: '선택 안함' }]);
  const [timetable, setTimetable] = useState(Array(8).fill(null).map(() => Array(5).fill('none')));
  const [currentUser, setCurrentUser] = useState(null);

  // 서버에서 시간표 데이터 불러오기
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      setCurrentUser(user);

      try {
        // 1. 서버(Firestore) 데이터 확인
        const docRef = doc(db, 'users', user.uid, 'settings', 'timetable');
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          setTimetable(snap.data().data);
        } else {
          // 2. 서버에 없으면 로컬 데이터 마이그레이션 시도
          const saved = localStorage.getItem('master_timetable');
          if (saved) {
            const parsed = JSON.parse(saved);
            const formatted = parsed.length === 7 ? [Array(5).fill('none'), ...parsed] : parsed;
            setTimetable(formatted);
            // 자동으로 서버에 백업
            await setDoc(docRef, { data: formatted, updatedAt: new Date().toISOString() });
          }
        }

        // 학급/동아리 목록 가져오기
        const classesSnapshot = await getDocs(collection(db, 'users', user.uid, 'classes'));
        const classesData = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          name: `${doc.data().grade}학년 ${doc.data().class_number}반`,
          type: 'class'
        }));

        const clubsSnapshot = await getDocs(collection(db, 'users', user.uid, 'clubs'));
        const clubsData = clubsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          type: 'club'
        }));

        setClassOptions([{ id: 'none', name: '선택 안함' }, ...classesData, ...clubsData]);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSelectChange = (rowIndex, colIndex, value) => {
    const newTimetable = [...timetable];
    newTimetable[rowIndex][colIndex] = value;
    setTimetable(newTimetable);
  };

  const saveTimetable = async () => {
    if (!currentUser) return showAlert('로그인이 필요합니다.', '오류', 'error');
    
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'timetable'), {
        data: timetable,
        updatedAt: new Date().toISOString()
      });
      // 로컬스토리지에도 백업 (오프라인 대비)
      localStorage.setItem('master_timetable', JSON.stringify(timetable));
      showAlert('기초시간표가 클라우드에 안전하게 저장되었습니다.', '저장 완료');
    } catch (e) {
      console.error(e);
      showAlert('저장 중 오류가 발생했습니다.', '저장 실패', 'error');
    }
  };

  return (
    <div className="timetable-dashboard">
      <div className="timetable-header">
        <div className="title-area">
          <h2 className="timetable-title">📅 기초시간표 설정</h2>
          <p className="timetable-subtitle">주간 고정 수업 일정을 선택하여 관리하세요.</p>
        </div>
        <button className="btn-save-timetable-top" onClick={saveTimetable}>💾 저장하기</button>
      </div>

      <div className="timetable-card">
        <table className="timetable-table">
          <thead>
            <tr>
              <th className="diagonal-header">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                  <line x1="0" y1="0" x2="100" y2="100" stroke="#cbd5e1" strokeWidth="1" />
                </svg>
                <span className="diagonal-text-day">요일</span>
                <span className="diagonal-text-period">교시</span>
              </th>
              {days.map((day, idx) => (
                <th key={idx} className="day-header">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period, rIdx) => (
              <tr key={rIdx}>
                <td className="period-label-col">{period}</td>
                {days.map((_, cIdx) => (
                  <td key={cIdx} className="timetable-td">
                    <select 
                      className={`timetable-select ${timetable[rIdx][cIdx] !== 'none' ? 'has-value' : ''}`}
                      value={timetable[rIdx][cIdx]}
                      onChange={(e) => handleSelectChange(rIdx, cIdx, e.target.value)}
                    >
                      {classOptions.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>


    </div>
  );
}

export default ClassHoursPage;
