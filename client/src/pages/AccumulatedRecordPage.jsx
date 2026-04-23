import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, getDocs, query, where, orderBy, serverTimestamp, writeBatch, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useModal } from '../components/common/GlobalModal';
import * as XLSX from 'xlsx';
import AddRecordModal from '../components/accumulated/AddRecordModal';
import EditRecordModal from '../components/accumulated/EditRecordModal';
import './AccumulatedRecordPage.css';

function AccumulatedRecordPage() {
  const { showAlert, showConfirm } = useModal();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeFilter, setActiveFilter] = useState('전체');
  const [classes, setClasses] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState({ id: 'all', name: '전체', type: 'all' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]); // 다중 선택을 위해 배열로 관리
  const [studentRecords, setStudentRecords] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('text');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const filters = ['전체', '사진', '동영상', '오디오', '누가기록'];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchGroups(user.uid);
        fetchStudents(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  // 단일 학생이 선택되었을 때만 기록 피드를 불러옴
  useEffect(() => {
    if (currentUser && selectedStudents.length === 1) {
      fetchStudentRecords(selectedStudents[0].id);
    } else {
      setStudentRecords([]);
    }
  }, [selectedStudents, currentUser]);

  const fetchGroups = async (uid) => {
    try {
      const classesRef = collection(db, 'users', uid, 'classes');
      const classSnap = await getDocs(classesRef);
      setClasses(classSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'class' })).sort((a, b) => a.grade - b.grade || a.class_number - b.class_number));
      const clubsRef = collection(db, 'users', uid, 'clubs');
      const clubSnap = await getDocs(clubsRef);
      setClubs(clubSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'club' })));
    } catch (e) { console.error(e); }
  };

  const fetchStudents = async (uid) => {
    try {
      const studentsRef = collection(db, 'users', uid, 'students');
      const snap = await getDocs(studentsRef);
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) { console.error(e); }
  };

  const fetchStudentRecords = async (studentId) => {
    if (!currentUser) return;
    try {
      const recordsRef = collection(db, 'users', currentUser.uid, 'accumulated_records');
      const q = query(recordsRef, where('studentId', '==', studentId), orderBy('date', 'desc'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      setStudentRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      // 색인 문제 발생 시 기본 쿼리로 대체
      try {
        const recordsRef = collection(db, 'users', currentUser.uid, 'accumulated_records');
        const fallbackSnap = await getDocs(recordsRef);
        const filtered = fallbackSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(r => r.studentId === studentId)
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        setStudentRecords(filtered);
      } catch (err) { console.error(err); }
    }
  };

  const toggleStudentSelection = (student) => {
    setSelectedStudents(prev => {
      const isSelected = prev.some(s => s.id === student.id);
      return isSelected ? prev.filter(s => s.id !== student.id) : [...prev, student];
    });
  };

  const clearSelection = () => setSelectedStudents([]);

  const handleSaveBatchRecords = async (targetStudents, data) => {
    if (!currentUser) return;
    // 여러 문서를 한 번에 저장하기 위해 batch 사용
    const batch = writeBatch(db);
    targetStudents.forEach(student => {
      const newDocRef = doc(collection(db, 'users', currentUser.uid, 'accumulated_records'));
      batch.set(newDocRef, { ...data, studentId: student.id, studentName: student.name, timestamp: serverTimestamp() });
    });
    await batch.commit();
    if (selectedStudents.length === 1) fetchStudentRecords(selectedStudents[0].id);
  };

  const openRecordModal = (type) => { setModalType(type); setIsModalOpen(true); };

  const handleDeleteRecord = async (recordId) => {
    if (!currentUser) return;
    showConfirm('이 기록을 삭제하시겠습니까?', async () => {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'accumulated_records', recordId));
        if (selectedStudents.length === 1) fetchStudentRecords(selectedStudents[0].id);
        showAlert('기록이 삭제되었습니다.', '삭제 완료');
      } catch (e) {
        console.error('Delete Error:', e);
        showAlert('삭제 중 오류가 발생했습니다.', '오류', 'error');
      }
    });
  };

  const handleUpdateRecord = async (recordId, updatedData) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'accumulated_records', recordId), updatedData);
      if (selectedStudents.length === 1) fetchStudentRecords(selectedStudents[0].id);
    } catch (e) {
      console.error('Update Error:', e);
      throw e;
    }
  };

  const openEditModal = (record) => { setEditingRecord(record); setIsEditModalOpen(true); };

  const handleDownloadStudentExcel = () => {
    if (selectedStudents.length !== 1 || studentRecords.length === 0) { showAlert('다운로드할 데이터가 없습니다.', '알림'); return; }
    const student = selectedStudents[0];
    const data = studentRecords
      .filter(r => !(r.content && r.content.includes('[선생님께 한마디]')))
      .map(r => ({ 
        '날짜': r.date, 
        '구분': r.type === 'text' ? '누가기록' : r.type === 'photo' ? '사진' : '동영상', 
        '내용': r.content, 
        '파일명': r.fileName || '-',
        '파일 링크': r.fileUrl || '-' 
      }));
    if (data.length === 0) { showAlert('다운로드할 기록이 없습니다.', '알림'); return; }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '기록');
    XLSX.writeFile(workbook, `${student.name}_기록_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadClassExcel = async () => {
    if (selectedGroup.id === 'all') { showAlert('먼저 반 또는 동아리를 선택해주세요.', '알림'); return; }
    try {
      const recordsRef = collection(db, 'users', currentUser.uid, 'accumulated_records');
      const snap = await getDocs(recordsRef);
      const allRecords = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const groupStudents = getFilteredStudents();
      const studentIds = groupStudents.map(s => s.id);
      const filtered = allRecords
        .filter(r => studentIds.includes(r.studentId) && !(r.content && r.content.includes('[선생님께 한마디]')))
        .sort((a, b) => {
          const sA = groupStudents.find(s => s.id === a.studentId);
          const sB = groupStudents.find(s => s.id === b.studentId);
          if (sA?.student_number !== sB?.student_number) return (sA?.student_number || 0) - (sB?.student_number || 0);
          return new Date(b.date) - new Date(a.date);
        });
      if (filtered.length === 0) { showAlert('선택한 그룹에 다운로드할 기록이 없습니다.', '알림'); return; }
      const data = filtered.map(r => {
        const s = groupStudents.find(st => st.id === r.studentId);
        return { 
          '번호': s?.student_number || '-', 
          '이름': s?.name || '-', 
          '날짜': r.date, 
          '구분': r.type === 'text' ? '누가기록' : r.type === 'photo' ? '사진' : '동영상', 
          '내용': r.content,
          '파일 링크': r.fileUrl || '-'
        };
      });
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '반전체기록');
      XLSX.writeFile(workbook, `${selectedGroup.name}_전체기록_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      console.error(e);
      showAlert('데이터를 불러오는 중 오류가 발생했습니다.', '오류', 'error');
    }
  };

  const getFilteredStudents = () => {
    let filtered = students;
    if (selectedGroup.type === 'class') filtered = students.filter(s => s.grade === selectedGroup.grade && s.class_number === selectedGroup.class_number);
    else if (selectedGroup.type === 'club') filtered = students.filter(s => s.club === selectedGroup.name);
    if (searchTerm) filtered = filtered.filter(s => s.name.includes(searchTerm) || s.student_number.toString().includes(searchTerm));
    return filtered.sort((a, b) => a.grade - b.grade || a.class_number - b.class_number || a.student_number - b.student_number);
  };

  const studentsToDisplay = getFilteredStudents();

  const groupStudentsByClass = (studentList) => {
    const groups = {};
    studentList.forEach(s => {
      const key = `${s.grade}-${s.class_number}`;
      if (!groups[key]) groups[key] = { label: `${s.grade}학년 ${s.class_number}반`, students: [] };
      groups[key].students.push(s);
    });
    return Object.values(groups).sort((a, b) => {
      const [aGrade, aClass] = a.label.match(/\d+/g).map(Number);
      const [bGrade, bClass] = b.label.match(/\d+/g).map(Number);
      return aGrade - bGrade || aClass - bClass;
    });
  };

  const groupedData = selectedGroup.type === 'all' ? groupStudentsByClass(studentsToDisplay) : null;

  return (
    <div className="accumulated-dashboard">
      {/* 상단 그룹 네비게이션 및 다운로드 버튼 */}
      <div className="group-selection-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px' }}>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', flex: 1 }}>
          <button className={`group-btn ${selectedGroup.id === 'all' ? 'active' : ''}`} onClick={() => { setSelectedGroup({ id: 'all', name: '전체', type: 'all' }); clearSelection(); }}>전체</button>
          {classes.map(cls => (
            <button key={cls.id} className={`group-btn ${selectedGroup.id === cls.id ? 'active' : ''}`} onClick={() => { setSelectedGroup({ ...cls, name: `${cls.grade}학년 ${cls.class_number}반` }); clearSelection(); }}>{cls.grade}-{cls.class_number}</button>
          ))}
          {clubs.map(club => (
            <button key={club.id} className={`group-btn ${selectedGroup.id === club.id ? 'active' : ''}`} onClick={() => { setSelectedGroup({ ...club, type: 'club' }); clearSelection(); }}>{club.name}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px', marginLeft: '20px', flexShrink: 0 }}>
          <button className="btn-outline-green" style={{ padding: '8px 15px', fontSize: '13px', borderRadius: '10px' }} onClick={handleDownloadClassExcel}>📂 반 전체기록 다운로드</button>
        </div>
      </div>

      <div className="behavior-container">
        {/* 좌측 패널: 학생 목록 (다중 선택 가능) */}
        <div className="behavior-left-pane" style={{ flex: selectedStudents.length > 0 ? '0.6' : '1.2' }}>
          <div className="pane-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 className="pane-title" style={{ marginBottom: 0 }}>학생 명단 <span style={{ fontSize: '14px', color: '#888', marginLeft: '10px' }}>{selectedGroup.name}</span></h2>
              {selectedStudents.length > 0 && (
                <button className="btn-outline-green" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={clearSelection}>선택 초기화</button>
              )}
            </div>
            <div className="search-bar">
              <input type="text" placeholder="학생명이나 번호로 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <div className="search-icons"><span>🔍</span></div>
            </div>
          </div>

          <div className="pane-content student-list-scroll">
            {studentsToDisplay.length > 0 ? (
              <div className="student-items">
                {selectedGroup.type === 'all' ? (
                  groupedData.map(group => (
                    <div key={group.label} className="class-group-section">
                      <h4 className="class-group-title">{group.label}</h4>
                      {group.students.map(student => {
                        const isSelected = selectedStudents.some(s => s.id === student.id);
                        return (
                          <div key={student.id} className={`student-item-card mini ${isSelected ? 'selected' : ''}`} onClick={() => toggleStudentSelection(student)}>
                            <div className={`student-avatar mini ${isSelected ? 'active' : ''}`}>{isSelected ? '✓' : student.name[0]}</div>
                            <div className="student-info">
                              <span className="student-name" style={{ color: isSelected ? 'var(--color-primary-dark)' : '#333' }}>{student.name}</span>
                              <span className="student-sub">{student.student_number}번</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                ) : (
                  studentsToDisplay.map(student => {
                    const isSelected = selectedStudents.some(s => s.id === student.id);
                    return (
                      <div key={student.id} className={`student-item-card ${isSelected ? 'selected' : ''}`} onClick={() => toggleStudentSelection(student)}>
                        <div className={`student-avatar ${isSelected ? 'active' : ''}`}>{isSelected ? '✓' : student.name[0]}</div>
                        <div className="student-info">
                          <span className="student-name" style={{ color: isSelected ? 'var(--color-primary-dark)' : '#333' }}>{student.name}</span>
                          <span className="student-sub">{student.grade}학년 {student.class_number}반 {student.student_number}번</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="empty-list">
                <div className="empty-icon">!</div>
                <p className="empty-text">해당 그룹에 학생이 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* 우측 패널: 기록 작성 및 보기 */}
        <div className="behavior-right-pane" style={{ flex: selectedStudents.length > 0 ? '1.4' : '0.8', alignItems: selectedStudents.length > 0 ? 'stretch' : 'center', padding: selectedStudents.length > 0 ? '0' : '30px' }}>
          {selectedStudents.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', textAlign: 'center' }}>
              <div style={{ fontSize: '60px', marginBottom: '20px' }}>👈</div>
              <h3 style={{ fontSize: '20px', color: '#555', marginBottom: '10px' }}>학생을 선택해주세요</h3>
              <p style={{ fontSize: '15px', lineHeight: '1.6' }}>왼쪽 명단에서 여러 명의 학생을 동시에 클릭하여<br/>한 번에 일괄 기록을 남길 수도 있습니다.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* 상단: 선택된 학생 정보 및 기록 추가 버튼 */}
              <div style={{ padding: '25px', borderBottom: '1px solid #eee', backgroundColor: '#fafbfc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    {selectedStudents.length === 1 ? (
                      <>
                        <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#333' }}>{selectedStudents[0].name}</h3>
                        <span style={{ fontSize: '14px', color: '#777' }}>{selectedStudents[0].grade}학년 {selectedStudents[0].class_number}반 {selectedStudents[0].student_number}번 | {selectedStudents[0].club}</span>
                      </>
                    ) : (
                      <>
                        <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-primary-dark)' }}>총 {selectedStudents.length}명 선택됨</h3>
                        <span style={{ fontSize: '14px', color: '#777', display: 'block', marginTop: '5px' }}>
                          {selectedStudents.map(s => s.name).join(', ').substring(0, 50)}{selectedStudents.length > 5 ? '...' : ''}
                        </span>
                      </>
                    )}
                  </div>
                  {selectedStudents.length === 1 && (
                    <button className="btn-outline-green" style={{ padding: '8px 15px', fontSize: '13px', borderRadius: '10px' }} onClick={handleDownloadStudentExcel}>📄 학생기록 다운로드</button>
                  )}
                </div>

                <h4 style={{ fontSize: '14px', color: '#888', marginBottom: '10px', fontWeight: 'bold' }}>{selectedStudents.length > 1 ? '일괄 기록 추가하기' : '새 기록 추가하기'}</h4>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="action-card card-photo mini-action" onClick={() => openRecordModal('photo')}><span className="card-icon-container">🖼️</span> 사진</button>
                  <button className="action-card card-video mini-action" onClick={() => openRecordModal('video')}><span className="card-icon-container">▶️</span> 동영상</button>
                  <button className="action-card card-record mini-action" onClick={() => openRecordModal('text')}><span className="card-icon-container">📋</span> 누가기록 작성</button>
                </div>
              </div>

              {/* 하단: 기록 피드 (단일 선택 시에만 표시) */}
              <div style={{ padding: '25px', flex: 1, overflowY: 'auto', backgroundColor: '#fff' }}>
                {selectedStudents.length === 1 ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '18px', fontWeight: '800', color: '#333' }}>이전 기록 <span style={{ color: 'var(--color-primary)', fontSize: '14px' }}>총 {studentRecords.length}개</span></h4>
                      <div className="filter-chips">
                        {filters.map((filter) => (
                          <button key={filter} className={`chip ${activeFilter === filter ? 'active' : ''}`} onClick={() => setActiveFilter(filter)}>{filter}</button>
                        ))}
                      </div>
                    </div>

                    {studentRecords.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {studentRecords
                          .filter(rec => {
                            // 선생님께 한마디는 누가기록 페이지에서 제외
                            if (rec.content && rec.content.includes('[선생님께 한마디]')) return false;
                            if (activeFilter === '전체') return true;
                            if (activeFilter === '사진') return rec.type === 'photo';
                            if (activeFilter === '동영상') return rec.type === 'video';
                            if (activeFilter === '누가기록') return rec.type === 'text';
                            return true;
                          })
                          .map(record => (
                            <div key={record.id} style={{ padding: '20px', border: '1px solid #f0f0f0', borderRadius: '15px', backgroundColor: '#fdfdfd' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '10px', fontWeight: 'bold', backgroundColor: record.type === 'text' ? '#e8f5e9' : record.type === 'photo' ? '#e3f2fd' : '#fff3e0', color: record.type === 'text' ? '#2e7d32' : record.type === 'photo' ? '#1976d2' : '#f57c00' }}>
                                  {record.type === 'text' ? '📋 누가기록' : record.type === 'photo' ? '🖼️ 사진' : '▶️ 동영상'}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                  <span style={{ fontSize: '13px', color: '#999', fontWeight: 'bold' }}>
                                    📅 {record.date} {record.time || (record.timestamp ? new Date(record.timestamp.seconds * 1000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '')}
                                  </span>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => openEditModal(record)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px', padding: '2px 5px' }}>수정</button>
                                    <button onClick={() => handleDeleteRecord(record.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', padding: '2px 5px' }}>삭제</button>
                                  </div>
                                </div>
                              </div>
                              {record.fileUrl && record.type === 'photo' && (
                                <div style={{ marginTop: '10px', marginBottom: '15px' }}>
                                  <img src={record.fileUrl} alt="첨부 사진" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '12px', objectFit: 'contain', border: '1px solid #e0e0e0' }} />
                                </div>
                              )}
                              {record.fileUrl && record.type === 'video' && (
                                <div style={{ marginTop: '10px', marginBottom: '15px' }}>
                                  <video src={record.fileUrl} controls style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '12px', backgroundColor: '#000' }} />
                                </div>
                              )}
                              <p style={{ fontSize: '15px', color: '#444', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{record.content}</p>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="empty-list" style={{ height: '200px' }}>
                        <div className="empty-icon">📝</div>
                        <p className="empty-text">등록된 행동 기록이 없습니다.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
                    <div style={{ fontSize: '40px', marginBottom: '15px', opacity: 0.5 }}>👥</div>
                    <p style={{ fontSize: '15px', textAlign: 'center', lineHeight: '1.6' }}>여러 명의 학생이 선택되어 있습니다.<br/>상단의 버튼을 눌러 일괄 기록을 추가할 수 있습니다.</p>
                    <p style={{ fontSize: '13px', marginTop: '10px', color: '#bbb' }}>개별 이전 기록을 보려면 1명만 선택해주세요.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <AddRecordModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} students={selectedStudents} type={modalType} onSave={handleSaveBatchRecords} selectedGroup={selectedGroup} currentUser={currentUser} />
      <EditRecordModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} record={editingRecord} onUpdate={handleUpdateRecord} />
    </div>
  );
}

export default AccumulatedRecordPage;
