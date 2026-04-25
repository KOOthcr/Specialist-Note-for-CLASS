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

  // 1. 사용자 인증 상태 관리
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user || null);
    });
    return () => unsubscribe();
  }, []);

  // 2. 사용자 정보가 확인되면 데이터 불러오기
  useEffect(() => {
    if (!currentUser) return;

    const fetchData = async () => {
      const uid = currentUser.uid;
      
      try {
        // [1] 학급 목록 가져오기
        const classesRef = collection(db, 'users', uid, 'classes');
        const classesSnap = await getDocs(classesRef);
        const classesData = classesSnap.docs.map(d => ({
          id: d.id,
          name: `${d.data().grade}학년 ${d.data().class_number}반`,
          type: 'class'
        })).sort((a, b) => a.name.localeCompare(b.name));

        // [2] 동아리 목록 가져오기
        const clubsRef = collection(db, 'users', uid, 'clubs');
        const clubsSnap = await getDocs(clubsRef);
        const clubsData = clubsSnap.docs.map(d => ({
          id: d.id,
          name: `⭐ ${d.data().name}`,
          type: 'club'
        }));

        setClassOptions([{ id: 'none', name: '선택 안함' }, ...classesData, ...clubsData]);

        // [3] 시간표 설정 가져오기
        const timetableRef = doc(db, 'users', uid, 'settings', 'timetable');
        const timetableSnap = await getDoc(timetableRef);
        
        if (timetableSnap.exists()) {
          const rawData = timetableSnap.data().data;
          if (rawData && !Array.isArray(rawData)) {
            // 객체 타입을 배열로 복구
            const recovered = Array(8).fill(null).map((_, i) => rawData[i] || Array(5).fill('none'));
            setTimetable(recovered);
          } else {
            setTimetable(rawData || Array(8).fill(null).map(() => Array(5).fill('none')));
          }
        } else {
          // 마이그레이션 백업
          const saved = localStorage.getItem('master_timetable');
          if (saved) {
            const parsed = JSON.parse(saved);
            const formatted = parsed.length === 7 ? [Array(5).fill('none'), ...parsed] : parsed;
            setTimetable(formatted);
          }
        }
      } catch (error) {
        console.error("데이터 로드 중 오류 발생:", error);
      }
    };

    fetchData();
  }, [currentUser]);

  const handleSelectChange = (rowIndex, colIndex, value) => {
    const newTimetable = [...timetable];
    newTimetable[rowIndex][colIndex] = value;
    setTimetable(newTimetable);
  };

  const saveTimetable = async () => {
    if (!currentUser) return showAlert('로그인이 필요합니다.', '오류', 'error');
    
    try {
      // Firestore는 중첩 배열(Array inside Array) 저장을 지원하지 않으므로 객체로 변환
      const formattedData = {};
      timetable.forEach((row, idx) => {
        formattedData[idx] = row;
      });

      await setDoc(doc(db, 'users', currentUser.uid, 'settings', 'timetable'), {
        data: formattedData,
        updatedAt: new Date().toISOString()
      });
      
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
