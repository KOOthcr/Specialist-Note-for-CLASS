import * as XLSX from 'xlsx';

/**
 * exportStudentRecordsToExcel: 특정 학생의 모든 행동 기록을 엑셀로 내보냄
 */
export const exportStudentRecordsToExcel = (student, records, showAlert) => {
  if (!student || records.length === 0) {
    showAlert('다운로드할 데이터가 없습니다.', '알림');
    return;
  }

  const data = records
    .filter(r => !(r.content && r.content.includes('[선생님께 한마디]')))
    .map(r => ({ 
      '날짜': r.date, 
      '구분': r.type === 'text' ? '누가기록' : r.type === 'photo' ? '사진' : '동영상', 
      '내용': r.content, 
      '파일명': r.fileName || '-',
      '파일 링크': r.fileUrl || '-' 
    }));

  if (data.length === 0) {
    showAlert('다운로드할 기록이 없습니다.', '알림');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '기록');
  XLSX.writeFile(workbook, `${student.name}_기록_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * exportGroupRecordsToExcel: 반/동아리 전체 학생의 행동 기록을 엑셀로 내보냄
 */
export const exportGroupRecordsToExcel = (group, students, allRecords, showAlert) => {
  if (!group || group.id === 'all') {
    showAlert('먼저 반 또는 동아리를 선택해주세요.', '알림');
    return;
  }

  const studentIds = students.map(s => s.id);
  const filtered = allRecords
    .filter(r => studentIds.includes(r.studentId) && !(r.content && r.content.includes('[선생님께 한마디]')))
    .sort((a, b) => {
      const sA = students.find(s => s.id === a.studentId);
      const sB = students.find(s => s.id === b.studentId);
      if (sA?.student_number !== sB?.student_number) return (sA?.student_number || 0) - (sB?.student_number || 0);
      return new Date(b.date) - new Date(a.date);
    });

  if (filtered.length === 0) {
    showAlert('선택한 그룹에 다운로드할 기록이 없습니다.', '알림');
    return;
  }

  const data = filtered.map(r => {
    const s = students.find(st => st.id === r.studentId);
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
  XLSX.writeFile(workbook, `${group.name}_전체기록_${new Date().toISOString().split('T')[0]}.xlsx`);
};
