import React, { useState } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, deleteDoc, doc, writeBatch, updateDoc } from 'firebase/firestore';
import StudentTable from '../components/students/StudentTable';
import { useModal } from '../components/common/GlobalModal';
import ClassStudentListPageHeader from '../components/students/ClassStudentListPageHeader';
import ClassStudentListGrid from '../components/students/ClassStudentListGrid';
import ClassStudentListModals from '../components/students/ClassStudentListModals';
import { useClassStudents } from '../hooks/useClassStudents';
import * as XLSX from 'xlsx';
import './StudentList.css';

/**
 * ClassStudentListPage: 학급별/동아리별 학생 명단을 관리하는 페이지
 */
function ClassStudentListPage() {
  const { showAlert, showConfirm } = useModal();
  const { students, classes, clubs, currentUser, fetchAllData } = useClassStudents();

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isClubModalOpen, setIsClubModalOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [isEditClubModalOpen, setIsEditClubModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [editingClub, setEditingClub] = useState(null);

  const filteredStudents = students.filter(s => {
    if (!selectedGroup) return false;
    if (selectedGroup.type === 'class') return s.grade === selectedGroup.grade && s.class_number === selectedGroup.class_number;
    return s.club === selectedGroup.name;
  }).sort((a, b) => a.student_number - b.student_number);

  const handleExcelExport = () => {
    if (filteredStudents.length === 0) { showAlert("출력할 학생 데이터가 없습니다.", "알림", "error"); return; }
    const data = filteredStudents.map((s, idx) => ({ '순번': idx + 1, '학년': s.grade, '반': s.class_number, '번호': s.student_number, '이름': s.name, '성별': s.gender, '동아리': s.club || '' }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    const sheetName = selectedGroup.type === 'class' ? `${selectedGroup.grade}-${selectedGroup.class_number}반` : selectedGroup.name;
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${sheetName}_명단.xlsx`);
  };

  const handleAddClass = async (grade, class_number, leader = '') => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'users', currentUser.uid, 'classes'), { grade, class_number, leader, created_at: new Date().toISOString() });
      fetchAllData(currentUser.uid);
    } catch (error) { console.error(error); }
  };

  const handleSaveEditClass = async (updatedData) => {
    if (!currentUser || !editingClass) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'classes', editingClass.id), updatedData);
      setIsEditClassModalOpen(false); fetchAllData(currentUser.uid);
      showAlert("학급 정보가 성공적으로 수정되었습니다.", "수정 완료");
    } catch (error) { showAlert("수정 중 오류가 발생했습니다.", "오류", "error"); }
  };

  const handleDeleteClass = async (e, cls) => {
    if (e) e.stopPropagation();
    if (!currentUser) return;
    showConfirm(`${cls.grade}학년 ${cls.class_number}반 안의 학생 정보가 모두 사라집니다. 정말 삭제하시겠습니까?`, async () => {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'users', currentUser.uid, 'classes', cls.id));
        students.filter(s => s.grade === cls.grade && s.class_number === cls.class_number).forEach(s => batch.delete(doc(db, 'users', currentUser.uid, 'students', s.id)));
        await batch.commit(); fetchAllData(currentUser.uid);
        showAlert("학급이 성공적으로 삭제되었습니다.", "삭제 완료");
      } catch (error) { showAlert("삭제 중 오류가 발생했습니다.", "오류", "error"); }
    }, "학급 삭제 확인");
  };

  const handleAddClub = async (name, leader = '') => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'users', currentUser.uid, 'clubs'), { name, leader, created_at: new Date().toISOString() });
      fetchAllData(currentUser.uid);
    } catch (error) { console.error(error); }
  };

  const handleSaveEditClub = async (updatedData) => {
    if (!currentUser || !editingClub) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'clubs', editingClub.id), updatedData);
      setIsEditClubModalOpen(false); fetchAllData(currentUser.uid);
      showAlert("동아리 정보가 성공적으로 수정되었습니다.", "수정 완료");
    } catch (error) { showAlert("수정 중 오류가 발생했습니다.", "오류", "error"); }
  };

  const handleDeleteClub = async (e, club) => {
    if (e) e.stopPropagation();
    if (!currentUser) return;
    showConfirm(`${club.name}을(를) 삭제하시겠습니까?`, async () => {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'users', currentUser.uid, 'clubs', club.id));
        students.filter(s => s.club === club.name).forEach(s => batch.update(doc(db, 'users', currentUser.uid, 'students', s.id), { club: "" }));
        await batch.commit(); fetchAllData(currentUser.uid);
        showAlert("동아리가 성공적으로 삭제되었습니다.", "삭제 완료");
      } catch (error) { showAlert("삭제 중 오류가 발생했습니다.", "오류", "error"); }
    }, "동아리 삭제 확인");
  };

  const handleSaveStudent = async (studentData) => {
    if (!currentUser) return;
    try {
      if (selectedStudent) await updateDoc(doc(db, 'users', currentUser.uid, 'students', selectedStudent.id), studentData);
      else await addDoc(collection(db, 'users', currentUser.uid, 'students'), { ...studentData, created_at: new Date().toISOString() });
      setIsStudentModalOpen(false); fetchAllData(currentUser.uid);
    } catch (error) { console.error(error); }
  };

  return (
    <div className="student-dashboard">
      <ClassStudentListPageHeader title={!selectedGroup ? "반별/동아리별 명단 선택" : selectedGroup.type === 'class' ? `${selectedGroup.grade}학년 ${selectedGroup.class_number}반 명단` : `${selectedGroup.name} 명단`} selectedGroup={selectedGroup} setIsClassModalOpen={setIsClassModalOpen} setIsClubModalOpen={setIsClubModalOpen} handleOpenStudentModal={() => { setSelectedStudent(null); setIsStudentModalOpen(true); }} handleExcelExport={handleExcelExport} setSelectedGroup={setSelectedGroup} />
      {!selectedGroup ? <ClassStudentListGrid classes={classes} clubs={clubs} students={students} onSelectGroup={setSelectedGroup} onEditClass={(e, cls) => { e.stopPropagation(); setEditingClass(cls); setIsEditClassModalOpen(true); }} onDeleteClass={handleDeleteClass} onEditClub={(e, club) => { e.stopPropagation(); setEditingClub(club); setIsEditClubModalOpen(true); }} onDeleteClub={handleDeleteClub} /> : <div className="list-view"><StudentTable students={filteredStudents} readonly={false} onEdit={(student) => { setSelectedStudent(student); setIsStudentModalOpen(true); }} onToggleHide={async (student) => { if (!currentUser) return; await updateDoc(doc(db, 'users', currentUser.uid, 'students', student.id), { is_hidden: !student.is_hidden }); fetchAllData(currentUser.uid); }} onDelete={async (id) => { if (!currentUser) return; showConfirm("정말 이 학생을 삭제하시겠습니까?", async () => { await deleteDoc(doc(db, 'users', currentUser.uid, 'students', id)); fetchAllData(currentUser.uid); }, "학생 삭제 확인"); }} showSerialNumber={selectedGroup.type === 'club'} /></div>}
      <ClassStudentListModals isClassModalOpen={isClassModalOpen} setIsClassModalOpen={setIsClassModalOpen} isClubModalOpen={isClubModalOpen} setIsClubModalOpen={setIsClubModalOpen} isStudentModalOpen={isStudentModalOpen} setIsStudentModalOpen={setIsStudentModalOpen} isEditClassModalOpen={isEditClassModalOpen} setIsEditClassModalOpen={setIsEditClassModalOpen} isEditClubModalOpen={isEditClubModalOpen} setIsEditClubModalOpen={setIsEditClubModalOpen} classes={classes} clubs={clubs} selectedStudent={selectedStudent} editingClass={editingClass} editingClub={editingClub} handleAddClass={handleAddClass} handleDeleteClass={handleDeleteClass} handleAddClub={handleAddClub} handleDeleteClub={handleDeleteClub} handleSaveStudent={handleSaveStudent} handleSaveEditClass={handleSaveEditClass} handleSaveEditClub={handleSaveEditClub} getInitialStudentData={() => !selectedGroup ? null : selectedGroup.type === 'class' ? { grade: selectedGroup.grade, class_number: selectedGroup.class_number } : { club: selectedGroup.name }} />
    </div>
  );
}

export default ClassStudentListPage;
