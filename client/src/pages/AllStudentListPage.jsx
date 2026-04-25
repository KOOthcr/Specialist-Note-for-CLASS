import React, { useState } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useModal } from '../components/common/GlobalModal';
import StudentTable from '../components/students/StudentTable';
import StudentListHeader from '../components/students/StudentListHeader';
import StudentModal from '../components/students/StudentModal';
import ClubManagementModal from '../components/students/ClubManagementModal';
import { useAllStudents } from '../hooks/useAllStudents';
import { exportAllStudentsToExcel } from '../utils/studentExportUtils';
import './StudentList.css';

/**
 * AllStudentListPage: 전체 학생 명단을 관리하고 동아리를 관리하는 페이지
 */
function AllStudentListPage() {
  const { showAlert, showConfirm } = useModal();
  const { students, clubs, currentUser, fetchStudents, fetchClubs } = useAllStudents();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClubModalOpen, setIsClubModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

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
        onRefresh={() => fetchStudents(currentUser?.uid)}
        onExcelExport={() => exportAllStudentsToExcel(students, showAlert)}
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
