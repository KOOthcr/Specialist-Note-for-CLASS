import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import * as XLSX from 'xlsx';
import { useModal } from '../components/common/GlobalModal';
import './ProgressRecordPage.css';

function ProgressRecordPage() {
  const { showAlert, showConfirm } = useModal();
  const [semester1Plans, setSemester1Plans] = useState([]);
  const [semester2Plans, setSemester2Plans] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [groups, setGroups] = useState([]); 
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [defaultHours, setDefaultHours] = useState(3);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchGroupsAndPlans(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchGroupsAndPlans = async (uid) => {
    try {
      const classesRef = collection(db, 'users', uid, 'classes');
      const classSnap = await getDocs(classesRef);
      const uniqueGrades = [...new Set(classSnap.docs.map(doc => doc.data().grade))].sort();
      
      const clubsRef = collection(db, 'users', uid, 'clubs');
      const clubSnap = await getDocs(clubsRef);
      const clubs = clubSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name, type: 'club' }));

      const allGroups = [
        ...uniqueGrades.map(g => ({ id: `grade-${g}`, name: `${g}학년`, val: g, type: 'grade' })),
        ...clubs.map(c => ({ id: `club-${c.id}`, name: c.name, val: c.name, type: 'club' }))
      ];
      
      setGroups(allGroups);
      if (allGroups.length > 0 && !currentGroupId) {
        setCurrentGroupId(allGroups[0].id);
      }

      // 1. 최신 데이터(v2) 시도
      let docRef = doc(db, 'users', uid, 'curriculum', 'annual_plans_dynamic_v2');
      let snap = await getDoc(docRef);
      
      // 2. 최신 데이터가 없으면 구버전(annual_plans) 시도
      if (!snap.exists()) {
        const oldRef = doc(db, 'users', uid, 'curriculum', 'annual_plans');
        const oldSnap = await getDoc(oldRef);
        if (oldSnap.exists()) {
          snap = oldSnap;
          console.log("Old curriculum data (v1) found and migrated.");
        }
      }
      
      const emptyPlan = () => Array.from({ length: 20 }, (_, i) => ({
        week: i + 1, grades: {}
      }));

      // 마이그레이션 도우미: 상단 period를 학급별 데이터로 이동
      const migrate = (plans) => {
        if (!plans) return null;
        return plans.map(p => {
          const newGrades = { ...p.grades };
          if (p.period) {
            allGroups.forEach(g => {
              if (!newGrades[g.val]) newGrades[g.val] = { topics: [], weeklyH: 0, accH: 0 };
              if (!newGrades[g.val].period) newGrades[g.val].period = p.period;
            });
          }
          return { week: p.week, grades: newGrades };
        });
      };

      if (snap && snap.exists()) {
        const data = snap.data();
        // 구조에 따른 유연한 데이터 매핑
        if (data.semester1 || data.semester2) {
          setSemester1Plans(migrate(data.semester1) || emptyPlan());
          setSemester2Plans(migrate(data.semester2) || emptyPlan());
        } else if (data.plans) {
          setSemester1Plans(migrate(data.plans));
          setSemester2Plans(emptyPlan());
        } else {
          setSemester1Plans(emptyPlan());
          setSemester2Plans(emptyPlan());
        }
      } else {
        setSemester1Plans(emptyPlan());
        setSemester2Plans(emptyPlan());
      }
    } catch (e) { console.error(e); }
  };

  const currentPlans = selectedSemester === 1 ? semester1Plans : semester2Plans;
  const setPlans = selectedSemester === 1 ? setSemester1Plans : setSemester2Plans;

  // 누계 자동 계산 함수
  const recalculateAccHours = (plans, groupVal) => {
    let runningTotal = 0;
    return plans.map(plan => {
      const gData = plan.grades[groupVal] || { weeklyH: 0, topics: [], period: '' };
      runningTotal += Number(gData.weeklyH || 0);
      return {
        ...plan,
        grades: {
          ...plan.grades,
          [groupVal]: {
            ...gData,
            accH: runningTotal
          }
        }
      };
    });
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'curriculum', 'annual_plans_dynamic_v2'), {
        semester1: semester1Plans,
        semester2: semester2Plans,
        updatedAt: new Date().toISOString()
      });
      showAlert('진도 기록이 성공적으로 저장되었습니다.', '저장 완료');
    } catch (e) { showAlert('저장 중 오류가 발생했습니다.', '저장 실패', 'error'); }
    finally { setIsSaving(false); }
  };

  const applyDefaultHours = () => {
    if (!currentGroupId || !currentPlans.length) return;
    const currentGroup = groups.find(g => g.id === currentGroupId);
    if (!currentGroup) return;

    showConfirm(`${selectedSemester}학기 모든 주차의 [${currentGroup.name}] 시수를 ${defaultHours}시간으로 변경하시겠습니까?`, () => {
      const hours = Number(defaultHours);
      const newPlansWithHours = currentPlans.map((plan) => {
        const updatedGrades = { ...plan.grades };
        const currentGradeData = updatedGrades[currentGroup.val] || { topics: [], period: '' };
        const newTopics = Array(hours).fill('').map((_, i) => currentGradeData.topics?.[i] || '');

        updatedGrades[currentGroup.val] = {
          ...currentGradeData,
          weeklyH: hours,
          topics: newTopics
        };
        return { ...plan, grades: updatedGrades };
      });
      
      const finalizedPlans = recalculateAccHours(newPlansWithHours, currentGroup.val);
      setPlans(finalizedPlans);
      showAlert('기본 시수가 전체 적용되었습니다.', '적용 완료');
    }, '시수 일괄 변경');
  };

  // 기간 자동 생성 로직 (현재 학년만 적용)
  // 현재 학년/학기 전체 삭제
  const clearAllPlans = () => {
    if (!currentGroup) return;
    showConfirm(`[${currentGroup.name}]의 ${selectedSemester}학기 모든 진도 데이터를 삭제하고 초기화하시겠습니까?`, () => {
      const emptyPlans = currentPlans.map(plan => {
        const updatedGrades = { ...plan.grades };
        updatedGrades[currentGroup.val] = {
          topics: [],
          weeklyH: 0,
          accH: 0,
          period: updatedGrades[currentGroup.val]?.period || ''
        };
        return { ...plan, grades: updatedGrades };
      });
      setPlans(emptyPlans);
      showAlert('모든 데이터가 초기화되었습니다.', '삭제 완료');
    }, '전체 데이터 삭제');
  };

  const autoGeneratePeriods = () => {
    if (!currentGroup) return;
    const year = new Date().getFullYear();
    let startDate;

    if (selectedSemester === 1) {
      const mar2 = new Date(year, 2, 2);
      const mar3 = new Date(year, 2, 3);
      let baseDate;
      if (mar2.getDay() >= 1 && mar2.getDay() <= 5) baseDate = mar2;
      else if (mar3.getDay() >= 1 && mar3.getDay() <= 5) baseDate = mar3;
      else baseDate = new Date(year, 2, 4);
      
      const day = baseDate.getDay();
      const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(baseDate.setDate(diff));
    } else {
      const aug18 = new Date(year, 7, 18);
      const day = aug18.getDay();
      const diff = aug18.getDate() - day + (day === 0 ? -6 : 1);
      startDate = new Date(aug18.setDate(diff));
    }

    const newPlans = currentPlans.map((plan, idx) => {
      const mon = new Date(startDate);
      mon.setDate(startDate.getDate() + (idx * 7));
      const fri = new Date(mon);
      fri.setDate(mon.getDate() + 4);

      const format = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
      const updatedGrades = { ...plan.grades };
      updatedGrades[currentGroup.val] = {
        ...(updatedGrades[currentGroup.val] || { topics: [], weeklyH: 0, accH: 0 }),
        period: `${format(mon)} ~ ${format(fri)}`
      };
      return { ...plan, grades: updatedGrades };
    });

    setPlans(newPlans);
    showAlert(`[${currentGroup.name}]의 ${selectedSemester}학기 기간이 자동 생성되었습니다.`, '자동 생성 완료');
  };

  // 개별 기간 선택 핸들러 (이후 주차 자동 연동)
  const handlePeriodDateChange = (wIdx, dateValue) => {
    if (!dateValue || !currentGroup) return;
    const selected = new Date(dateValue);
    const day = selected.getDay();
    // 선택한 날짜가 포함된 주의 월요일 계산
    const baseMon = new Date(selected);
    baseMon.setDate(selected.getDate() - (day === 0 ? 6 : day - 1));

    let newPlans = [...currentPlans];
    const format = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

    // 선택한 주차부터 마지막 주차까지 순차적으로 날짜 업데이트
    for (let i = wIdx; i < newPlans.length; i++) {
      const mon = new Date(baseMon);
      mon.setDate(baseMon.getDate() + (i - wIdx) * 7);
      const fri = new Date(mon);
      fri.setDate(mon.getDate() + 4);

      const updatedGrades = { ...newPlans[i].grades };
      updatedGrades[currentGroup.val] = {
        ...(updatedGrades[currentGroup.val] || { topics: [], weeklyH: 0, accH: 0 }),
        period: `${format(mon)} ~ ${format(fri)}`
      };
      newPlans[i] = { ...newPlans[i], grades: updatedGrades };
    }

    setPlans(newPlans);
    showAlert(`${wIdx + 1}주차 이후의 모든 기간이 자동으로 조정되었습니다.`, '기간 연동 완료');
  };

  const updateCell = (wIdx, field, value, groupVal) => {
    let newPlans = [...currentPlans];
    if (groupVal) {
      if (!newPlans[wIdx].grades[groupVal]) {
        newPlans[wIdx].grades[groupVal] = { topics: [], weeklyH: 0, accH: 0, period: '' };
      }
      newPlans[wIdx].grades[groupVal][field] = value;
      
      if (field === 'weeklyH') {
        const h = Number(value);
        const currentTopics = newPlans[wIdx].grades[groupVal].topics || [];
        newPlans[wIdx].grades[groupVal].topics = Array(h).fill('').map((_, i) => currentTopics[i] || '');
        newPlans = recalculateAccHours(newPlans, groupVal);
      }
    } else {
      newPlans[wIdx][field] = value;
    }
    setPlans(newPlans);
  };

  const removeTopic = (wIdx, groupVal, topicIdx) => {
    let newPlans = [...currentPlans];
    const gData = newPlans[wIdx].grades[groupVal];
    if (gData && gData.topics) {
      const newTopics = [...gData.topics];
      newTopics.splice(topicIdx, 1);
      const newH = Math.max(0, Number(gData.weeklyH || 0) - 1);
      
      newPlans[wIdx].grades[groupVal] = {
        ...gData,
        topics: newTopics,
        weeklyH: newH
      };
      
      newPlans = recalculateAccHours(newPlans, groupVal);
      setPlans(newPlans);
    }
  };

  const updateTopic = (wIdx, groupVal, topicIdx, value) => {
    const newPlans = [...currentPlans];
    if (!newPlans[wIdx].grades[groupVal].topics) {
      newPlans[wIdx].grades[groupVal].topics = [];
    }
    newPlans[wIdx].grades[groupVal].topics[topicIdx] = value;
    setPlans(newPlans);
  };

  const generateSheetData = (group, plans, skipTopics = false) => {
    const aoa = [["주", "기간", "학습 주제 및 내용", "시수", "누계"]];
    const merges = [];
    let currentRow = 1;

    plans.forEach((p) => {
      const gData = p.grades[group.val] || { topics: [], weeklyH: 1, accH: 0, period: '' };
      const h = Math.max(1, Number(gData.weeklyH || 0));
      const topics = gData.topics || [];

      for (let i = 0; i < h; i++) {
        const rowData = [];
        if (i === 0) {
          rowData[0] = p.week;
          rowData[1] = gData.period || "";
          rowData[3] = gData.weeklyH;
          rowData[4] = gData.accH;
        }
        // skipTopics가 true면 주제란을 빈칸으로 설정
        rowData[2] = skipTopics ? "" : (topics[i] || "");
        aoa.push(rowData);
      }

      if (h > 1) {
        [0, 1, 3, 4].forEach(colIdx => {
          merges.push({
            s: { r: currentRow, c: colIdx },
            e: { r: currentRow + h - 1, c: colIdx }
          });
        });
      }
      currentRow += h;
    });

    return { aoa, merges };
  };

  const handleTemplateDownload = () => {
    const wb = XLSX.utils.book_new();
    groups.forEach(group => {
      // 1학기 시트 (주제 제외)
      const s1 = generateSheetData(group, semester1Plans, true);
      const ws1 = XLSX.utils.aoa_to_sheet(s1.aoa);
      ws1['!merges'] = s1.merges;
      ws1['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 70 }, { wch: 10 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws1, `${group.name}_1학기`);

      // 2학기 시트 (주제 제외)
      const s2 = generateSheetData(group, semester2Plans, true);
      const ws2 = XLSX.utils.aoa_to_sheet(s2.aoa);
      ws2['!merges'] = s2.merges;
      ws2['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 70 }, { wch: 10 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws2, `${group.name}_2학기`);
    });
    XLSX.writeFile(wb, "연간진도표_통합양식.xlsx");
  };

  const handleDownload = () => {
    const wb = XLSX.utils.book_new();
    const group = groups.find(g => g.id === currentGroupId);
    if (!group) return;

    // 현재 모든 내용을 포함하여 생성 (skipTopics = false)
    const s1 = generateSheetData(group, semester1Plans, false);
    const ws1 = XLSX.utils.aoa_to_sheet(s1.aoa);
    ws1['!merges'] = s1.merges;
    ws1['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 70 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws1, "1학기");

    const s2 = generateSheetData(group, semester2Plans, false);
    const ws2 = XLSX.utils.aoa_to_sheet(s2.aoa);
    ws2['!merges'] = s2.merges;
    ws2['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 70 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws2, "2학기");

    XLSX.writeFile(wb, `${group.name}_연간진도표_최종.xlsx`);
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      let newS1 = [...semester1Plans];
      let newS2 = [...semester2Plans];
      
      wb.SheetNames.forEach(sheetName => {
        const isS2 = sheetName.includes('2학기');
        const baseName = sheetName.replace('_1학기', '').replace('_2학기', '');
        const group = groups.find(g => g.name === baseName);
        
        if (group) {
          const rawData = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
          const rows = rawData.slice(1);
          let tempPlans = [];
          let currentPlanIdx = -1;

          rows.forEach(row => {
            if (row[0] !== undefined && row[0] !== null && row[0] !== "") {
              currentPlanIdx++;
              tempPlans[currentPlanIdx] = { week: row[0], grades: {
                [group.val]: { period: row[1] || "", topics: [row[2] || ""], weeklyH: Number(row[3] || 1), accH: Number(row[4] || 0) }
              }};
            } else if (currentPlanIdx >= 0) {
              tempPlans[currentPlanIdx].grades[group.val].topics.push(row[2] || "");
            }
          });
          
          const finalized = recalculateAccHours(tempPlans, group.val);
          if (isS2) newS2 = finalized; else newS1 = finalized;
        }
      });
      setSemester1Plans(newS1);
      setSemester2Plans(newS2);
      showAlert('양식을 성공적으로 불러왔습니다.', '업로드 완료');
    };
    reader.readAsBinaryString(file);
  };

  const addWeek = () => {
    const lastPlan = currentPlans.length > 0 ? currentPlans[currentPlans.length - 1] : null;
    const nextWeek = lastPlan ? Number(lastPlan.week) + 1 : 1;
    
    // 현재 학년의 마지막 데이터 기반으로 자동 생성
    const lastGData = (lastPlan && currentGroup) ? lastPlan.grades[currentGroup.val] : null;
    let nextPeriod = '';
    let nextH = lastGData ? lastGData.weeklyH : 0;

    if (lastGData && lastGData.period && lastGData.period.includes('~')) {
      try {
        const [startStr] = lastGData.period.split(' ~ ');
        const [m, d] = startStr.split('.').map(Number);
        const nextDate = new Date(new Date().getFullYear(), m - 1, d + 7);
        const nextFri = new Date(nextDate);
        nextFri.setDate(nextDate.getDate() + 4);
        const format = (dt) => `${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`;
        nextPeriod = `${format(nextDate)} ~ ${format(nextFri)}`;
      } catch(e) { console.error(e); }
    }

    const newWeekObj = {
      week: nextWeek,
      grades: {
        ...(lastPlan ? { ...lastPlan.grades } : {}), // 타 학년 데이터 보존 (필요시)
        [currentGroup.val]: {
          period: nextPeriod,
          weeklyH: nextH,
          topics: Array(Number(nextH)).fill(''),
          accH: 0
        }
      }
    };

    const updatedPlans = [...currentPlans, newWeekObj];
    const finalized = currentGroup ? recalculateAccHours(updatedPlans, currentGroup.val) : updatedPlans;
    setPlans(finalized);
  };

  const currentGroup = groups.find(g => g.id === currentGroupId);

  return (
    <div className="progress-record-dashboard">
      <div className="record-header no-print">
        <div className="header-left">
          <h2 className="record-title">교육과정 운영계획(진도표)</h2>
          <p className="record-subtitle">전문적인 전담 교과 관리 시스템</p>
        </div>
        <div className="header-actions">
          <div className="action-with-tip">
            <button className="btn-outline-green" onClick={handleTemplateDownload}>📥 통합 양식 다운로드</button>
            <p className="download-tip">*기본 기간 및 시수를 설정하면 양식에 반영됩니다.</p>
          </div>
          <label className="btn-outline-green" style={{ cursor: 'pointer' }}>
            📤 양식 업로드
            <input type="file" hidden onChange={handleUpload} accept=".xlsx, .xls" />
          </label>
          <button className="btn-outline-green" onClick={handleDownload}>📊 진도표 엑셀 다운로드</button>
          <button className="btn-solid-green" onClick={handleSave} disabled={isSaving}>
            {isSaving ? '저장 중...' : '💾 저장하기'}
          </button>
        </div>
      </div>

      <div className="grade-tab-container no-print">
        {groups.map(group => (
          <button 
            key={group.id} 
            className={`grade-tab-btn ${currentGroupId === group.id ? 'active' : ''} ${group.type}`}
            onClick={() => setCurrentGroupId(group.id)}
          >
            {group.type === 'club' ? `⭐ ${group.name}` : group.name}
          </button>
        ))}
      </div>

      <div className="semester-tab-container no-print">
        <button className={`semester-tab ${selectedSemester === 1 ? 'active' : ''}`} onClick={() => setSelectedSemester(1)}>1학기</button>
        <button className={`semester-tab ${selectedSemester === 2 ? 'active' : ''}`} onClick={() => setSelectedSemester(2)}>2학기</button>
      </div>

      <div className="batch-actions-bar no-print">
        <div className="batch-action-item">
          <span className="batch-label">기본 주간 시수 설정 ({selectedSemester}학기):</span>
          <input 
            type="number" 
            className="batch-input" 
            value={defaultHours} 
            onChange={(e) => setDefaultHours(e.target.value)}
          />
          <button className="btn-mini-green" onClick={applyDefaultHours}>모든 주차에 적용</button>
          <button className="btn-mini-red" onClick={clearAllPlans} style={{ marginLeft: '10px', background: '#d32f2f' }}>🗑️ 전체 삭제</button>
        </div>
        <div className="batch-action-item" style={{ marginLeft: '20px' }}>
          <button className="btn-outline-green" onClick={autoGeneratePeriods} style={{ padding: '10px 20px', fontSize: '14px' }}>
            📅 {currentGroup?.name} 기간 자동 생성
          </button>
        </div>
        <p className="batch-tip">* 시수를 설정하면 주제 입력 칸이 자동으로 생성되며, 누계가 실시간으로 계산됩니다.</p>
      </div>

      <div className="plan-blocks-container">
        <div className="plan-header-row">
          <div className="col-week-header">주</div>
          <div className="col-period-header">기 간</div>
          <div className="col-topic-header">
            <div className="topic-title">{currentGroup?.name} {selectedSemester}학기 진도 계획</div>
            <div className="topic-subtitle">학습 주제 및 내용 (우측 X 버튼으로 개별 삭제 가능)</div>
          </div>
          <div className="col-small-header">시수</div>
          <div className="col-small-header">누계</div>
        </div>

        {currentPlans.map((plan, wIdx) => {
          const gData = currentGroup ? plan.grades[currentGroup.val] || { topics: [], weeklyH: 0, accH: 0, period: '' } : null;
          const h = Number(gData?.weeklyH || 0);
          let startLessonNum = 1;
          for (let i = 0; i < wIdx; i++) {
            const prevGData = currentGroup ? currentPlans[i].grades[currentGroup.val] || { weeklyH: 0 } : { weeklyH: 0 };
            startLessonNum += Number(prevGData.weeklyH || 0);
          }

          return (
            <div key={wIdx} className="plan-week-row">
              <div className="col-week-box">
                <div className="week-num-label">第 {plan.week} 주</div>
              </div>
              
              <div className="col-period-box">
                <div className="period-input-group">
                  <input 
                    type="text" 
                    className="row-input period-manual-input" 
                    value={gData?.period || ''} 
                    onChange={(e) => updateCell(wIdx, 'period', e.target.value, currentGroup.val)}
                    placeholder="기간 입력..."
                  />
                  <div className="picker-trigger">
                    <input 
                      type="date" 
                      className="period-hidden-picker" 
                      onChange={(e) => handlePeriodDateChange(wIdx, e.target.value)} 
                    />
                    <span className="picker-icon">📅</span>
                  </div>
                </div>
              </div>
              
              <div className="col-topic-and-hours-container">
                {Array.from({ length: Math.max(1, h) }).map((_, i) => (
                  <div key={i} className="lesson-row-item-combined">
                    <div className="col-hour-badge-box">
                      <div className="hour-badge-inner">
                        <span className="hour-num">{h > 0 ? startLessonNum + i : '-'}</span>
                        <span className="hour-text">{h > 0 ? h : '-'}</span>
                      </div>
                    </div>
                    <div className="col-topic-box-main">
                      {h > 0 ? (
                        <>
                          <textarea className="lesson-textarea" value={gData.topics?.[i] || ''} onChange={(e) => updateTopic(wIdx, currentGroup.val, i, e.target.value)} placeholder={`${startLessonNum + i}차시 주제 입력...`} />
                          <button className="btn-delete-topic" onClick={() => removeTopic(wIdx, currentGroup.val, i)} title="이 차시 삭제">✕</button>
                        </>
                      ) : (
                        <div className="no-hours-notice">시수를 입력하면 주제 입력칸이 나타납니다.</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="col-small-box weekly-hours-col">
                <div className="weekly-hours-input-wrapper">
                  <input type="number" className="row-input center bold" value={h} onChange={(e) => updateCell(wIdx, 'weeklyH', e.target.value, currentGroup.val)} />
                  <span className="unit-label">시간</span>
                </div>
              </div>

              <div className="col-small-box acc-highlight"><div className="acc-value">{gData?.accH || 0}</div></div>
            </div>
          );
        })}

        <div className="no-print" style={{ padding: '20px' }}>
          <button className="btn-outline-green" onClick={addWeek}>+ 주차 추가</button>
        </div>
      </div>
    </div>
  );
}

export default ProgressRecordPage;
