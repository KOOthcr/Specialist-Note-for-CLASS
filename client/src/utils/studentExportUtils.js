import * as XLSX from 'xlsx';

/**
 * exportAllStudentsToExcel: 전체 학생 명단을 학급별 시트로 구성하여 엑셀로 내보냄
 */
export const exportAllStudentsToExcel = (students, showAlert) => {
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
