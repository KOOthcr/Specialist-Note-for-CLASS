import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, getDocs, doc, setDoc, getDoc, query, where, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import * as XLSX from 'xlsx';
import { useModal } from '../components/common/GlobalModal';
import SophisticatedDatePicker from '../components/common/SophisticatedDatePicker';
import ReasonEditModal from '../components/attendance/ReasonEditModal';
import './StudentList.css';

function AttendancePage() {
  const { showAlert } = useModal();
  const [viewMode, setViewMode] = useState(null);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [attendanceData, setAttendanceData] = useState({});
  const [today, setToday] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().substring(0, 7));
  const [monthlyRecords, setMonthlyRecords] = useState({});
  const [currentEditStatus, setCurrentEditStatus] = useState('결석');
  const [isSaving, setIsSaving] = useState(false);
  const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
  const [activeStudentForReason, setActiveStudentForReason] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => { if (user) { setCurrentUser(user); fetchInitialData(user.uid); } else { setCurrentUser(null); } });
    return () => unsubscribe();
  }, []);

  const fetchInitialData = async (uid) => {
    try {
      const classSnapshot = await getDocs(collection(db, 'users', uid, 'classes'));
      setClasses(classSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.grade === b.grade ? a.class_number - b.class_number : a.grade - b.grade));
      const clubSnapshot = await getDocs(collection(db, 'users', uid, 'clubs'));
      setClubs(clubSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      const studentSnapshot = await getDocs(collection(db, 'users', uid, 'students'));
      setStudents(studentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) { console.error('Error fetching data:', error); }
  };

  const fetchAttendanceRecord = async (group) => {
    if (!currentUser) return;
    const docId = group.type === 'class' ? `${today}_${group.grade}_${group.class_number}` : `${today}_club_${group.name}`;
    const snap = await getDoc(doc(db, 'users', currentUser.uid, 'attendance', docId));
    setAttendanceData(snap.exists() ? snap.data().records || {} : {});
  };

  const fetchMonthlyRecords = async (group) => {
    if (!currentUser || !group) return;
    try {
      const q = query(collection(db, 'users', currentUser.uid, 'attendance'), where('date', '>=', `${selectedMonth}-01`), where('date', '<=', `${selectedMonth}-31`));
      const snapshot = await getDocs(q);
      const records = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (group.type === 'class' && data.grade === group.grade && data.class_number === group.class_number) records[data.date] = data.records;
        else if (group.type === 'club' && data.group_info?.name === group.name) records[data.date] = data.records;
      });
      setMonthlyRecords(records);
    } catch (error) { console.error('Error fetching monthly records:', error); }
  };

  const handleSelectGroup = (group) => { setSelectedGroup(group); if (viewMode === 'daily') fetchAttendanceRecord(group); else fetchMonthlyRecords(group); };

  const handleCellClick = (dateStr, studentId) => {
    if (viewMode !== 'monthly') return;
    setMonthlyRecords(prev => {
      const dayData = { ...(prev[dateStr] || {}) };
      const currentStatus = dayData[studentId]?.status;
      if (currentStatus === currentEditStatus) delete dayData[studentId];
      else dayData[studentId] = { ...dayData[studentId], status: currentEditStatus };
      return { ...prev, [dateStr]: dayData };
    });
  };

  const handleSave = async () => {
    if (!currentUser || !selectedGroup) return;
    const docId = selectedGroup.type === 'class' ? `${today}_${selectedGroup.grade}_${selectedGroup.class_number}` : `${today}_club_${selectedGroup.name}`;
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'attendance', docId), { date: today, grade: selectedGroup.grade || null, class_number: selectedGroup.class_number || null, group_info: selectedGroup, records: attendanceData, updated_at: new Date().toISOString() });
      showAlert('출결 기록이 저장되었습니다.', '성공');
    } catch (error) { console.error('Error saving attendance:', error); showAlert('저장 중 오류가 발생했습니다.', '오류', 'error'); }
  };

  const handleMonthlySave = async () => {
    if (!currentUser || !selectedGroup) return;
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      for (const [dateStr, records] of Object.entries(monthlyRecords)) {
        const docId = selectedGroup.type === 'class' ? `${dateStr}_${selectedGroup.grade}_${selectedGroup.class_number}` : `${dateStr}_club_${selectedGroup.name}`;
        batch.set(doc(db, 'users', currentUser.uid, 'attendance', docId), { date: dateStr, grade: selectedGroup.grade || null, class_number: selectedGroup.class_number || null, group_info: selectedGroup, records, updated_at: new Date().toISOString() }, { merge: true });
      }
      await batch.commit();
      showAlert('월별 출결 정보가 저장되었습니다.', '성공');
    } catch (error) { showAlert('저장 중 오류가 발생했습니다.', '오류', 'error'); }
    finally { setIsSaving(false); }
  };

  const handleReasonSaveInModal = (dateStr, reasonInput) => {
    if (!activeStudentForReason || !dateStr) return;
    setMonthlyRecords(prev => {
      const dayData = { ...(prev[dateStr] || {}) };
      dayData[activeStudentForReason.id] = { ...dayData[activeStudentForReason.id], reason: reasonInput };
      return { ...prev, [dateStr]: dayData };
    });
    setIsReasonModalOpen(false);
  };

  const handleExcelExport = () => {
    if (!selectedGroup) return;
    const daysInMonth = getDaysInMonth(selectedMonth);
    const dayColumns = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const data = filteredStudents.map((student, idx) => {
      const row = { '순번': idx + 1, '학년': student.grade, '반': student.class_number, '번호': student.student_number, '성명': student.name, '성별': student.gender };
      let absentCount = 0, lateCount = 0, earlyCount = 0;
      dayColumns.forEach(d => {
        const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
        const status = monthlyRecords[dateStr]?.[student.id]?.status || '';
        row[`${d}일`] = status === '결석' ? '●' : status === '지각' ? '▲' : status === '조퇴' ? '▼' : '';
        if (status === '결석') absentCount++; else if (status === '지각') lateCount++; else if (status === '조퇴') earlyCount++;
      });
      row['결석계'] = absentCount; row['지각계'] = lateCount; row['조퇴계'] = earlyCount;
      return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '출석부');
    XLSX.writeFile(workbook, `${selectedMonth}_출석부.xlsx`);
  };

  const filteredStudents = students.filter(s => {
    if (!selectedGroup) return false;
    if (selectedGroup.type === 'class') return s.grade === selectedGroup.grade && s.class_number === selectedGroup.class_number;
    return s.club === selectedGroup.name;
  }).sort((a, b) => { if (a.grade !== b.grade) return a.grade - b.grade; if (a.class_number !== b.class_number) return a.class_number - b.class_number; return a.student_number - b.student_number; });

  const getDaysInMonth = (yearMonth) => { const [year, month] = yearMonth.split('-').map(Number); return new Date(year, month, 0).getDate(); };
  const getDayOfWeek = (yearMonth, day) => { const [year, month] = yearMonth.split('-').map(Number); const date = new Date(year, month - 1, day); const days = ['일', '월', '화', '수', '목', '금', '토']; return days[date.getDay()]; };

  const renderGroupSelection = () => (
    <div className="card-grid-container" style={{ animation: 'fadeIn 0.5s ease' }}>
      <div className="group-section"><h3 className="section-title">🏫 학급 선택</h3><div className="card-grid">{classes.map((cls) => (<div key={cls.id} className="group-card class-card" onClick={() => handleSelectGroup({ type: 'class', ...cls })}><div className="card-icon">🏫</div><div className="card-info"><span className="card-name">{cls.grade}학년 {cls.class_number}반</span><span className="card-count">{students.filter(s => s.grade === cls.grade && s.class_number === cls.class_number).length}명</span></div></div>))}</div></div>
      <div className="group-section" style={{ marginTop: '40px' }}><h3 className="section-title">✨ 동아리 선택</h3><div className="card-grid">{clubs.map((club) => (<div key={club.id} className="group-card club-card" onClick={() => handleSelectGroup({ type: 'club', ...club })}><div className="card-icon">🎨</div><div className="card-info"><span className="card-name">{club.name}</span><span className="card-count">{students.filter(s => s.club === club.name).length}명</span></div></div>))}</div></div>
    </div>
  );

  const renderDailyView = () => (
    <>
      <div className="dashboard-header-container">
        <div className="dashboard-header-top">
          <SophisticatedDatePicker value={today} onChange={(val) => { setToday(val); if (selectedGroup) fetchAttendanceRecord(selectedGroup); }} />
          <div style={{ display: 'flex', gap: '10px' }}>
            {selectedGroup ? (<><button className="btn-solid-green" onClick={handleSave}>저장하기</button><button className="btn-outline-green" onClick={() => setSelectedGroup(null)}>뒤로가기</button></>) : (<button className="btn-outline-green" onClick={() => setViewMode(null)}>메인으로</button>)}
          </div>
        </div>
      </div>
      {!selectedGroup ? renderGroupSelection() : (
        <div className="table-container">
          <table className="student-table">
            <thead>
              {selectedGroup.type === 'class' ? (<tr><th>번호</th><th>이름</th><th>성별</th><th>출결 상태</th><th>비고</th></tr>) : (<tr><th>순번</th><th>반</th><th>번호</th><th>이름</th><th>성별</th><th>출결 상태</th><th>비고</th></tr>)}
            </thead>
            <tbody>
              {filteredStudents.map((student, idx) => {
                const record = attendanceData[student.id] || { status: '', reason: '' };
                return (
                  <tr key={student.id}>
                    {selectedGroup.type === 'class' ? (<><td style={{ width: '60px' }}>{student.student_number}</td><td style={{ fontWeight: 'bold' }}>{student.name}</td><td style={{ width: '60px' }}>{student.gender}</td></>) : (<><td style={{ width: '50px' }}>{idx + 1}</td><td style={{ width: '60px' }}>{student.grade}-{student.class_number}</td><td style={{ width: '60px' }}>{student.student_number}</td><td style={{ fontWeight: 'bold' }}>{student.name}</td><td style={{ width: '60px' }}>{student.gender}</td></>)}
                    <td>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        {['결석', '지각', '조퇴'].map(status => (
                          <button key={status} onClick={() => setAttendanceData(prev => ({ ...prev, [student.id]: { ...prev[student.id], status: prev[student.id]?.status === status ? '' : status } }))}
                            style={{ padding: '6px 14px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', border: record.status === status ? 'none' : '1px solid #eee', backgroundColor: record.status === status ? (status === '결석' ? '#ff4d4f' : status === '지각' ? '#faad14' : '#1890ff') : '#f8f9fa', color: record.status === status ? 'white' : '#777', fontWeight: 'bold' }}>
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td><input type="text" className="auth-input" style={{ width: '90%', padding: '8px', borderRadius: '8px' }} value={record.reason} onChange={(e) => setAttendanceData(prev => ({ ...prev, [student.id]: { ...prev[student.id], reason: e.target.value } }))} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  const renderMonthlyView = () => {
    const daysInMonth = getDaysInMonth(selectedMonth);
    const dayColumns = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    return (
      <>
        <div className="dashboard-header-container">
          <div className="dashboard-header-top">
            <SophisticatedDatePicker value={selectedMonth} mode="monthly" onChange={(val) => { setSelectedMonth(val); if (selectedGroup) fetchMonthlyRecords(selectedGroup); }} />
            <button className="btn-outline-green" onClick={() => selectedGroup ? setSelectedGroup(null) : setViewMode(null)}>{selectedGroup ? '뒤로가기' : '메인으로'}</button>
          </div>
          {selectedGroup && (
            <div className="monthly-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '15px 25px', borderRadius: '20px', marginTop: '15px', border: '1px solid #f0f0f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}><span style={{ fontSize: '15px', fontWeight: '800', color: '#444' }}>입력 모드:</span><div style={{ display: 'flex', gap: '12px' }}>{['결석', '지각', '조퇴', '정상'].map(status => (<label key={status} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '15px', fontWeight: '600', color: currentEditStatus === status ? 'var(--color-primary)' : '#888' }}><input type="radio" name="editMode" value={status} checked={currentEditStatus === status} onChange={() => setCurrentEditStatus(status)} />{status === '정상' ? '기록 삭제' : status}</label>))}</div></div>
              <div style={{ display: 'flex', gap: '12px' }}><button className="btn-solid-green" onClick={handleMonthlySave} disabled={isSaving} style={{ padding: '10px 24px', borderRadius: '12px' }}>{isSaving ? '저장 중...' : '기록 저장'}</button><button className="btn-outline-green" style={{ borderColor: '#2e7d32', color: '#2e7d32', padding: '10px 20px', borderRadius: '12px' }} onClick={handleExcelExport}>엑셀 출력</button></div>
            </div>
          )}
        </div>
        {!selectedGroup ? renderGroupSelection() : (
          <div className="table-container" style={{ overflowX: 'auto', marginTop: '15px' }}>
            <table className="student-table" style={{ fontSize: '11px', borderCollapse: 'collapse', width: 'auto', minWidth: '100%' }}>
              <thead>
                <tr>
                  {selectedGroup.type === 'class' ? (<><th rowSpan="2">번호</th><th rowSpan="2">성명</th><th rowSpan="2">성별</th></>) : (<><th rowSpan="2">순번</th><th rowSpan="2">학년</th><th rowSpan="2">반</th><th rowSpan="2">번호</th><th rowSpan="2">성명</th><th rowSpan="2">성별</th></>)}
                  {dayColumns.map(d => (<th key={d} style={{ padding: '6px', border: '1px solid #eee', minWidth: '30px', color: getDayOfWeek(selectedMonth, d) === '토' ? '#1890ff' : getDayOfWeek(selectedMonth, d) === '일' ? '#ff4d4f' : '#333', backgroundColor: '#fdfdfd' }}>{d}</th>))}
                  <th rowSpan="2" style={{ minWidth: '40px', color: '#ff4d4f' }}>결</th><th rowSpan="2" style={{ minWidth: '40px', color: '#faad14' }}>지</th><th rowSpan="2" style={{ minWidth: '40px', color: '#1890ff' }}>조</th><th rowSpan="2" style={{ minWidth: '150px' }}>사유 등록</th>
                </tr>
                <tr>{dayColumns.map(d => (<th key={d} style={{ padding: '2px', border: '1px solid #eee', fontSize: '10px', color: getDayOfWeek(selectedMonth, d) === '토' ? '#1890ff' : getDayOfWeek(selectedMonth, d) === '일' ? '#ff4d4f' : '#777', backgroundColor: '#fdfdfd' }}>{getDayOfWeek(selectedMonth, d)}</th>))}</tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, idx) => {
                  let counts = { '결석': 0, '지각': 0, '조퇴': 0 }; let reasons = [];
                  dayColumns.forEach(d => { const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`; const dayRecord = monthlyRecords[dateStr]?.[student.id]; if (dayRecord?.status) counts[dayRecord.status]++; if (dayRecord?.reason) reasons.push(`${d}일:${dayRecord.reason}`); });
                  return (
                    <tr key={student.id}>
                      {selectedGroup.type === 'class' ? (<><td style={{ border: '1px solid #eee' }}>{student.student_number}</td><td style={{ border: '1px solid #eee', fontWeight: 'bold' }}>{student.name}</td><td style={{ border: '1px solid #eee' }}>{student.gender}</td></>) : (<><td style={{ border: '1px solid #eee' }}>{idx + 1}</td><td style={{ border: '1px solid #eee' }}>{student.grade}</td><td style={{ border: '1px solid #eee' }}>{student.class_number}</td><td style={{ border: '1px solid #eee' }}>{student.student_number}</td><td style={{ border: '1px solid #eee', fontWeight: 'bold' }}>{student.name}</td><td style={{ border: '1px solid #eee' }}>{student.gender}</td></>)}
                      {dayColumns.map(d => {
                        const dateStr = `${selectedMonth}-${String(d).padStart(2, '0')}`;
                        const status = monthlyRecords[dateStr]?.[student.id]?.status;
                        let symbol = '', color = '';
                        if (status === '결석') { symbol = '●'; color = '#ff4d4f'; } else if (status === '지각') { symbol = '▲'; color = '#faad14'; } else if (status === '조퇴') { symbol = '▼'; color = '#1890ff'; }
                        return (<td key={d} onClick={() => handleCellClick(dateStr, student.id)} style={{ padding: '0', border: '1px solid #eee', textAlign: 'center', height: '36px', cursor: 'pointer', backgroundColor: '#fff' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}><span style={{ color, fontSize: '16px', fontWeight: 'bold' }}>{symbol}</span></td>);
                      })}
                      <td style={{ border: '1px solid #eee', fontWeight: 'bold', color: '#ff4d4f' }}>{counts['결석'] || ''}</td><td style={{ border: '1px solid #eee', fontWeight: 'bold', color: '#faad14' }}>{counts['지각'] || ''}</td><td style={{ border: '1px solid #eee', fontWeight: 'bold', color: '#1890ff' }}>{counts['조퇴'] || ''}</td>
                      <td style={{ border: '1px solid #eee', padding: '4px' }}><div style={{ minHeight: '32px', cursor: 'pointer', fontSize: '11px', color: '#666', display: 'flex', alignItems: 'center', padding: '0 8px', backgroundColor: '#f8f9fa', borderRadius: '6px' }} onClick={() => { setActiveStudentForReason(student); setIsReasonModalOpen(true); }}>{reasons.length > 0 ? reasons.join(', ') : '+ 사유 입력'}</div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="student-dashboard">
      {!viewMode ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '75vh', animation: 'fadeIn 0.6s ease' }}>
          <h1 style={{ marginBottom: '50px', color: 'var(--color-primary-dark)', fontWeight: '900', fontSize: '32px', letterSpacing: '-1px' }}>인원 체크 리포트</h1>
          <div style={{ display: 'flex', gap: '40px', width: '100%', maxWidth: '900px' }}>
            <div className="group-card" style={{ flex: 1, height: '340px', borderRadius: '30px', background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '2px solid #e8f5e9' }} onClick={() => setViewMode('daily')}><div style={{ fontSize: '70px', marginBottom: '25px' }}>📅</div><div style={{ fontSize: '26px', fontWeight: '800', color: '#333' }}>일별 체크</div><p style={{ fontSize: '15px', color: '#666', marginTop: '15px', lineHeight: '1.6' }}>오늘의 출결 상황을<br/>빠르게 기록하고 관리합니다.</p></div>
            <div className="group-card" style={{ flex: 1, height: '340px', borderRadius: '30px', background: 'linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '2px solid #e3f2fd' }} onClick={() => setViewMode('monthly')}><div style={{ fontSize: '70px', marginBottom: '25px' }}>📊</div><div style={{ fontSize: '26px', fontWeight: '800', color: '#333' }}>월별 리포트</div><p style={{ fontSize: '15px', color: '#666', marginTop: '15px', lineHeight: '1.6' }}>한 달간의 전체 현황을<br/>그리드 형태로 파악하고 편집합니다.</p></div>
          </div>
        </div>
      ) : (viewMode === 'daily' ? renderDailyView() : renderMonthlyView())}
      <ReasonEditModal isOpen={isReasonModalOpen} student={activeStudentForReason} selectedMonth={selectedMonth} monthlyRecords={monthlyRecords} onSave={handleReasonSaveInModal} onClose={() => setIsReasonModalOpen(false)} />
    </div>
  );
}

export default AttendancePage;
