import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, getDocs, doc, setDoc, getDoc, query, where, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import * as XLSX from 'xlsx';
import { useModal } from '../components/common/GlobalModal';
import SophisticatedDatePicker from '../components/common/SophisticatedDatePicker';
import ReasonEditModal from '../components/attendance/ReasonEditModal';
import AttendanceDailyView from '../components/attendance/AttendanceDailyView';
import AttendanceMonthlyView from '../components/attendance/AttendanceMonthlyView';
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
    <AttendanceDailyView 
      today={today} setToday={setToday}
      selectedGroup={selectedGroup} setSelectedGroup={setSelectedGroup}
      renderGroupSelection={renderGroupSelection}
      fetchAttendanceRecord={fetchAttendanceRecord}
      handleSave={handleSave}
      setViewMode={setViewMode}
      filteredStudents={filteredStudents}
      attendanceData={attendanceData}
      setAttendanceData={setAttendanceData}
    />
  );

  const renderMonthlyView = () => (
    <AttendanceMonthlyView 
      selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}
      selectedGroup={selectedGroup} setSelectedGroup={setSelectedGroup}
      renderGroupSelection={renderGroupSelection}
      fetchMonthlyRecords={fetchMonthlyRecords}
      currentEditStatus={currentEditStatus} setCurrentEditStatus={setCurrentEditStatus}
      isSaving={isSaving}
      handleMonthlySave={handleMonthlySave}
      handleExcelExport={handleExcelExport}
      setViewMode={setViewMode}
      filteredStudents={filteredStudents}
      monthlyRecords={monthlyRecords}
      handleCellClick={handleCellClick}
      setActiveStudentForReason={setActiveStudentForReason}
      setIsReasonModalOpen={setIsReasonModalOpen}
      getDayOfWeek={getDayOfWeek}
      getDaysInMonth={getDaysInMonth}
    />
  );

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
