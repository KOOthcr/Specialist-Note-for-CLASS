import React from 'react';
import ClassManagementModal from './ClassManagementModal';
import ClubManagementModal from './ClubManagementModal';
import StudentModal from './StudentModal';
import ClassEditModal from './ClassEditModal';
import ClubEditModal from './ClubEditModal';

/**
 * ClassStudentListModals: 학급별 학생 명단 페이지에서 사용하는 모든 모달들의 모음
 */
function ClassStudentListModals({
  isClassModalOpen, setIsClassModalOpen,
  isClubModalOpen, setIsClubModalOpen,
  isStudentModalOpen, setIsStudentModalOpen,
  isEditClassModalOpen, setIsEditClassModalOpen,
  isEditClubModalOpen, setIsEditClubModalOpen,
  classes, clubs,
  selectedStudent,
  editingClass, editingClub,
  handleAddClass, handleDeleteClass,
  handleAddClub, handleDeleteClub,
  handleSaveStudent,
  handleSaveEditClass, handleSaveEditClub,
  getInitialStudentData
}) {
  return (
    <>
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
    </>
  );
}

export default ClassStudentListModals;
