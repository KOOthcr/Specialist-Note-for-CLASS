import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, doc, writeBatch, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import StudentTable from '../components/students/StudentTable';
import StudentModal from '../components/students/StudentModal';
import ClassManagementModal from '../components/students/ClassManagementModal';
import ClubManagementModal from '../components/students/ClubManagementModal';
import { useModal } from '../components/common/GlobalModal';
import ClassEditModal from '../components/students/ClassEditModal';
import ClubEditModal from '../components/students/ClubEditModal';
import * as XLSX from 'xlsx';
import './StudentList.css';

function ClassStudentListPage() {
  const { showAlert, showConfirm } = useModal();
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isClubModalOpen, setIsClubModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const handleExcelExport = () => {
    if (filteredStudents.length === 0) {
      showAlert("출력할 학생 데이터가 없습니다.", "알림", "error");
      return;
    }

    const data = filteredStudents.map((s, idx) => ({
      '순번': idx + 1,
      '학년': s.grade,
      '반': s.class_number,
      '번호': s.student_number,
      '이름': s.name,
      '성별': s.gender,
      '동아리': s.club || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    const sheetName = selectedGroup.type === 'class' ? `${selectedGroup.grade}-${selectedGroup.class_number}반` : selectedGroup.name;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${sheetName}_명단.xlsx`);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchAllData(user.uid);
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchAllData = async (uid) => {
    try {
      const classesRef = collection(db, 'users', uid, 'classes');
      let classSnapshot = await getDocs(classesRef);
      let classList = classSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (classList.length === 0) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const profileData = userDoc.data();
          if (profileData.assigned_classes && profileData.assigned_classes.length > 0) {
            const batch = writeBatch(db);
            profileData.assigned_classes.forEach(ac => {
              const newClassRef = doc(collection(db, 'users', uid, 'classes'));
              batch.set(newClassRef, { ...ac, created_at: new Date().toISOString() });
            });
            await batch.commit();
            classSnapshot = await getDocs(classesRef);
            classList = classSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          }
        }
      }
      setClasses(classList);

      const studentsRef = collection(db, 'users', uid, 'students');
      const studentSnapshot = await getDocs(studentsRef);
      const studentList = studentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(studentList);

      const clubsRef = collection(db, 'users', uid, 'clubs');
      const clubSnapshot = await getDocs(clubsRef);
      const clubList = clubSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClubs(clubList);
    } catch (error) {
      console.error("Error fetching data: ", error);
    }
  };

  // --- 학급 관리 ---
  const handleAddClass = async (grade, class_number, leader = '') => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'users', currentUser.uid, 'classes'), { 
        grade, class_number, leader, created_at: new Date().toISOString() 
      });
      fetchAllData(currentUser.uid);
    } catch (error) {
      console.error("Error adding class: ", error);
    }
  };

  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);

  const handleEditClass = (e, cls) => {
    e.stopPropagation();
    setEditingClass(cls);
    setIsEditClassModalOpen(true);
  };

  const handleSaveEditClass = async (updatedData) => {
    if (!currentUser || !editingClass) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'classes', editingClass.id), updatedData);
      setIsEditClassModalOpen(false);
      fetchAllData(currentUser.uid);
      showAlert("학급 정보가 성공적으로 수정되었습니다.", "수정 완료");
    } catch (error) {
      console.error("Error updating class:", error);
      showAlert("수정 중 오류가 발생했습니다.", "수정 실패", "error");
    }
  };

  const handleDeleteClass = async (e, cls) => {
    if (e) e.stopPropagation();
    if (!currentUser) return;

    showConfirm(`${cls.grade}학년 ${cls.class_number}반 안의 학생에 대한 모든 정보가 사라집니다. 정말 삭제하시겠습니까?`, async () => {
      try {
        const batch = writeBatch(db);
        
        // 1. 해당 학급 레코드 삭제
        batch.delete(doc(db, 'users', currentUser.uid, 'classes', cls.id));
        
        // 2. 해당 학급에 속한 학생들 찾아서 삭제
        const classStudents = students.filter(s => s.grade === cls.grade && s.class_number === cls.class_number);
        classStudents.forEach(s => {
          batch.delete(doc(db, 'users', currentUser.uid, 'students', s.id));
        });
        
        await batch.commit();
        fetchAllData(currentUser.uid);
        showAlert("학급이 성공적으로 삭제되었습니다.", "삭제 완료");
      } catch (error) {
        console.error("Error deleting class and students: ", error);
        showAlert("삭제 중 오류가 발생했습니다.", "삭제 실패", "error");
      }
    }, "학급 삭제 확인");
  };

  const handleAddClub = async (name, leader = '') => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'users', currentUser.uid, 'clubs'), { 
        name, leader, created_at: new Date().toISOString() 
      });
      fetchAllData(currentUser.uid);
    } catch (error) {
      console.error("Error adding club: ", error);
    }
  };

  const [isEditClubModalOpen, setIsEditClubModalOpen] = useState(false);
  const [editingClub, setEditingClub] = useState(null);

  const handleEditClub = (e, club) => {
    e.stopPropagation();
    setEditingClub(club);
    setIsEditClubModalOpen(true);
  };

  const handleSaveEditClub = async (updatedData) => {
    if (!currentUser || !editingClub) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'clubs', editingClub.id), updatedData);
      setIsEditClubModalOpen(false);
      fetchAllData(currentUser.uid);
      showAlert("동아리 정보가 성공적으로 수정되었습니다.", "수정 완료");
    } catch (error) {
      console.error("Error updating club:", error);
      showAlert("수정 중 오류가 발생했습니다.", "수정 실패", "error");
    }
  };

  const handleDeleteClub = async (e, club) => {
    if (e) e.stopPropagation();
    if (!currentUser) return;

    showConfirm(`${club.name}을(를) 삭제하시겠습니까? (학생 정보는 유지되지만 동아리 소속 정보는 초기화됩니다)`, async () => {
      try {
        const batch = writeBatch(db);
        
        // 1. 해당 동아리 레코드 삭제
        batch.delete(doc(db, 'users', currentUser.uid, 'clubs', club.id));
        
        // 2. 해당 동아리에 속한 학생들의 동아리 정보 초기화
        const clubStudents = students.filter(s => s.club === club.name);
        clubStudents.forEach(s => {
          batch.update(doc(db, 'users', currentUser.uid, 'students', s.id), {
            club: ""
          });
        });
        
        await batch.commit();
        fetchAllData(currentUser.uid);
        showAlert("동아리가 성공적으로 삭제되었습니다.", "삭제 완료");
      } catch (error) {
        console.error("Error deleting club: ", error);
        showAlert("삭제 중 오류가 발생했습니다.", "삭제 실패", "error");
      }
    }, "동아리 삭제 확인");
  };

  // --- 학생 관리 ---
  const handleOpenStudentModal = (student = null) => {
    setSelectedStudent(student);
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = async (studentData) => {
    if (!currentUser) return;
    try {
      if (selectedStudent) {
        await updateDoc(doc(db, 'users', currentUser.uid, 'students', selectedStudent.id), studentData);
      } else {
        await addDoc(collection(db, 'users', currentUser.uid, 'students'), {
          ...studentData,
          created_at: new Date().toISOString()
        });
      }
      setIsStudentModalOpen(false);
      fetchAllData(currentUser.uid);
    } catch (error) {
      console.error("Error saving student:", error);
    }
  };

  const handleToggleHide = async (student) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'students', student.id), {
        is_hidden: !student.is_hidden
      });
      fetchAllData(currentUser.uid);
    } catch (error) {
      console.error("Error toggling student hide:", error);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!currentUser) return;
    showConfirm("정말 이 학생을 삭제하시겠습니까?", async () => {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'students', id));
        fetchAllData(currentUser.uid);
      } catch (error) {
        console.error("Error deleting student:", error);
        showAlert("삭제 중 오류가 발생했습니다.", "삭제 실패", "error");
      }
    }, "학생 삭제 확인");
  };

  const filteredStudents = students.filter(s => {
    if (!selectedGroup) return false;
    if (selectedGroup.type === 'class') {
      return s.grade === selectedGroup.grade && s.class_number === selectedGroup.class_number;
    } else if (selectedGroup.type === 'club') {
      return s.club === selectedGroup.name;
    }
    return false;
  }).sort((a, b) => a.student_number - b.student_number);

  const getGroupTitle = () => {
    if (!selectedGroup) return "반별/동아리별 명단 선택";
    if (selectedGroup.type === 'class') return `${selectedGroup.grade}학년 ${selectedGroup.class_number}반 명단`;
    return `${selectedGroup.name} 명단`;
  };

  // 명단 내에서 추가 버튼 클릭 시 그룹 정보 자동 입력
  const getInitialStudentData = () => {
    if (!selectedGroup) return null;
    if (selectedGroup.type === 'class') {
      return { grade: selectedGroup.grade, class_number: selectedGroup.class_number };
    } else {
      return { club: selectedGroup.name };
    }
  };

  return (
    <div className="student-dashboard">
      <div className="dashboard-header-container">
        <div className="dashboard-header-top">
          <h2 className="title">{getGroupTitle()}</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            {!selectedGroup ? (
              <>
                <button className="btn-solid-green" onClick={() => setIsClassModalOpen(true)}>
                  + 반 추가하기
                </button>
                <button className="btn-solid-green" onClick={() => setIsClubModalOpen(true)}>
                  + 동아리 추가하기
                </button>
              </>
            ) : (
              <>
                <button className="btn-solid-green" onClick={() => handleOpenStudentModal(null)}>
                  + 학생 추가
                </button>
                <button className="btn-outline-green" style={{ backgroundColor: '#e8f5e9', fontWeight: 'bold' }} onClick={handleExcelExport}>
                  📥 명단 출력 (엑셀)
                </button>
                <button className="btn-outline-green" onClick={() => setSelectedGroup(null)}>
                  ← 뒤로가기 (목록으로)
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {!selectedGroup ? (
        <div className="card-grid-container">
          <div className="group-section">
            <h3 className="section-title">🏫 학급 선택</h3>
            <div className="card-grid">
              {classes.sort((a,b) => {
                if(a.grade !== b.grade) return a.grade - b.grade;
                return a.class_number - b.class_number;
              }).map((cls) => (
                <div 
                  key={cls.id} 
                  className="group-card class-card"
                  onClick={() => setSelectedGroup({ type: 'class', grade: cls.grade, class_number: cls.class_number })}
                >
                  <div className="card-actions">
                    <button className="card-btn edit" onClick={(e) => handleEditClass(e, cls)}>✏️</button>
                    <button className="card-btn delete" onClick={(e) => handleDeleteClass(e, cls)}>🗑️</button>
                  </div>
                  <div className="card-icon">🏫</div>
                  <div className="card-info">
                    <span className="card-name">{cls.grade}학년 {cls.class_number}반</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span className="card-count" style={{ fontSize: '13px', color: '#64748b' }}>
                        👤 반장: {cls.leader || '미지정'}
                      </span>
                      <span className="card-count">
                        {students.filter(s => s.grade === cls.grade && s.class_number === cls.class_number).length}명
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {classes.length === 0 && <p className="empty-msg">등록된 학급이 없습니다. 학급을 추가해 주세요.</p>}
            </div>
          </div>

          <div className="group-section" style={{ marginTop: '40px' }}>
            <h3 className="section-title">
              <img src="/club_icon.png" alt="동아리" style={{ width: '28px', height: '28px', borderRadius: '6px', marginRight: '8px' }} />
              동아리 선택
            </h3>
            <div className="card-grid">
              {clubs.map((club) => (
                <div 
                  key={club.id} 
                  className="group-card club-card"
                  onClick={() => setSelectedGroup({ type: 'club', name: club.name })}
                >
                  <div className="card-actions">
                    <button className="card-btn edit" onClick={(e) => handleEditClub(e, club)}>✏️</button>
                    <button className="card-btn delete" onClick={(e) => handleDeleteClub(e, club)}>🗑️</button>
                  </div>
                  <div className="card-icon">
                    <img src="/club_icon.png" alt="동아리" style={{ width: '40px', height: '40px' }} />
                  </div>
                  <div className="card-info">
                    <span className="card-name">{club.name}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span className="card-count" style={{ fontSize: '13px', color: '#64748b' }}>
                        👤 부장: {club.leader || '미지정'}
                      </span>
                      <span className="card-count">{students.filter(s => s.club === club.name).length}명</span>
                    </div>
                  </div>
                </div>
              ))}
              {clubs.length === 0 && <p className="empty-msg">등록된 동아리가 없습니다.</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="list-view">
          <StudentTable 
            students={filteredStudents} 
            readonly={false} 
            onEdit={handleOpenStudentModal}
            onToggleHide={handleToggleHide}
            onDelete={handleDeleteStudent}
            showSerialNumber={selectedGroup.type === 'club'}
          />
        </div>
      )}

      <ClassManagementModal
        isOpen={isClassModalOpen}
        classes={classes}
        onAdd={handleAddClass}
        onDelete={(cls) => handleDeleteClass(null, cls)}
        onClose={() => setIsClassModalOpen(false)}
      />

      <ClubManagementModal
        isOpen={isClubModalOpen}
        clubs={clubs}
        onAdd={handleAddClub}
        onDelete={(club) => handleDeleteClub(null, club)}
        onClose={() => setIsClubModalOpen(false)}
      />

      <StudentModal 
        isOpen={isStudentModalOpen}
        student={selectedStudent}
        onClose={() => setIsStudentModalOpen(false)}
        onSave={handleSaveStudent}
        clubs={clubs}
        initialData={getInitialStudentData()}
      />

      <ClassEditModal
        isOpen={isEditClassModalOpen}
        cls={editingClass}
        onSave={handleSaveEditClass}
        onClose={() => setIsEditClassModalOpen(false)}
      />
      <ClubEditModal
        isOpen={isEditClubModalOpen}
        club={editingClub}
        onSave={handleSaveEditClub}
        onClose={() => setIsEditClubModalOpen(false)}
      />
    </div>
  );
}

export default ClassStudentListPage;
