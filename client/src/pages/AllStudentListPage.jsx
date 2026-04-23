import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import * as XLSX from 'xlsx';
import { useModal } from '../components/common/GlobalModal';
import StudentTable from '../components/students/StudentTable';
import StudentListHeader from '../components/students/StudentListHeader';
import StudentModal from '../components/students/StudentModal';
import ClubManagementModal from '../components/students/ClubManagementModal';
import './StudentList.css';

function AllStudentListPage() {
  const { showAlert, showConfirm } = useModal();
  const [students, setStudents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClubModalOpen, setIsClubModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const handleExcelExport = () => {
    if (students.length === 0) {
      showAlert("출력할 학생 데이터가 없습니다.", "알림", "error");
      return;
    }

    const workbook = XLSX.utils.book_new();
    
    // 학급별로 그룹화 (학년-반 키 생성)
    const grouped = {};
    students.forEach(s => {
      const key = `${s.grade}-${s.class_number}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });

    // 각 학급별 시트 생성
    Object.keys(grouped).sort((a, b) => {
      const [gA, cA] = a.split('-').map(Number);
      const [gB, cB] = b.split('-').map(Number);
      if (gA !== gB) return gA - gB;
      return cA - cB;
    }).forEach(key => {
      const classStudents = grouped[key].sort((a, b) => a.student_number - b.student_number);
      const data = classStudents.map((s, idx) => ({
        '순번': idx + 1,
        '학년': s.grade,
        '반': s.class_number,
        '번호': s.student_number,
        '이름': s.name,
        '성별': s.gender,
        '동아리': s.club || ''
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, `${key}반`);
    });

    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    XLSX.writeFile(workbook, `전체학생명단_${today}.xlsx`);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchStudents(user.uid);
        fetchClubs(user.uid);
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchStudents = async (uid) => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users', uid, 'students'));
      const studentList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(studentList.sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade;
        if (a.class_number !== b.class_number) return a.class_number - b.class_number;
        return a.student_number - b.student_number;
      }));
    } catch (error) {
      console.error("Error fetching students: ", error);
    }
  };

  const fetchClubs = async (uid) => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users', uid, 'clubs'));
      const clubList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClubs(clubList);
    } catch (error) {
      console.error("Error fetching clubs: ", error);
    }
  };

  const handleOpenModal = (student = null) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
  };

  const handleSaveStudent = async (studentData) => {
    if (!currentUser) return;
    try {
      if (selectedStudent) {
        await updateDoc(doc(db, 'users', currentUser.uid, 'students', selectedStudent.id), {
          ...studentData,
          updated_at: new Date().toISOString()
        });
        showAlert("학생 정보가 수정되었습니다.", "수정 완료");
      } else {
        await addDoc(collection(db, 'users', currentUser.uid, 'students'), {
          ...studentData,
          is_hidden: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        showAlert("학생이 추가되었습니다.", "추가 완료");
      }
      handleCloseModal();
      fetchStudents(currentUser.uid);
    } catch (error) {
      console.error("Error saving student:", error);
      showAlert("저장 중 오류가 발생했습니다.", "오류", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!currentUser) return;
    showConfirm("정말 이 학생을 삭제하시겠습니까?", async () => {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'students', id));
        fetchStudents(currentUser.uid);
        showAlert("학생 정보가 삭제되었습니다.", "삭제 완료");
      } catch (error) {
        console.error("Error deleting student:", error);
        showAlert("삭제 중 오류가 발생했습니다.", "오류", "error");
      }
    }, "학생 삭제 확인");
  };

  const handleToggleHide = async (student) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'students', student.id), {
        is_hidden: !student.is_hidden
      });
      fetchStudents(currentUser.uid);
    } catch (error) {
      console.error("Error toggling hide:", error);
    }
  };

  const handleAddClub = async (clubName) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'users', currentUser.uid, 'clubs'), {
        name: clubName,
        created_at: new Date().toISOString()
      });
      fetchClubs(currentUser.uid);
      showAlert("동아리가 추가되었습니다.", "추가 완료");
    } catch (error) {
      console.error("Error adding club:", error);
      showAlert("동아리 추가 중 오류가 발생했습니다.", "오류", "error");
    }
  };

  const handleDeleteClub = async (id) => {
    if (!currentUser) return;
    showConfirm("동아리를 삭제하시겠습니까?", async () => {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'clubs', id));
        fetchClubs(currentUser.uid);
        showAlert("동아리가 삭제되었습니다.", "삭제 완료");
      } catch (error) {
        console.error("Error deleting club:", error);
        showAlert("삭제 중 오류가 발생했습니다.", "오류", "error");
      }
    }, "동아리 삭제 확인");
  };

  return (
    <div className="student-dashboard">
      <StudentListHeader 
        title="전체 학생 명단 관리"
        onOpenModal={() => handleOpenModal(null)}
        onOpenClubModal={() => setIsClubModalOpen(true)}
        clubs={clubs}
        onRefresh={() => fetchStudents(currentUser.uid)}
        onExcelExport={handleExcelExport}
      />

      <StudentTable 
        students={students} 
        onEdit={handleOpenModal}
        onToggleHide={handleToggleHide}
        onDelete={handleDelete}
      />

      <StudentModal 
        isOpen={isModalOpen}
        student={selectedStudent}
        onClose={handleCloseModal}
        onSave={handleSaveStudent}
        clubs={clubs}
      />

      <ClubManagementModal
        isOpen={isClubModalOpen}
        clubs={clubs}
        onAdd={handleAddClub}
        onDelete={handleDeleteClub}
        onClose={() => setIsClubModalOpen(false)}
      />
    </div>
  );
}

export default AllStudentListPage;
