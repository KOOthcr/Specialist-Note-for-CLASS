import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db, auth } from '../firebase/config';
import { collection, getDocs, doc, setDoc, getDoc, query, where } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import * as XLSX from 'xlsx';
import { useModal } from '../components/common/GlobalModal';
import SophisticatedDatePicker from '../components/common/SophisticatedDatePicker';
import WeekNavigator from '../components/common/WeekNavigator';
import './ProgressCheckPage.css';



function ProgressCheckPage() {
  const { showAlert } = useModal();
  const [currentUser, setCurrentUser] = useState(null);
  const [groups, setGroups] = useState([]); 
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [tableData, setTableData] = useState([]); 
  const [semester1Plans, setSemester1Plans] = useState([]);
  const [semester2Plans, setSemester2Plans] = useState([]);
  const [offsets, setOffsets] = useState({});
  const [selectedSemester, setSelectedSemester] = useState(() => {
    const month = new Date().getMonth() + 1;
    return (month >= 3 && month <= 8) ? 1 : 2;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchInitialData(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchInitialData = async (uid) => {
    try {
      const classesRef = collection(db, 'users', uid, 'classes');
      const classSnap = await getDocs(classesRef);
      const uniqueGrades = [...new Set(classSnap.docs.map(doc => doc.data().grade))].sort();
      
      const clubsRef = collection(db, 'users', uid, 'clubs');
      const clubSnap = await getDocs(clubsRef);
      const clubs = clubSnap.docs.map(doc => ({ id: `club-${doc.id}`, name: `⭐ ${doc.data().name}`, val: doc.id, type: 'club' }));

      const allGroups = [
        ...uniqueGrades.map(g => ({ id: `grade-${g}`, name: `${g}학년`, val: g, type: 'grade' })),
        ...clubs
      ];
      setGroups(allGroups);
      if (allGroups.length > 0) setSelectedGroupId(allGroups[0].id);

      // 1. 최신 데이터(v2) 시도
      let planRef = doc(db, 'users', uid, 'curriculum', 'annual_plans_dynamic_v2');
      let planSnap = await getDoc(planRef);
      
      // 2. 최신 데이터가 없으면 구버전(annual_plans) 시도
      if (!planSnap.exists()) {
        const oldRef = doc(db, 'users', uid, 'curriculum', 'annual_plans');
        const oldSnap = await getDoc(oldRef);
        if (oldSnap.exists()) {
          planSnap = oldSnap;
          console.log("Old curriculum data (v1) found for Progress Check.");
        }
      }

      if (planSnap && planSnap.exists()) {
        const data = planSnap.data();
        // 구조에 따른 유연한 데이터 매핑
        if (data.semester1 || data.semester2) {
          setSemester1Plans(data.semester1 || []);
          setSemester2Plans(data.semester2 || []);
        } else if (data.plans) {
          setSemester1Plans(data.plans);
          setSemester2Plans([]);
        }
      }
    } catch (e) { console.error(e); }
  };

  const currentSemesterPlans = useMemo(() => {
    return selectedSemester === 1 ? semester1Plans : semester2Plans;
  }, [selectedSemester, semester1Plans, semester2Plans]);

  const handleSemesterChange = (sem) => {
    setSelectedSemester(sem);
    const year = new Date(currentDate).getFullYear();
    if (sem === 1) setCurrentDate(`${year}-03-02`);
    else setCurrentDate(`${year}-09-01`);
  };

  const weekInfo = useMemo(() => {
    const [y_val, m_val, d_val] = currentDate.split('-').map(Number);
    const today = new Date(y_val, m_val - 1, d_val);
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    const group = groups.find(g => g.id === selectedGroupId);
    
    if (!group || !currentSemesterPlans || currentSemesterPlans.length === 0) {
      return { week: '1', period: '기간 미지정', index: 0 };
    }

    const year = today.getFullYear();
    const parseToDate = (str) => {
      if (!str) return null;
      const cleanStr = str.replace(/\s/g, '');
      if (!cleanStr.includes('.')) return null;
      const [m, d] = cleanStr.split('.').map(v => parseInt(v, 10));
      if (isNaN(m) || isNaN(d)) return null;
      return new Date(year, m - 1, d);
    };

    const getRange = (gData) => {
      if (!gData?.period) return null;
      const parts = gData.period.split(/[~～－-]/);
      if (parts.length < 2) return null;
      const start = parseToDate(parts[0].trim());
      const end = parseToDate(parts[1].trim());
      if (start && end) {
        const endDay = new Date(end);
        endDay.setHours(23, 59, 59, 999);
        return { sTime: start.getTime(), eTime: endDay.getTime() };
      }
      return null;
    };

    const sortedPlans = [...currentSemesterPlans].sort((a, b) => Number(a.week) - Number(b.week));

    const findMatch = (targetTime) => {
      const getMatchedKey = (gData) => {
        return Object.keys(gData || {}).find(k => 
          String(k) === String(group.val) || 
          String(k) === String(group.id) ||
          String(k) === group.name.replace('⭐ ', '')
        );
      };

      const primaryIdx = sortedPlans.findIndex(plan => {
        const k = getMatchedKey(plan.grades);
        const r = getRange(plan.grades?.[k]);
        return r && targetTime >= r.sTime && targetTime <= r.eTime;
      });
      if (primaryIdx !== -1) return { index: primaryIdx, isStrict: true };

      const fallbackIdx = sortedPlans.findIndex(plan => {
        return Object.values(plan.grades || {}).some(gData => {
          const r = getRange(gData);
          return r && targetTime >= r.sTime && targetTime <= r.eTime;
        });
      });
      return { index: fallbackIdx, isStrict: false };
    };

    let res = findMatch(todayTime);
    if (res.index === -1) {
      const day = today.getDay();
      if (day === 0) res = findMatch(todayTime + 86400000);
      else if (day === 6) res = findMatch(todayTime - 86400000);
    }

    if (res.index !== -1 && res.isStrict) {
      const p = sortedPlans[res.index];
      const gradesData = p.grades || {};
      const matchedKey = Object.keys(gradesData).find(k => 
        String(k) === String(group.val) || String(k) === String(group.id) || String(k) === group.name.replace('⭐ ', '')
      );
      return { week: p.week, period: gradesData[matchedKey]?.period || '기간 미지정', index: res.index };
    }
    return { week: '?', period: '기간 미지정', index: -1 };
  }, [currentDate, currentSemesterPlans, selectedGroupId, groups]);

  const handleWeekChange = (dir) => {
    const [y, m, d] = currentDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + (dir * 7));
    const ny = dt.getFullYear();
    const nm = String(dt.getMonth() + 1).padStart(2, '0');
    const nd = String(dt.getDate()).padStart(2, '0');
    setCurrentDate(`${ny}-${nm}-${nd}`);
  };

  const autoSaveToFirebase = useCallback(async (data) => {
    if (!currentUser || !selectedGroupId) return;
    const group = groups.find(g => g.id === selectedGroupId);
    try {
      const recordsObj = {};
      data.forEach(row => {
        const key = group.type === 'grade' 
          ? (row.periodIdx !== null ? `${row.classNum}_p${row.periodIdx}` : `${row.classNum}_off`)
          : (row.periodIdx !== null ? `club_p${row.periodIdx}` : 'club_off');
        recordsObj[key] = {
          period: row.period, leader: row.leader || '', activity: row.activity || '',
          lesson_count: row.lesson_count || '', note: row.note || '',
          isTodayLesson: row.isTodayLesson !== undefined ? row.isTodayLesson : true,
          timestamp: new Date().toISOString()
        };
      });
      await setDoc(doc(db, 'users', currentUser.uid, 'progress_check', `${currentDate}_${selectedGroupId}`), {
        records: recordsObj, updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) { console.error('Auto-save error:', e); }
  }, [currentUser, selectedGroupId, currentDate, groups]);

  useEffect(() => {
    if (currentUser && selectedGroupId) fetchProgressData();
  }, [selectedGroupId, currentDate, currentUser, currentSemesterPlans, weekInfo, selectedSemester]);

  const fetchProgressData = async () => {
    setIsLoading(true);
    try {
      const uid = currentUser.uid;
      const group = groups.find(g => g.id === selectedGroupId);
      if (!group) return;

      const groupOffsets = offsetDoc.exists() ? offsetDoc.data() : {};
      setOffsets(groupOffsets);

      // 시간표 데이터를 Firestore에서 가져옴
      const timetableRef = doc(db, 'users', uid, 'settings', 'timetable');
      const timetableSnap = await getDoc(timetableRef);
      let timetable = [];
      if (timetableSnap.exists()) {
        const rawData = timetableSnap.data().data;
        if (rawData && !Array.isArray(rawData)) {
          // 객체 타입을 배열로 복구
          timetable = Array(8).fill(null).map((_, i) => rawData[i] || Array(5).fill('none'));
        } else {
          timetable = rawData || [];
        }
      } else {
        const savedTimetable = localStorage.getItem('master_timetable');
        timetable = savedTimetable ? JSON.parse(savedTimetable) : [];
      }

      const [y, m, d] = currentDate.split('-').map(Number);
      const dObj = new Date(y, m - 1, d);
      const dayIdx = dObj.getDay() - 1;
      const isWeekday = dayIdx >= 0 && dayIdx <= 4;

      const docId = `${currentDate}_${selectedGroupId}`;
      const snap = await getDoc(doc(db, 'users', uid, 'progress_check', docId));
      const savedRecords = snap.exists() ? snap.data().records || {} : null;

      const sortedPlans = [...currentSemesterPlans].sort((a, b) => Number(a.week) - Number(b.week));
      
      const getGroupDataFromPlan = (plan) => {
        const gradesData = plan.grades || {};
        const k = Object.keys(gradesData).find(k => 
          String(k) === String(group.val) || String(k) === String(group.id) || String(k) === group.name.replace('⭐ ', '')
        );
        return gradesData[k];
      };

      const allSemesterTopics = [];
      sortedPlans.forEach(plan => {
        const gData = getGroupDataFromPlan(plan);
        if (gData && gData.topics) {
          const weeklyH = Number(gData.weeklyH || 0);
          for (let i = 0; i < weeklyH; i++) allSemesterTopics.push(gData.topics[i] || '');
        }
      });

      let baseLessonNum = 1;
      if (weekInfo.index > 0) {
        baseLessonNum = sortedPlans.slice(0, weekInfo.index).reduce((acc, p) => acc + (Number(getGroupDataFromPlan(p)?.weeklyH) || 0), 1);
      }

      let classesToShow = [];
      if (group.type === 'grade') {
        // 쿼리 대신 전체를 가져와서 필터링 (타입 이슈 방지)
        const allClassSnap = await getDocs(collection(db, 'users', uid, 'classes'));
        classesToShow = allClassSnap.docs
          .map(d => ({ id: d.id, classNum: d.data().class_number, grade: d.data().grade, leader: d.data().leader || '' }))
          .filter(c => String(c.grade) === String(group.val))
          .sort((a, b) => Number(a.classNum) - Number(b.classNum));
      } else {
        const clubDoc = await getDoc(doc(db, 'users', uid, 'clubs', group.val));
        classesToShow = [{ id: group.val, classNum: group.name, leader: clubDoc.exists() ? clubDoc.data().leader || '' : '' }];
      }

      const finalData = [];
      classesToShow.forEach(cls => {
        const periodsToday = [];
        if (isWeekday && Array.isArray(timetable)) {
          for (let p = 0; p < timetable.length; p++) {
            if (Array.isArray(timetable[p]) && String(timetable[p][dayIdx]) === String(cls.id)) {
              periodsToday.push(p);
            }
          }
        }

        if (periodsToday.length > 0) {
          periodsToday.forEach(pIdx => {
            let lessonsBeforeThis = 0;
            for (let d = 0; d <= dayIdx; d++) {
              for (let p = 0; p < timetable.length; p++) {
                if (d === dayIdx && p >= pIdx) break;
                if (String(timetable[p][d]) === String(cls.id)) lessonsBeforeThis++;
              }
            }
            const rowKey = group.type === 'grade' ? `${cls.classNum}_p${pIdx}` : `club_p${pIdx}`;
            const finalPeriod = baseLessonNum + lessonsBeforeThis + (groupOffsets[cls.classNum] || 0);
            const autoActivity = allSemesterTopics[finalPeriod - 1] || '';

            if (savedRecords && savedRecords[rowKey]) {
              const saved = savedRecords[rowKey];
              const isInvalidP = !saved.lesson_count || saved.period === saved.lesson_count || !isNaN(saved.period);
              finalData.push({
                ...saved, classNum: cls.classNum, periodIdx: pIdx, baseCalcPeriod: baseLessonNum + lessonsBeforeThis,
                period: isInvalidP ? `${pIdx}교시` : saved.period,
                lesson_count: saved.lesson_count || saved.period || String(finalPeriod),
                isTodayLesson: saved.isTodayLesson !== undefined ? saved.isTodayLesson : true
              });
            } else {
              finalData.push({
                classNum: cls.classNum, periodIdx: pIdx, period: `${pIdx}교시`, lesson_count: String(finalPeriod),
                baseCalcPeriod: baseLessonNum + lessonsBeforeThis, leader: '', activity: autoActivity, note: '',
                isAutoFilled: weekInfo.index !== -1, isTodayLesson: true
              });
            }
          });
        } else {
          const rowKey = group.type === 'grade' ? `${cls.classNum}_off` : 'club_off';
          let lessonsBeforeToday = 0;
          if (timetable.length > 0) {
            for (let d = 0; d < Math.max(0, dayIdx); d++) {
              for (let p = 0; p < timetable.length; p++) {
                if (String(timetable[p][d]) === String(cls.id)) lessonsBeforeToday++;
              }
            }
          }
          const finalPeriod = baseLessonNum + lessonsBeforeToday + (groupOffsets[cls.classNum] || 0);
          const autoActivity = allSemesterTopics[finalPeriod - 1] || '';

          if (savedRecords && savedRecords[rowKey]) {
            const saved = savedRecords[rowKey];
            const isInvalidP = !saved.lesson_count || saved.period === saved.lesson_count || !isNaN(saved.period);
            finalData.push({
              ...saved, classNum: cls.classNum, periodIdx: null, baseCalcPeriod: baseLessonNum + lessonsBeforeToday,
              period: isInvalidP ? '-' : saved.period,
              lesson_count: saved.lesson_count || saved.period || String(finalPeriod),
              isTodayLesson: saved.isTodayLesson !== undefined ? saved.isTodayLesson : false
            });
          } else {
            finalData.push({
              classNum: cls.classNum, periodIdx: null, period: '-', lesson_count: String(finalPeriod),
              baseCalcPeriod: baseLessonNum + lessonsBeforeToday, leader: cls.leader || '', activity: autoActivity, note: '',
              isAutoFilled: weekInfo.index !== -1, isTodayLesson: false
            });
          }
        }
      });
      setTableData(finalData);
      if (!snap.exists() && finalData.some(row => row.isTodayLesson)) {
        autoSaveToFirebase(finalData);
      }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const handleInputChange = async (idx, field, value) => {
    const newData = [...tableData];
    newData[idx][field] = value;
    if (field === 'lesson_count') {
      const row = newData[idx];
      const newLessonNum = Number(value);
      if (!isNaN(newLessonNum) && row.baseCalcPeriod !== undefined) {
        const offset = newLessonNum - row.baseCalcPeriod;
        const newOffsets = { ...offsets, [row.classNum]: offset };
        setOffsets(newOffsets);
        try {
          await setDoc(doc(db, 'users', currentUser.uid, 'offsets', selectedGroupId), newOffsets);
          fetchProgressData();
          return;
        } catch (err) { console.error(err); }
      }
    }
    setTableData(newData);
    autoSaveToFirebase(newData);
  };

  // --- 핵심 개선: 방문하지 않은 날짜까지 포함하여 엑셀 생성 ---
  const handleExportExcel = async () => {
    if (!currentUser || !selectedGroupId) return;
    setIsLoading(true);
    try {
      const uid = currentUser.uid;
      const group = groups.find(g => g.id === selectedGroupId);
      const timetable = JSON.parse(localStorage.getItem('master_timetable') || '[]');
      const sortedPlans = [...currentSemesterPlans].sort((a, b) => Number(a.week) - Number(b.week));
      const firestoreSnap = await getDocs(collection(db, 'users', uid, 'progress_check'));
      const firestoreData = {};
      firestoreSnap.forEach(d => firestoreData[d.id] = d.data().records || {});

      const offsetDoc = await getDoc(doc(db, 'users', uid, 'offsets', selectedGroupId));
      const groupOffsets = offsetDoc.exists() ? offsetDoc.data() : {};

      const classDataMap = {};
      
      // 1. 학급 리스트 확보
      let classes = [];
      if (group.type === 'grade') {
        const classSnap = await getDocs(query(collection(db, 'users', uid, 'classes'), where('grade', '==', group.val)));
        classes = classSnap.docs.map(d => ({ id: d.id, classNum: d.data().class_number })).sort((a, b) => a.classNum - b.classNum);
      } else {
        classes = [{ id: group.val, classNum: group.name }];
      }

      const year = new Date().getFullYear();
      const parseToDate = (str) => {
        if (!str) return null;
        const [m, d] = str.replace(/\s/g, '').split('.').map(v => parseInt(v, 10));
        return new Date(year, m - 1, d);
      };

      // 2. 계획표 주차별로 모든 실제 수업일 시뮬레이션
      classes.forEach(cls => {
        let cumulativeLessonCount = 1;
        const classKey = String(cls.classNum);
        classDataMap[classKey] = [];

        sortedPlans.forEach(plan => {
          const gData = (plan.grades || {})[Object.keys(plan.grades || {}).find(k => k === String(group.val) || k === String(group.id) || k === group.name.replace('⭐ ', ''))];
          if (!gData) return;
          const weeklyTopics = gData.topics || [];
          const range = gData.period?.split(/[~～－-]/);
          if (!range || range.length < 2) return;
          const startDt = parseToDate(range[0].trim());
          const endDt = parseToDate(range[1].trim());
          if (!startDt || !endDt) return;

          // 해당 주차의 월~금 순회
          for (let d = new Date(startDt); d <= endDt; d.setDate(d.getDate() + 1)) {
            const dayIdx = d.getDay() - 1;
            if (dayIdx < 0 || dayIdx > 4) continue; // 주말 제외

            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const da = String(d.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${da}`;
            const docId = `${dateStr}_${selectedGroupId}`;
            const savedRecords = firestoreData[docId] || {};

            // 시간표 대조 (해당 요일에 이 반 수업이 있는가?)
            timetable.forEach((row, pIdx) => {
              if (String(row[dayIdx]) === String(cls.id)) {
                const rowKey = group.type === 'grade' ? `${cls.classNum}_p${pIdx}` : `club_p${pIdx}`;
                const finalLessonNum = cumulativeLessonCount + (groupOffsets[cls.classNum] || 0);
                const plannedTopic = weeklyTopics[cumulativeLessonCount - 1 - (cumulativeLessonCount - 1)] || weeklyTopics[0] || ''; // 주차별로 보강 필요하나 일단 보수적으로
                
                // Firestore 기록이 있으면 사용, 없으면 계획표 기반 생성
                const record = savedRecords[rowKey];
                if (record && record.isTodayLesson !== false) {
                  classDataMap[classKey].push({
                    date: dateStr, period: record.period || `${pIdx}교시`, lesson_count: record.lesson_count || finalLessonNum,
                    activity: record.activity || plannedTopic, leader: record.leader || '', note: record.note || ''
                  });
                } else if (!record) {
                  classDataMap[classKey].push({
                    date: dateStr, period: `${pIdx}교시`, lesson_count: finalLessonNum,
                    activity: gData.topics[cumulativeLessonCount - (cumulativeLessonCount - (cumulativeLessonCount % gData.weeklyH || 1)) - 1] || gData.topics[0] || '',
                    leader: '', note: '자동 생성'
                  });
                }
                cumulativeLessonCount++;
              }
            });
          }
        });
      });

      // 3. 엑셀 파일 생성
      const wb = XLSX.utils.book_new();
      Object.keys(classDataMap).sort((a, b) => !isNaN(a) && !isNaN(b) ? parseInt(a) - parseInt(b) : a.localeCompare(b)).forEach(ck => {
        const rows = classDataMap[ck].sort((a, b) => a.date.localeCompare(b.date));
        const aoa = [["차시", "날짜", "교시", "학습 주제 및 내용", "반장(부장)", "비고"]];
        rows.forEach(r => aoa.push([r.lesson_count, r.date, r.period, r.activity, r.leader, r.note]));
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 45 }];
        XLSX.utils.book_append_sheet(wb, ws, (group.type === 'grade' ? `${group.val}학년 ${ck}반` : ck).substring(0, 31));
      });
      XLSX.writeFile(wb, `${group.name}_학기_수업실적.xlsx`);
    } catch (e) { console.error(e); showAlert('엑셀 생성 중 오류 발생', '오류'); } finally { setIsLoading(false); }
  };

  const group = groups.find(g => g.id === selectedGroupId);

  return (
    <div className="progress-check-container">
      <div className="group-tabs-scroll-wrapper no-print">
        <div className="group-tabs">
          {groups.map(g => (
            <button key={g.id} className={`group-tab ${selectedGroupId === g.id ? 'active' : ''}`} onClick={() => setSelectedGroupId(g.id)}>{g.name}</button>
          ))}
        </div>
      </div>
      <div className="semester-tabs-wrapper no-print">
        <div className="semester-tabs">
          <button className={`semester-tab ${selectedSemester === 1 ? 'active' : ''}`} onClick={() => handleSemesterChange(1)}>1학기</button>
          <button className={`semester-tab ${selectedSemester === 2 ? 'active' : ''}`} onClick={() => handleSemesterChange(2)}>2학기</button>
        </div>
      </div>
      <div className="check-header-premium no-print">
        <div className="header-left-area" style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-outline-green" onClick={handleExportExcel} style={{ border: '1px solid #2e7d32', color: '#2e7d32' }}>📊 학기 활동 내용 다운로드</button>
          <span className="auto-save-badge">✨ 자동 저장 중</span>
        </div>
        <WeekNavigator week={weekInfo.week} period={weekInfo.period} onPrev={() => handleWeekChange(-1)} onNext={() => handleWeekChange(1)} />
        <SophisticatedDatePicker value={currentDate} onChange={setCurrentDate} />
      </div>
      <div className="progress-table-card">
        <table className="progress-check-table">
          <thead>
            <tr>
              <th style={{width:'120px'}}>교시</th>
              <th style={{width:'140px'}}>반</th>
              <th style={{width:'120px'}}>차시</th>
              <th style={{width:'150px'}}>반장(부장)</th>
              <th>활동내용</th>
              <th style={{width:'450px'}}>비고</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, idx) => (
              <tr key={idx} className={`${row.isTodayLesson ? 'row-on-day' : 'row-off-day'}`}>
                <td className="cell-center"><input type="text" className="cell-input cell-center" value={row.period || ''} onChange={(e) => handleInputChange(idx, 'period', e.target.value)} /></td>
                <td className="cell-center">
                  <div className="class-num-badge">
                    <span className="bold">{row.classNum}</span>
                    <span className={`today-badge-clickable ${row.isTodayLesson ? 'active' : 'inactive'}`} onClick={() => handleInputChange(idx, 'isTodayLesson', !row.isTodayLesson)}>{row.isTodayLesson ? '오늘 수업' : '수업 없음'}</span>
                  </div>
                </td>
                <td><input type="text" className="cell-input cell-center bold" value={row.lesson_count || ''} onChange={(e) => handleInputChange(idx, 'lesson_count', e.target.value)} /></td>
                <td><input type="text" className="cell-input cell-center" value={row.leader} onChange={(e) => handleInputChange(idx, 'leader', e.target.value)} placeholder="이름..." /></td>
                <td className="cell-activity"><span className="activity-text-display">{row.activity || '-'}</span></td>
                <td><input type="text" className="cell-input" placeholder="비고..." value={row.note} onChange={(e) => handleInputChange(idx, 'note', e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isLoading && <div className="loading-overlay">데이터 처리 중...</div>}
    </div>
  );
}

export default ProgressCheckPage;
