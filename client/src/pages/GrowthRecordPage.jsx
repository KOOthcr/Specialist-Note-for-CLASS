import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, getDocs, doc, setDoc, getDoc, query, where, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useModal } from '../components/common/GlobalModal';
import * as XLSX from 'xlsx';
import SophisticatedDatePicker from '../components/common/SophisticatedDatePicker';
import GroupSelectionGrid from '../components/common/GroupSelectionGrid';
import IndividualGraphModal from '../components/growth/IndividualGraphModal';
import CategoryModal from '../components/growth/CategoryModal';
import './StudentList.css';

function GrowthRecordPage() {
  const { showAlert } = useModal();
  const [viewMode, setViewMode] = useState(null);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [recordData, setRecordData] = useState({});
  const [today, setToday] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().substring(0, 7));
  const [monthlyRecords, setMonthlyRecords] = useState({});
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  const [activeStudentForGraph, setActiveStudentForGraph] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => { if (user) { setCurrentUser(user); fetchInitialData(user.uid); } });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser && selectedGroup) {
      const groupId = selectedGroup.id || selectedGroup.name;
      fetchCategoriesForGroup(currentUser.uid, groupId);
    } else {
      setCategories([]);
      setSelectedCategory(null);
    }
  }, [selectedGroup, currentUser]);

  useEffect(() => {
    if (currentUser && selectedGroup && selectedCategory) {
      if (viewMode === 'daily') fetchGrowthRecord(selectedGroup, selectedCategory.id);
      else if (viewMode === 'monthly') fetchMonthlyGrowthRecords(selectedGroup, selectedCategory.id);
    }
  }, [viewMode, today, selectedMonth, selectedCategory, selectedGroup, currentUser]);

  const fetchInitialData = async (uid) => {
    try {
      const classSnapshot = await getDocs(collection(db, 'users', uid, 'classes'));
      setClasses(classSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.grade - b.grade || a.class_number - b.class_number));
      const clubSnapshot = await getDocs(collection(db, 'users', uid, 'clubs'));
      setClubs(clubSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      const studentSnapshot = await getDocs(collection(db, 'users', uid, 'students'));
      setStudents(studentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) { console.error(e); }
  };

  const fetchCategoriesForGroup = async (uid, groupId) => {
    try {
      const q = query(collection(db, 'users', uid, 'growth_categories'), where('groupId', '==', groupId));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCategories(list);
      if (list.length > 0) setSelectedCategory(list[0]);
      else setSelectedCategory(null);
    } catch (e) { console.error(e); }
  };

  const handleSaveCategory = async (title, unit, columnCount) => {
    if (!currentUser || !title || !selectedGroup) return;
    const groupId = selectedGroup.id || selectedGroup.name;
    try {
      if (editingCategory) {
        await updateDoc(doc(db, 'users', currentUser.uid, 'growth_categories', editingCategory.id), { title, unit, columnCount });
        const updatedCat = { id: editingCategory.id, title, unit, columnCount, groupId };
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? updatedCat : c));
        setSelectedCategory(updatedCat);
        showAlert('항목이 성공적으로 수정되었습니다.', '수정 완료');
      } else {
        const docRef = await addDoc(collection(db, 'users', currentUser.uid, 'growth_categories'), { title, unit, columnCount, groupId, created_at: new Date().toISOString() });
        const newCat = { id: docRef.id, title, unit, columnCount, groupId };
        setCategories(prev => [...prev, newCat]);
        setSelectedCategory(newCat);
        showAlert('새로운 성장 기록 항목이 추가되었습니다.', '추가 완료');
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (e) { showAlert('항목 처리 중 오류가 발생했습니다.', '오류'); }
  };

  const handleDeleteCategory = async (id) => {
    if (!currentUser || !window.confirm('정말 이 항목을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'growth_categories', id));
      setCategories(prev => prev.filter(c => c.id !== id));
      if (selectedCategory?.id === id) {
        const next = categories.find(c => c.id !== id);
        setSelectedCategory(next || null);
      }
      setIsCategoryModalOpen(false);
      showAlert('항목이 삭제되었습니다.', '삭제 완료');
    } catch (e) { showAlert('항목 삭제 중 오류가 발생했습니다.', '오류'); }
  };

  const fetchGrowthRecord = async (group, categoryId) => {
    try {
      const groupId = group.id || group.name;
      const docId = `${today}_${group.type}_${groupId}_${categoryId}`;
      const snap = await getDoc(doc(db, 'users', currentUser.uid, 'growth_detail_records', docId));
      setRecordData(snap.exists() ? snap.data().records : {});
    } catch (e) { console.error(e); }
  };

  const fetchMonthlyGrowthRecords = async (group, categoryId) => {
    try {
      const groupId = group.id || group.name;
      const q = query(collection(db, 'users', currentUser.uid, 'growth_detail_records'), where('date', '>=', `${selectedMonth}-01`), where('date', '<=', `${selectedMonth}-31`));
      const snap = await getDocs(q);
      const records = {};
      snap.forEach(d => { const data = d.data(); if (data.categoryId === categoryId && data.groupId === groupId) records[data.date] = data.records; });
      setMonthlyRecords(records);
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    if (!currentUser || !selectedGroup || !selectedCategory) return;
    const groupId = selectedGroup.id || selectedGroup.name;
    const docId = `${today}_${selectedGroup.type}_${groupId}_${selectedCategory.id}`;
    const sanitizedRecords = {};
    const colCount = selectedCategory.columnCount || 1;
    Object.keys(recordData).forEach(studentId => {
      const record = recordData[studentId];
      const sanitizedValues = [];
      for (let i = 0; i < colCount; i++) sanitizedValues[i] = record.values?.[i] !== undefined ? record.values[i] : '';
      sanitizedRecords[studentId] = { ...record, values: sanitizedValues, note: record.note || '', value: sanitizedValues[0] || '' };
    });
    try {
      await setDoc(doc(db, 'users', currentUser.uid, 'growth_detail_records', docId), { date: today, categoryId: selectedCategory.id, groupId, groupType: selectedGroup.type, records: sanitizedRecords, updated_at: new Date().toISOString() }, { merge: true });
      showAlert('오늘의 성장 기록이 안전하게 저장되었습니다.', '저장 성공', 'success');
    } catch (e) { console.error('Save Error:', e); showAlert('기록 저장 중 오류가 발생했습니다.', '저장 실패', 'error'); }
  };

  const handleIncrementColumnCount = async () => {
    if (!currentUser || !selectedCategory) return;
    const newCount = (selectedCategory.columnCount || 1) + 1;
    await updateDoc(doc(db, 'users', currentUser.uid, 'growth_categories', selectedCategory.id), { columnCount: newCount });
    const updatedCat = { ...selectedCategory, columnCount: newCount };
    setSelectedCategory(updatedCat);
    setCategories(prev => prev.map(c => c.id === selectedCategory.id ? updatedCat : c));
  };

  const handleDecrementColumnCount = async () => {
    if (!currentUser || !selectedCategory || (selectedCategory.columnCount || 1) <= 1) return;
    if (!window.confirm('측정 열을 하나 줄이시겠습니까? 마지막 열의 데이터가 보이지 않게 됩니다.')) return;
    const newCount = selectedCategory.columnCount - 1;
    await updateDoc(doc(db, 'users', currentUser.uid, 'growth_categories', selectedCategory.id), { columnCount: newCount });
    const updatedCat = { ...selectedCategory, columnCount: newCount };
    setSelectedCategory(updatedCat);
    setCategories(prev => prev.map(c => c.id === selectedCategory.id ? updatedCat : c));
  };

  const handleRecordValueChange = (studentId, colIdx, value) => {
    setRecordData(prev => {
      const current = prev[studentId] || { value: '', note: '', values: [] };
      const newValues = [...(current.values || [])];
      if (newValues.length === 0 && current.value) newValues[0] = current.value;
      for (let i = 0; i < colIdx; i++) { if (newValues[i] === undefined) newValues[i] = ''; }
      newValues[colIdx] = value;
      return { ...prev, [studentId]: { ...current, values: newValues, value: colIdx === 0 ? value : current.value } };
    });
  };

  const handleDailyExcelDownload = () => {
    if (!selectedGroup || !selectedCategory) return;
    const filtered = students.filter(s => selectedGroup.type === 'class' ? (s.grade === selectedGroup.grade && s.class_number === selectedGroup.class_number) : (s.club === selectedGroup.name)).sort((a, b) => a.student_number - b.student_number);
    const colCount = selectedCategory.columnCount || 1;
    const data = filtered.map(student => {
      const record = recordData[student.id] || { value: '', note: '', values: [] };
      const row = { '번호': student.student_number, '이름': student.name, '성별': student.gender, '관찰 메모': record.note };
      for (let i = 0; i < colCount; i++) { const key = `${selectedCategory.unit}${i + 1}`; row[key] = record.values?.[i] ?? (i === 0 ? record.value : ''); }
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '일일기록');
    XLSX.writeFile(wb, `${today}_${selectedGroup.name || selectedGroup.id}_${selectedCategory.title}_성장기록.xlsx`);
  };

  const handleMonthlyExcelDownload = () => {
    if (!selectedGroup || !selectedCategory) return;
    const days = new Date(selectedMonth.split('-')[0], selectedMonth.split('-')[1], 0).getDate();
    const filtered = students.filter(s => selectedGroup.type === 'class' ? (s.grade === selectedGroup.grade && s.class_number === selectedGroup.class_number) : (s.club === selectedGroup.name)).sort((a, b) => a.student_number - b.student_number);
    const data = filtered.map(student => {
      const row = { '번호/반': selectedGroup.type === 'class' ? student.student_number : `${student.grade}-${student.class_number}`, '성명': student.name };
      for (let d = 1; d <= days; d++) {
        const date = `${selectedMonth}-${String(d).padStart(2, '0')}`;
        const rec = monthlyRecords[date]?.[student.id];
        let displayValue = '';
        if (rec) {
          if (rec.values && rec.values.length > 0) displayValue = rec.values.filter(v => v !== '' && v !== undefined).join(' / ');
          else if (rec.value) displayValue = rec.value;
        }
        row[`${d}일`] = displayValue;
      }
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '월별기록');
    XLSX.writeFile(wb, `${selectedMonth}_${selectedGroup.name || selectedGroup.id}_${selectedCategory.title}_월별성장기록.xlsx`);
  };

  // 카테고리 탭 렌더링 (일별/월별 공통으로 사용)
  const renderCategoryTabs = () => (
    <div style={{ marginTop: '15px', display: 'flex', gap: '12px', alignItems: 'center', overflowX: 'auto', padding: '10px 0' }}>
      {categories.map(cat => (
        <button key={cat.id} onClick={() => setSelectedCategory(cat)} style={{ padding: '10px 20px', borderRadius: '50px', fontSize: '14px', backgroundColor: selectedCategory?.id === cat.id ? 'var(--color-primary)' : '#fff', color: selectedCategory?.id === cat.id ? '#fff' : '#666', border: '1px solid #eee', fontWeight: selectedCategory?.id === cat.id ? '700' : '500', transition: 'all 0.2s', boxShadow: selectedCategory?.id === cat.id ? '0 4px 10px rgba(56,142,60,0.2)' : 'none', whiteSpace: 'nowrap' }}>{cat.title}</button>
      ))}
      <button className="btn-solid-green" style={{ borderRadius: '50px', fontSize: '13px', padding: '8px 18px', background: '#43a047' }} onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }}>+ 새 항목</button>
    </div>
  );

  const getFilteredGroupStudents = () =>
    students.filter(s => selectedGroup.type === 'class' ? (s.grade === selectedGroup.grade && s.class_number === selectedGroup.class_number) : (s.club === selectedGroup.name)).sort((a, b) => a.student_number - b.student_number);

  const renderDailyView = () => (
    <>
      <div className="dashboard-header-container">
        <div className="dashboard-header-top">
          <SophisticatedDatePicker value={today} onChange={setToday} />
          <div style={{ display: 'flex', gap: '10px' }}>
            {selectedGroup ? (<><button className="btn-outline-green" style={{ borderRadius: '50px' }} onClick={handleDailyExcelDownload}>일일기록 다운로드</button><button className="btn-solid-green" style={{ borderRadius: '50px', padding: '10px 24px' }} onClick={handleSave}>기록 저장하기</button><button className="btn-outline-green" style={{ borderRadius: '50px' }} onClick={() => setSelectedGroup(null)}>뒤로가기</button></>) : (<button className="btn-outline-green" style={{ borderRadius: '50px' }} onClick={() => setViewMode(null)}>메인으로</button>)}
          </div>
        </div>
        {selectedGroup && renderCategoryTabs()}
      </div>
      {!selectedGroup ? <GroupSelectionGrid classes={classes} clubs={clubs} students={students} onSelectGroup={(g) => setSelectedGroup({ type: 'class', ...g })} /> : (
        <div className="table-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#333' }}>📈 {selectedCategory?.title || '항목 선택'} 일일 기록</h3>
            {selectedCategory && (<button className="btn-outline-green" style={{ padding: '6px 14px', borderRadius: '50px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => { setEditingCategory(selectedCategory); setIsCategoryModalOpen(true); }}><span>✏️</span> 항목 수정</button>)}
          </div>
          <table className="student-table" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8faf8' }}>
                {selectedGroup.type === 'class' ? (<><th style={{ width: '50px' }}>번호</th><th style={{ width: '100px' }}>이름</th><th style={{ width: '70px' }}>성별</th></>) : (<><th style={{ width: '50px' }}>순번</th><th style={{ width: '70px' }}>반</th><th style={{ width: '50px' }}>번호</th><th style={{ width: '100px' }}>이름</th><th style={{ width: '70px' }}>성별</th></>)}
                <th style={{ width: 'auto' }}>관찰 메모</th>
                {Array.from({ length: selectedCategory?.columnCount || 1 }).map((_, i) => (
                  <th key={i} style={{ width: '110px', position: 'relative', padding: '15px 5px' }}>
                    <button onClick={handleDecrementColumnCount} style={{ position: 'absolute', top: '5px', right: '5px', width: '20px', height: '20px', borderRadius: '50%', border: '1px solid #ff4d4f', color: '#ff4d4f', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', zIndex: 5 }} title="이 열 삭제">-</button>
                    <span style={{ fontSize: '13px', color: '#555' }}>{selectedCategory?.unit || '기록'}{selectedCategory?.columnCount > 1 ? ` ${i + 1}` : ''}</span>
                  </th>
                ))}
                <th style={{ width: '60px', borderRight: 'none' }}>
                  <button onClick={handleIncrementColumnCount} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold', margin: '0 auto' }} title="측정 열 추가">+</button>
                </th>
              </tr>
            </thead>
            <tbody>
              {getFilteredGroupStudents().map((student, idx) => {
                const record = recordData[student.id] || { value: '', note: '', values: [] };
                return (
                  <tr key={student.id}>
                    {selectedGroup.type === 'class' ? (<><td style={{ fontSize: '13px' }}>{student.student_number}</td><td style={{ fontWeight: '700', color: '#222' }}>{student.name}</td><td>{student.gender}</td></>) : (<><td style={{ fontSize: '13px' }}>{idx + 1}</td><td>{student.grade}-{student.class_number}</td><td>{student.student_number}</td><td style={{ fontWeight: '700' }}>{student.name}</td><td>{student.gender}</td></>)}
                    <td><input type="text" className="auth-input" style={{ width: '95%', padding: '10px', fontSize: '13px', background: '#fdfdfd' }} value={record.note} placeholder="학생 특이사항 기록" onChange={(e) => setRecordData(prev => ({ ...prev, [student.id]: { ...prev[student.id], note: e.target.value } }))} /></td>
                    {Array.from({ length: selectedCategory?.columnCount || 1 }).map((_, i) => (
                      <td key={i}><input type="number" className="auth-input" style={{ width: '85px', textAlign: 'center', fontWeight: '700', color: 'var(--color-primary-dark)' }} value={record.values?.[i] ?? (i === 0 ? record.value : '')} onChange={(e) => handleRecordValueChange(student.id, i, e.target.value)} /></td>
                    ))}
                    <td />
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
    const days = new Date(selectedMonth.split('-')[0], selectedMonth.split('-')[1], 0).getDate();
    return (
      <>
        <div className="dashboard-header-container">
          <div className="dashboard-header-top">
            <SophisticatedDatePicker value={selectedMonth} mode="monthly" onChange={setSelectedMonth} />
            <div style={{ display: 'flex', gap: '10px' }}>
              {selectedGroup ? (<><button className="btn-outline-green" style={{ borderRadius: '50px' }} onClick={handleMonthlyExcelDownload}>월별기록 다운로드</button><button className="btn-outline-green" style={{ borderRadius: '50px' }} onClick={() => setSelectedGroup(null)}>뒤로가기</button></>) : (<button className="btn-outline-green" style={{ borderRadius: '50px' }} onClick={() => setViewMode(null)}>메인으로</button>)}
            </div>
          </div>
          {selectedGroup && renderCategoryTabs()}
        </div>
        {!selectedGroup ? <GroupSelectionGrid classes={classes} clubs={clubs} students={students} onSelectGroup={(g) => setSelectedGroup({ type: 'class', ...g })} /> : (
          <div className="table-container" style={{ marginTop: '15px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#333', marginBottom: '16px' }}>📅 {selectedCategory?.title || '항목 선택'} 월별 성장 기록</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="student-table" style={{ fontSize: '11px', minWidth: '100%' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8faf8' }}>
                    <th style={{ minWidth: '80px' }}>번호/반</th><th style={{ minWidth: '80px' }}>성명</th>
                    {Array.from({ length: days }, (_, i) => i + 1).map(d => <th key={d} style={{ minWidth: '35px' }}>{d}</th>)}
                    <th style={{ minWidth: '80px' }}>성장 그래프</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredGroupStudents().map((student) => (
                    <tr key={student.id}>
                      <td>{selectedGroup.type === 'class' ? student.student_number : `${student.grade}-${student.class_number}`}</td>
                      <td style={{ fontWeight: '700', color: 'var(--color-primary-dark)', cursor: 'pointer' }} onClick={() => { setActiveStudentForGraph(student); setIsGraphModalOpen(true); }}>{student.name}</td>
                      {Array.from({ length: days }, (_, i) => i + 1).map(d => {
                        const date = `${selectedMonth}-${String(d).padStart(2, '0')}`;
                        const rec = monthlyRecords[date]?.[student.id];
                        let displayValue = '-';
                        let hasData = false;
                        if (rec) {
                          if (rec.values && rec.values.length > 0) {
                            const validValues = rec.values.filter(v => v !== '' && v !== undefined);
                            if (validValues.length > 0) { displayValue = validValues.join(' / '); hasData = true; }
                          } else if (rec.value) { displayValue = rec.value; hasData = true; }
                        }
                        const cellStyle = { color: hasData ? 'var(--color-primary)' : '#ccc', fontSize: hasData && String(displayValue).length > 4 ? '10px' : '11px', whiteSpace: 'nowrap' };
                        return <td key={d} style={cellStyle}>{displayValue}</td>;
                      })}
                      <td><button className="btn-outline-green" style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '50px' }} onClick={() => { setActiveStudentForGraph(student); setIsGraphModalOpen(true); }}>개인 리포트</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="student-dashboard">
      {!viewMode ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '75vh', animation: 'fadeIn 0.6s ease' }}>
          <h1 style={{ marginBottom: '50px', fontSize: '32px', fontWeight: '900', color: 'var(--color-primary-dark)' }}>성장 기록 리포트</h1>
          <div style={{ display: 'flex', gap: '40px', width: '100%', maxWidth: '800px' }}>
            <div className="group-card" style={{ flex: 1, borderRadius: '30px', border: '2px solid #e8f5e9' }} onClick={() => setViewMode('daily')}>
              <div style={{ fontSize: '60px', marginBottom: '20px' }}>🌱</div>
              <div style={{ fontSize: '22px', fontWeight: '800' }}>일별 성장 기록</div>
              <p style={{ color: '#888', marginTop: '10px' }}>오늘의 항목별 수행 결과를 기록합니다.</p>
            </div>
            <div className="group-card" style={{ flex: 1, borderRadius: '30px', border: '2px solid #f3e5f5' }} onClick={() => setViewMode('monthly')}>
              <div style={{ fontSize: '60px', marginBottom: '20px' }}>📅</div>
              <div style={{ fontSize: '22px', fontWeight: '800' }}>월별 성장 기록</div>
              <p style={{ color: '#888', marginTop: '10px' }}>한 달간의 성장 변화를 한눈에 확인합니다.</p>
            </div>
          </div>
        </div>
      ) : (viewMode === 'daily' ? renderDailyView() : renderMonthlyView())}
      <CategoryModal isOpen={isCategoryModalOpen} initialData={editingCategory} onSave={handleSaveCategory} onDelete={handleDeleteCategory} onClose={() => { setIsCategoryModalOpen(false); setEditingCategory(null); }} />
      <IndividualGraphModal isOpen={isGraphModalOpen} student={activeStudentForGraph} category={selectedCategory} records={monthlyRecords} onClose={() => setIsGraphModalOpen(false)} />
    </div>
  );
}

export default GrowthRecordPage;
