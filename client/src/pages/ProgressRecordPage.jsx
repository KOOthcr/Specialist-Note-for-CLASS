import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import * as XLSX from 'xlsx';
import { useModal } from '../components/common/GlobalModal';
import './ProgressRecordPage.css';

function ProgressRecordPage() {
  const { showAlert, showConfirm } = useModal();
  const [semester1Plans, setSemester1Plans] = useState({});
  const [semester2Plans, setSemester2Plans] = useState({});
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

      // 1. 최신 데이터(v3) 시도
      let docRef = doc(db, 'users', uid, 'curriculum', 'annual_plans_dynamic_v3');
      let snap = await getDoc(docRef);
      let v3DataFound = false;

      // 2. 최신 데이터가 없으면 구버전(v2 -> v1) 시도
      if (!snap.exists()) {
        const v2Ref = doc(db, 'users', uid, 'curriculum', 'annual_plans_dynamic_v2');
        const v2Snap = await getDoc(v2Ref);
        if (v2Snap.exists()) {
          snap = v2Snap;
          console.log("v2 curriculum data found and migrated.");
        } else {
          const v1Ref = doc(db, 'users', uid, 'curriculum', 'annual_plans');
          const v1Snap = await getDoc(v1Ref);
          if (v1Snap.exists()) {
            snap = v1Snap;
            console.log("v1 curriculum data found and migrated.");
          }
        }
      } else {
        v3DataFound = true;
      }
      
      const emptyPlanV3 = () => {
        const base = {};
        allGroups.forEach(g => {
          base[g.val] = Array.from({ length: 20 }, (_, i) => ({
            week: i + 1, period: '', topics: [], weeklyH: 0, accH: 0
          }));
        });
        return base;
      };

      const migrateToV3 = (plansArray) => {
        if (!plansArray) return emptyPlanV3();
        const base = emptyPlanV3();
        allGroups.forEach(g => {
          base[g.val] = plansArray.map((p, idx) => {
            const gData = p.grades && p.grades[g.val] ? p.grades[g.val] : { topics: [], weeklyH: 0, accH: 0, period: p.period || '' };
            return {
              week: idx + 1,
              period: gData.period || '',
              topics: gData.topics || [],
              weeklyH: gData.weeklyH || 0,
              accH: gData.accH || 0
            };
          });
        });
        return base;
      };

      if (snap && snap.exists()) {
        const data = snap.data();
        if (v3DataFound) {
          setSemester1Plans(data.semester1 || emptyPlanV3());
          setSemester2Plans(data.semester2 || emptyPlanV3());
        } else {
          // v1, v2 migration mapping
          if (data.semester1 || data.semester2) {
            setSemester1Plans(migrateToV3(data.semester1));
            setSemester2Plans(migrateToV3(data.semester2));
          } else if (data.plans) {
            setSemester1Plans(migrateToV3(data.plans));
            setSemester2Plans(emptyPlanV3());
          } else {
            setSemester1Plans(emptyPlanV3());
            setSemester2Plans(emptyPlanV3());
          }
        }
      } else {
        setSemester1Plans(emptyPlanV3());
        setSemester2Plans(emptyPlanV3());
      }
    } catch (e) { console.error(e); }
  };

  const currentSemesterData = selectedSemester === 1 ? semester1Plans : semester2Plans;
  const setCurrentSemesterData = selectedSemester === 1 ? setSemester1Plans : setSemester2Plans;
  
  const currentGroup = groups.find(g => g.id === currentGroupId);
  const currentGroupPlans = (currentGroup && currentSemesterData[currentGroup.val]) ? currentSemesterData[currentGroup.val] : [];

  // 누계 자동 계산 함수
  const recalculateAccHours = (groupArray) => {
    let runningTotal = 0;
    return groupArray.map(plan => {
      runningTotal += Number(plan.weeklyH || 0);
      return {
        ...plan,
        accH: runningTotal
      };
    });
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'curriculum', 'annual_plans_dynamic_v3'), {
        semester1: semester1Plans,
        semester2: semester2Plans,
        updatedAt: new Date().toISOString()
      });
      showAlert('진도 기록이 성공적으로 저장되었습니다.', '저장 완료');
    } catch (e) { showAlert('저장 중 오류가 발생했습니다.', '저장 실패', 'error'); }
    finally { setIsSaving(false); }
  };

  const applyDefaultHours = () => {
    if (!currentGroup || !currentGroupPlans.length) return;
    showConfirm(`${selectedSemester}학기 모든 주차의 [${currentGroup.name}] 시수를 ${defaultHours}시간으로 변경하시겠습니까?`, () => {
      const hours = Number(defaultHours);
      const updatedPlans = currentGroupPlans.map((plan) => {
        const newTopics = Array(hours).fill('').map((_, i) => plan.topics?.[i] || '');
        return {
          ...plan,
          weeklyH: hours,
          topics: newTopics
        };
      });
      
      const finalizedPlans = recalculateAccHours(updatedPlans);
      setCurrentSemesterData({
        ...currentSemesterData,
        [currentGroup.val]: finalizedPlans
      });
      showAlert('기본 시수가 전체 적용되었습니다.', '적용 완료');
    }, '시수 일괄 변경');
  };

  const clearAllPlans = () => {
    if (!currentGroup) return;
    showConfirm(`[${currentGroup.name}]의 ${selectedSemester}학기 모든 진도 데이터를 삭제하고 초기화하시겠습니까?`, () => {
      const emptyPlans = currentGroupPlans.map(plan => ({
        ...plan,
        topics: [],
        weeklyH: 0,
        accH: 0
      }));
      setCurrentSemesterData({
        ...currentSemesterData,
        [currentGroup.val]: emptyPlans
      });
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

    const newPlans = currentGroupPlans.map((plan, idx) => {
      const mon = new Date(startDate);
      mon.setDate(startDate.getDate() + (idx * 7));
      const fri = new Date(mon);
      fri.setDate(mon.getDate() + 4);

      const format = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
      return { 
        ...plan, 
        period: `${format(mon)} ~ ${format(fri)}`
      };
    });

    setCurrentSemesterData({
      ...currentSemesterData,
      [currentGroup.val]: newPlans
    });
    showAlert(`[${currentGroup.name}]의 ${selectedSemester}학기 기간이 자동 생성되었습니다.`, '자동 생성 완료');
  };

  const handlePeriodDateChange = (wIdx, dateValue) => {
    if (!dateValue || !currentGroup) return;
    const selected = new Date(dateValue);
    const day = selected.getDay();
    const baseMon = new Date(selected);
    baseMon.setDate(selected.getDate() - (day === 0 ? 6 : day - 1));

    let newPlans = [...currentGroupPlans];
    const format = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

    for (let i = wIdx; i < newPlans.length; i++) {
      const mon = new Date(baseMon);
      mon.setDate(baseMon.getDate() + (i - wIdx) * 7);
      const fri = new Date(mon);
      fri.setDate(mon.getDate() + 4);

      newPlans[i] = { 
        ...newPlans[i], 
        period: `${format(mon)} ~ ${format(fri)}`
      };
    }

    setCurrentSemesterData({
      ...currentSemesterData,
      [currentGroup.val]: newPlans
    });
    showAlert(`${wIdx + 1}주차 이후의 모든 기간이 자동으로 조정되었습니다.`, '기간 연동 완료');
  };

  const updateCell = (wIdx, field, value) => {
    let newPlans = [...currentGroupPlans];
    newPlans[wIdx] = { ...newPlans[wIdx], [field]: value };
    
    if (field === 'weeklyH') {
      const h = Number(value);
      const currentTopics = newPlans[wIdx].topics || [];
      newPlans[wIdx].topics = Array(h).fill('').map((_, i) => currentTopics[i] || '');
      newPlans = recalculateAccHours(newPlans);
    }
    
    setCurrentSemesterData({
      ...currentSemesterData,
      [currentGroup.val]: newPlans
    });
  };

  const removeTopic = (wIdx, topicIdx) => {
    let newPlans = [...currentGroupPlans];
    const plan = newPlans[wIdx];
    const newTopics = [...(plan.topics || [])];
    newTopics.splice(topicIdx, 1);
    const newH = Math.max(0, Number(plan.weeklyH || 0) - 1);
    
    newPlans[wIdx] = {
      ...plan,
      topics: newTopics,
      weeklyH: newH
    };
    
    newPlans = recalculateAccHours(newPlans);
    setCurrentSemesterData({
      ...currentSemesterData,
      [currentGroup.val]: newPlans
    });
  };

  const updateTopic = (wIdx, topicIdx, value) => {
    let newPlans = [...currentGroupPlans];
    const newTopics = [...(newPlans[wIdx].topics || [])];
    newTopics[topicIdx] = value;
    newPlans[wIdx] = { ...newPlans[wIdx], topics: newTopics };
    
    setCurrentSemesterData({
      ...currentSemesterData,
      [currentGroup.val]: newPlans
    });
  };

  const removeWeek = (wIdx) => {
    showConfirm(`${currentGroupPlans[wIdx].week}주차를 삭제하시겠습니까? 이후 주차들의 번호가 하나씩 당겨집니다.`, () => {
      let newPlans = [...currentGroupPlans];
      newPlans.splice(wIdx, 1);
      
      newPlans = newPlans.map((plan, index) => ({
        ...plan,
        week: index + 1
      }));
      
      newPlans = recalculateAccHours(newPlans);
      
      setCurrentSemesterData({
        ...currentSemesterData,
        [currentGroup.val]: newPlans
      });
      showAlert('해당 주차가 성공적으로 삭제되었습니다.', '삭제 완료');
    }, '주차 삭제 확인');
  };

  const addWeek = () => {
    const lastPlan = currentGroupPlans.length > 0 ? currentGroupPlans[currentGroupPlans.length - 1] : null;
    const nextWeek = lastPlan ? Number(lastPlan.week) + 1 : 1;
    
    let nextPeriod = '';
    let nextH = lastPlan ? lastPlan.weeklyH : 0;

    if (lastPlan && lastPlan.period && lastPlan.period.includes('~')) {
      try {
        const [startStr] = lastPlan.period.split(' ~ ');
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
      period: nextPeriod,
      weeklyH: nextH,
      topics: Array(Number(nextH)).fill(''),
      accH: 0
    };

    let newPlans = [...currentGroupPlans, newWeekObj];
    newPlans = recalculateAccHours(newPlans);
    
    setCurrentSemesterData({
      ...currentSemesterData,
      [currentGroup.val]: newPlans
    });
  };

  const generateSheetData = (groupPlansArray, skipTopics = false) => {
    const aoa = [["주", "기간", "학습 주제 및 내용", "시수", "누계"]];
    const merges = [];
    let currentRow = 1;

    (groupPlansArray || []).forEach((p) => {
      const h = Math.max(1, Number(p.weeklyH || 0));
      const topics = p.topics || [];

      for (let i = 0; i < h; i++) {
        const rowData = [];
        if (i === 0) {
          rowData[0] = p.week;
          rowData[1] = p.period || "";
          rowData[3] = p.weeklyH;
          rowData[4] = p.accH;
        }
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
      const s1 = generateSheetData(semester1Plans[group.val], true);
      const ws1 = XLSX.utils.aoa_to_sheet(s1.aoa);
      ws1['!merges'] = s1.merges;
      ws1['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 70 }, { wch: 10 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws1, `${group.name}_1학기`);

      const s2 = generateSheetData(semester2Plans[group.val], true);
      const ws2 = XLSX.utils.aoa_to_sheet(s2.aoa);
      ws2['!merges'] = s2.merges;
      ws2['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 70 }, { wch: 10 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws2, `${group.name}_2학기`);
    });
    XLSX.writeFile(wb, "연간진도표_통합양식.xlsx");
  };

  const handleDownload = () => {
    const wb = XLSX.utils.book_new();
    if (!currentGroup) return;

    const s1 = generateSheetData(semester1Plans[currentGroup.val], false);
    const ws1 = XLSX.utils.aoa_to_sheet(s1.aoa);
    ws1['!merges'] = s1.merges;
    ws1['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 70 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws1, "1학기");

    const s2 = generateSheetData(semester2Plans[currentGroup.val], false);
    const ws2 = XLSX.utils.aoa_to_sheet(s2.aoa);
    ws2['!merges'] = s2.merges;
    ws2['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 70 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws2, "2학기");

    XLSX.writeFile(wb, `${currentGroup.name}_연간진도표_최종.xlsx`);
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      let newS1 = { ...semester1Plans };
      let newS2 = { ...semester2Plans };
      
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
              tempPlans[currentPlanIdx] = {
                week: row[0],
                period: row[1] || "",
                topics: [row[2] || ""],
                weeklyH: Number(row[3] || 1),
                accH: Number(row[4] || 0)
              };
            } else if (currentPlanIdx >= 0) {
              tempPlans[currentPlanIdx].topics.push(row[2] || "");
            }
          });
          
          const finalized = recalculateAccHours(tempPlans);
          if (isS2) newS2[group.val] = finalized; else newS1[group.val] = finalized;
        }
      });
      setSemester1Plans(newS1);
      setSemester2Plans(newS2);
      showAlert('양식을 성공적으로 불러왔습니다.', '업로드 완료');
    };
    reader.readAsBinaryString(file);
  };

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
          <div className="col-lesson-header">차시</div>
          <div className="col-topic-header">
            <div className="topic-title">{currentGroup?.name} {selectedSemester}학기 진도 계획</div>
            <div className="topic-subtitle">학습 주제 및 내용 (우측 X 버튼으로 개별 삭제 가능)</div>
          </div>
          <div className="col-small-header">시수</div>
          <div className="col-small-header">누계</div>
        </div>

        {currentGroupPlans.map((plan, wIdx) => {
          const h = Number(plan.weeklyH || 0);
          let startLessonNum = 1;
          for (let i = 0; i < wIdx; i++) {
            startLessonNum += Number(currentGroupPlans[i].weeklyH || 0);
          }

          return (
            <div key={wIdx} className="plan-week-row">
              <div className="col-week-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="week-num-label">{plan.week}주</div>
                <button 
                  className="btn-delete-week no-print" 
                  onClick={() => removeWeek(wIdx)}
                  title="이 주차 삭제"
                  style={{ marginTop: '4px', fontSize: '11px', padding: '2px 4px', color: '#ff4d4f', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: '4px', cursor: 'pointer' }}
                >
                  주 삭제
                </button>
              </div>
              
              <div className="col-period-box">
                <div className="period-input-group">
                  <input 
                    type="text" 
                    className="row-input period-manual-input" 
                    value={plan.period || ''} 
                    onChange={(e) => updateCell(wIdx, 'period', e.target.value)}
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
              
              <div className="col-lesson-topic-container">
                {Array.from({ length: Math.max(1, h) }).map((_, i) => (
                  <div key={i} className="lesson-row-item">
                    <div className="col-lesson-box">
                      <div className="lesson-badge-simple">{h > 0 ? startLessonNum + i : '-'}</div>
                    </div>
                    <div className="col-topic-box-sub">
                      {h > 0 ? (
                        <>
                          <textarea className="lesson-textarea" value={plan.topics?.[i] || ''} onChange={(e) => updateTopic(wIdx, i, e.target.value)} placeholder={`${startLessonNum + i}차시 주제 입력...`} />
                          <button className="btn-delete-topic" onClick={() => removeTopic(wIdx, i)} title="이 차시 삭제">✕</button>
                        </>
                      ) : (
                        <div className="no-hours-notice">시수를 입력하면 주제 입력칸이 나타납니다.</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="col-small-box weekly-hours-col">
                <input 
                  type="number" 
                  className="row-input weekly-h-input" 
                  value={h} 
                  onChange={(e) => updateCell(wIdx, 'weeklyH', e.target.value)} 
                />
              </div>

              <div className="col-small-box acc-highlight">
                <div className="acc-value">{plan.accH || 0}</div>
              </div>
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
