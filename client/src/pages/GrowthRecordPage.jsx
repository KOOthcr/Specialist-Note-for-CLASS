import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, setDoc, getDoc, query, where, addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useModal } from '../components/common/GlobalModal';
import IndividualGraphModal from '../components/growth/IndividualGraphModal';
import CategoryModal from '../components/growth/CategoryModal';
import GrowthDailyView from '../components/growth/GrowthDailyView';
import GrowthMonthlyView from '../components/growth/GrowthMonthlyView';
import { useGrowthRecords } from '../hooks/useGrowthRecords';
import { exportGrowthDailyToExcel, exportGrowthMonthlyToExcel } from '../utils/growthExportUtils';
import './StudentList.css';

function GrowthRecordPage() {
  const { showAlert } = useModal();
  const { currentUser, classes, clubs, students, categories, setCategories, selectedCategory, setSelectedCategory, fetchCategoriesForGroup } = useGrowthRecords();
  const [viewMode, setViewMode] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [recordData, setRecordData] = useState({});
  const [today, setToday] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().substring(0, 7));
  const [monthlyRecords, setMonthlyRecords] = useState({});
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);
  const [activeStudentForGraph, setActiveStudentForGraph] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  useEffect(() => { if (currentUser && selectedGroup) fetchCategoriesForGroup(currentUser.uid, selectedGroup.id || selectedGroup.name); else { setCategories([]); setSelectedCategory(null); } }, [selectedGroup, currentUser]);

  useEffect(() => {
    if (!currentUser || !selectedGroup || !selectedCategory) return;
    const groupId = selectedGroup.id || selectedGroup.name;
    if (viewMode === 'daily') getDoc(doc(db, 'users', currentUser.uid, 'growth_detail_records', `${today}_${selectedGroup.type}_${groupId}_${selectedCategory.id}`)).then(s => setRecordData(s.exists() ? s.data().records : {}));
    else if (viewMode === 'monthly') getDocs(query(collection(db, 'users', currentUser.uid, 'growth_detail_records'), where('date', '>=', `${selectedMonth}-01`), where('date', '<=', `${selectedMonth}-31`))).then(s => { const r = {}; s.forEach(d => { if (d.data().categoryId === selectedCategory.id && d.data().groupId === groupId) r[d.data().date] = d.data().records; }); setMonthlyRecords(r); });
  }, [viewMode, today, selectedMonth, selectedCategory, selectedGroup, currentUser]);

  const handleSaveCategory = async (t, u, c) => {
    if (!currentUser || !selectedGroup) return;
    const gid = selectedGroup.id || selectedGroup.name;
    try {
      if (editingCategory) { await updateDoc(doc(db, 'users', currentUser.uid, 'growth_categories', editingCategory.id), { title: t, unit: u, columnCount: c }); const nc = { id: editingCategory.id, title: t, unit: u, columnCount: c, groupId: gid }; setCategories(prev => prev.map(cv => cv.id === nc.id ? nc : cv)); setSelectedCategory(nc); }
      else { const dr = await addDoc(collection(db, 'users', currentUser.uid, 'growth_categories'), { title: t, unit: u, columnCount: c, groupId: gid, created_at: new Date().toISOString() }); const nc = { id: dr.id, title: t, unit: u, columnCount: c, groupId: gid }; setCategories(prev => [...prev, nc]); setSelectedCategory(nc); }
      setIsCategoryModalOpen(false); setEditingCategory(null); showAlert('완료되었습니다.');
    } catch (e) { showAlert('오류 발생'); }
  };

  const handleSave = async () => {
    if (!currentUser || !selectedGroup || !selectedCategory) return;
    const gid = selectedGroup.id || selectedGroup.name;
    const sr = {}; const cc = selectedCategory.columnCount || 1;
    Object.keys(recordData).forEach(sid => { const r = recordData[sid]; const sv = []; for (let i = 0; i < cc; i++) sv[i] = r.values?.[i] ?? ''; sr[sid] = { ...r, values: sv, note: r.note || '', value: sv[0] || '' }; });
    try { await setDoc(doc(db, 'users', currentUser.uid, 'growth_detail_records', `${today}_${selectedGroup.type}_${gid}_${selectedCategory.id}`), { date: today, categoryId: selectedCategory.id, groupId: gid, groupType: selectedGroup.type, records: sr, updated_at: new Date().toISOString() }, { merge: true }); showAlert('저장 성공'); } catch (e) { showAlert('실패'); }
  };

  const renderCategoryTabs = () => (
    <div style={{ marginTop: '15px', display: 'flex', gap: '12px', alignItems: 'center', overflowX: 'auto', padding: '10px 0' }}>
      {categories.map(cat => <button key={cat.id} onClick={() => setSelectedCategory(cat)} style={{ padding: '10px 20px', borderRadius: '50px', fontSize: '14px', backgroundColor: selectedCategory?.id === cat.id ? 'var(--color-primary)' : '#fff', color: selectedCategory?.id === cat.id ? '#fff' : '#666', border: '1px solid #eee', fontWeight: selectedCategory?.id === cat.id ? '700' : '500' }}>{cat.title}</button>)}
      <button className="btn-solid-green" style={{ borderRadius: '50px', fontSize: '13px', padding: '8px 18px' }} onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }}>+ 새 항목</button>
    </div>
  );

  return (
    <div className="student-dashboard">
      {!viewMode ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '75vh' }}><h1 style={{ marginBottom: '50px', fontSize: '32px', fontWeight: '900', color: 'var(--color-primary-dark)' }}>성장 기록 리포트</h1><div style={{ display: 'flex', gap: '40px', width: '100%', maxWidth: '800px' }}><div className="group-card" style={{ flex: 1 }} onClick={() => setViewMode('daily')}><div>🌱</div><div>일별 성장 기록</div></div><div className="group-card" style={{ flex: 1 }} onClick={() => setViewMode('monthly')}><div>📅</div><div>월별 성장 기록</div></div></div></div> : 
      (viewMode === 'daily' ? <GrowthDailyView today={today} setToday={setToday} selectedGroup={selectedGroup} setSelectedGroup={setSelectedGroup} classes={classes} clubs={clubs} students={students} renderCategoryTabs={renderCategoryTabs} selectedCategory={selectedCategory} setEditingCategory={setEditingCategory} setIsCategoryModalOpen={setIsCategoryModalOpen} handleDailyExcelDownload={() => exportGrowthDailyToExcel(today, selectedGroup, selectedCategory, students, recordData)} handleSave={handleSave} setViewMode={setViewMode} getFilteredGroupStudents={() => students.filter(s => selectedGroup.type === 'class' ? (s.grade === selectedGroup.grade && s.class_number === selectedGroup.class_number) : (s.club === selectedGroup.name)).sort((a, b) => a.student_number - b.student_number)} recordData={recordData} setRecordData={setRecordData} handleDecrementColumnCount={async () => { const nc = selectedCategory.columnCount - 1; await updateDoc(doc(db, 'users', currentUser.uid, 'growth_categories', selectedCategory.id), { columnCount: nc }); const uc = { ...selectedCategory, columnCount: nc }; setSelectedCategory(uc); setCategories(prev => prev.map(c => c.id === uc.id ? uc : c)); }} handleIncrementColumnCount={async () => { const nc = (selectedCategory.columnCount || 1) + 1; await updateDoc(doc(db, 'users', currentUser.uid, 'growth_categories', selectedCategory.id), { columnCount: nc }); const uc = { ...selectedCategory, columnCount: nc }; setSelectedCategory(uc); setCategories(prev => prev.map(c => c.id === uc.id ? uc : c)); }} handleRecordValueChange={(sid, ci, v) => setRecordData(prev => { const cur = prev[sid] || { value: '', note: '', values: [] }; const nv = [...(cur.values || [])]; nv[ci] = v; return { ...prev, [sid]: { ...cur, values: nv, value: ci === 0 ? v : cur.value } }; })} /> : 
      <GrowthMonthlyView selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} selectedGroup={selectedGroup} setSelectedGroup={setSelectedGroup} classes={classes} clubs={clubs} students={students} renderCategoryTabs={renderCategoryTabs} selectedCategory={selectedCategory} handleMonthlyExcelDownload={() => exportGrowthMonthlyToExcel(selectedMonth, selectedGroup, selectedCategory, students, monthlyRecords)} setViewMode={setViewMode} getFilteredGroupStudents={() => students.filter(s => selectedGroup.type === 'class' ? (s.grade === selectedGroup.grade && s.class_number === selectedGroup.class_number) : (s.club === selectedGroup.name)).sort((a, b) => a.student_number - b.student_number)} monthlyRecords={monthlyRecords} setActiveStudentForGraph={setActiveStudentForGraph} setIsGraphModalOpen={setIsGraphModalOpen} />)}
      <CategoryModal isOpen={isCategoryModalOpen} initialData={editingCategory} onSave={handleSaveCategory} onDelete={async (id) => { if (!currentUser) return; await deleteDoc(doc(db, 'users', currentUser.uid, 'growth_categories', id)); setCategories(prev => prev.filter(c => c.id !== id)); if (selectedCategory?.id === id) setSelectedCategory(null); setIsCategoryModalOpen(false); }} onClose={() => setIsCategoryModalOpen(false)} />
      <IndividualGraphModal isOpen={isGraphModalOpen} student={activeStudentForGraph} category={selectedCategory} records={monthlyRecords} onClose={() => setIsGraphModalOpen(false)} />
    </div>
  );
}

export default GrowthRecordPage;
