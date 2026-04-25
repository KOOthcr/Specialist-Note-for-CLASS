import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, writeBatch, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useModal } from '../components/common/GlobalModal';
import AddRecordModal from '../components/accumulated/AddRecordModal';
import EditRecordModal from '../components/accumulated/EditRecordModal';
import AccumulatedStudentList from '../components/accumulated/AccumulatedStudentList';
import AccumulatedRecordFeed from '../components/accumulated/AccumulatedRecordFeed';
import { useAccumulatedRecords } from '../hooks/useAccumulatedRecords';
import { exportStudentRecordsToExcel, exportGroupRecordsToExcel } from '../utils/accumulatedExportUtils';
import './AccumulatedRecordPage.css';

function AccumulatedRecordPage() {
  const { showAlert, showConfirm } = useModal();
  const { currentUser, classes, clubs, students, selectedGroup, setSelectedGroup, studentRecords, fetchStudentRecords } = useAccumulatedRecords();
  
  const [activeFilter, setActiveFilter] = useState('전체');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('text');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  useEffect(() => {
    if (currentUser && selectedStudents.length === 1) fetchStudentRecords(selectedStudents[0].id);
  }, [selectedStudents, currentUser]);

  const handleSaveBatchRecords = async (targetStudents, data) => {
    if (!currentUser) return;
    const batch = writeBatch(db);
    targetStudents.forEach(student => {
      const newDocRef = doc(collection(db, 'users', currentUser.uid, 'accumulated_records'));
      batch.set(newDocRef, { ...data, studentId: student.id, studentName: student.name, timestamp: serverTimestamp() });
    });
    await batch.commit();
    if (selectedStudents.length === 1) fetchStudentRecords(selectedStudents[0].id);
  };

  const handleDeleteRecord = async (recordId) => {
    if (!currentUser) return;
    showConfirm('이 기록을 삭제하시겠습니까?', async () => {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'accumulated_records', recordId));
        if (selectedStudents.length === 1) fetchStudentRecords(selectedStudents[0].id);
        showAlert('기록이 삭제되었습니다.', '삭제 완료');
      } catch (e) { showAlert('삭제 중 오류가 발생했습니다.', '오류', 'error'); }
    });
  };

  const studentsToDisplay = students.filter(s => {
    if (selectedGroup.type === 'class') return s.grade === selectedGroup.grade && s.class_number === selectedGroup.class_number;
    if (selectedGroup.type === 'club') return s.club === selectedGroup.name;
    return true;
  }).filter(s => !searchTerm || s.name.includes(searchTerm) || s.student_number.toString().includes(searchTerm)).sort((a, b) => a.grade - b.grade || a.class_number - b.class_number || a.student_number - b.student_number);

  const groupStudentsByClass = (list) => {
    const groups = {};
    list.forEach(s => { const key = `${s.grade}-${s.class_number}`; if (!groups[key]) groups[key] = { label: `${s.grade}학년 ${s.class_number}반`, students: [] }; groups[key].students.push(s); });
    return Object.values(groups).sort((a, b) => { const [ag, ac] = a.label.match(/\d+/g).map(Number); const [bg, bc] = b.label.match(/\d+/g).map(Number); return ag - bg || ac - bc; });
  };

  return (
    <div className="accumulated-dashboard">
      <div className="group-selection-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px' }}>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', flex: 1 }}>
          <button className={`group-btn ${selectedGroup.id === 'all' ? 'active' : ''}`} onClick={() => { setSelectedGroup({ id: 'all', name: '전체', type: 'all' }); setSelectedStudents([]); }}>전체</button>
          {classes.map(cls => <button key={cls.id} className={`group-btn ${selectedGroup.id === cls.id ? 'active' : ''}`} onClick={() => { setSelectedGroup({ ...cls, name: `${cls.grade}학년 ${cls.class_number}반` }); setSelectedStudents([]); }}>{cls.grade}-{cls.class_number}</button>)}
          {clubs.map(club => <button key={club.id} className={`group-btn ${selectedGroup.id === club.id ? 'active' : ''}`} onClick={() => { setSelectedGroup({ ...club, type: 'club' }); setSelectedStudents([]); }}>{club.name}</button>)}
        </div>
        <button className="btn-outline-green" style={{ padding: '8px 15px', fontSize: '13px', borderRadius: '10px', marginLeft: '20px' }} onClick={async () => { const snap = await getDocs(collection(db, 'users', currentUser.uid, 'accumulated_records')); exportGroupRecordsToExcel(selectedGroup, studentsToDisplay, snap.docs.map(d => ({ id: d.id, ...d.data() })), showAlert); }}>📂 반 전체기록 다운로드</button>
      </div>

      <div className="behavior-container">
        <AccumulatedStudentList selectedGroup={selectedGroup} selectedStudents={selectedStudents} clearSelection={() => setSelectedStudents([])} searchTerm={searchTerm} setSearchTerm={setSearchTerm} studentsToDisplay={studentsToDisplay} groupedData={selectedGroup.type === 'all' ? groupStudentsByClass(studentsToDisplay) : null} toggleStudentSelection={(s) => setSelectedStudents(prev => prev.some(ps => ps.id === s.id) ? prev.filter(ps => ps.id !== s.id) : [...prev, s])} />
        <div className="behavior-right-pane" style={{ flex: selectedStudents.length > 0 ? '1.4' : '0.8', padding: selectedStudents.length > 0 ? '0' : '30px', display: 'flex', flexDirection: 'column' }}>
          {selectedStudents.length === 0 ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', textAlign: 'center' }}><div style={{ fontSize: '60px', marginBottom: '20px' }}>👈</div><h3>학생을 선택해주세요</h3><p>왼쪽 명단에서 학생을 선택하여 기록을 남길 수 있습니다.</p></div> : 
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '25px', borderBottom: '1px solid #eee', backgroundColor: '#fafbfc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div><h3 style={{ fontSize: '24px', fontWeight: '800' }}>{selectedStudents.length === 1 ? selectedStudents[0].name : `총 ${selectedStudents.length}명 선택됨`}</h3><span style={{ fontSize: '14px', color: '#777' }}>{selectedStudents.length === 1 ? `${selectedStudents[0].grade}학년 ${selectedStudents[0].class_number}반` : selectedStudents.map(s => s.name).join(', ').substring(0, 50)}</span></div>
                {selectedStudents.length === 1 && <button className="btn-outline-green" style={{ padding: '8px 15px', fontSize: '13px', borderRadius: '10px' }} onClick={() => exportStudentRecordsToExcel(selectedStudents[0], studentRecords, showAlert)}>📄 학생기록 다운로드</button>}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>{['photo', 'video', 'text'].map(type => <button key={type} className={`action-card card-${type === 'text' ? 'record' : type} mini-action`} onClick={() => { setModalType(type); setIsModalOpen(true); }}><span className="card-icon-container">{type === 'photo' ? '🖼️' : type === 'video' ? '▶️' : '📋'}</span> {type === 'text' ? '누가기록 작성' : type === 'photo' ? '사진' : '동영상'}</button>)}</div>
            </div>
            <AccumulatedRecordFeed selectedStudents={selectedStudents} studentRecords={studentRecords} activeFilter={activeFilter} setActiveFilter={setActiveFilter} filters={['전체', '사진', '동영상', '오디오', '누가기록']} onEdit={(rec) => { setEditingRecord(rec); setIsEditModalOpen(true); }} onDelete={handleDeleteRecord} />
          </div>}
        </div>
      </div>
      <AddRecordModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} students={selectedStudents} type={modalType} onSave={handleSaveBatchRecords} selectedGroup={selectedGroup} currentUser={currentUser} />
      <EditRecordModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} record={editingRecord} onUpdate={async (rid, data) => { if (!currentUser) return; await updateDoc(doc(db, 'users', currentUser.uid, 'accumulated_records', rid), data); if (selectedStudents.length === 1) fetchStudentRecords(selectedStudents[0].id); }} />
    </div>
  );
}

export default AccumulatedRecordPage;
