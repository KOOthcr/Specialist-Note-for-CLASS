const fs = require('fs');
const XLSX = require('xlsx');

// 1. 전체 학생 등록 양식 (동아리 제외)
const studentTemplateData = [
  ['학년', '반', '번호', '이름', '성별'],
  [5, 1, 1, '김철수', '남'],
  [5, 1, 2, '이영희', '여']
];

const ws1 = XLSX.utils.aoa_to_sheet(studentTemplateData);
const wb1 = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb1, ws1, '학생명단양식');
XLSX.writeFile(wb1, 'public/student_template.xlsx');

// 2. 동아리 학생 등록 양식 (학년, 반, 번호, 이름 + 동아리명)
const clubTemplateData = [
  ['학년', '반', '번호', '이름', '동아리명'],
  [5, 1, 1, '김철수', '축구부'],
  [5, 1, 2, '이영희', '방송부']
];

const ws2 = XLSX.utils.aoa_to_sheet(clubTemplateData);
const wb2 = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb2, ws2, '동아리명단양식');
XLSX.writeFile(wb2, 'public/club_template.xlsx');

console.log('Templates created: public/student_template.xlsx, public/club_template.xlsx');
