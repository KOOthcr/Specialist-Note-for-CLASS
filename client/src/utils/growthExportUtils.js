import * as XLSX from 'xlsx';

/**
 * exportGrowthDailyToExcel: 일일 성장 기록을 엑셀로 내보냄
 */
export const exportGrowthDailyToExcel = (today, selectedGroup, selectedCategory, students, recordData) => {
  if (!selectedGroup || !selectedCategory) return;
  const filtered = students.filter(s => selectedGroup.type === 'class' ? (s.grade === selectedGroup.grade && s.class_number === selectedGroup.class_number) : (s.club === selectedGroup.name)).sort((a, b) => a.student_number - b.student_number);
  const colCount = selectedCategory.columnCount || 1;
  const data = filtered.map(student => {
    const record = recordData[student.id] || { value: '', note: '', values: [] };
    const row = { '번호': student.student_number, '이름': student.name, '성별': student.gender, '관찰 메모': record.note };
    for (let i = 0; i < colCount; i++) { const key = `${selectedCategory.unit}${i + 1}`; row[key] = record.values?.[i] ?? (i === 0 ? record.value : ''); }
    return row;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, '일일기록');
  XLSX.writeFile(workbook, `${today}_${selectedGroup.name || selectedGroup.id}_${selectedCategory.title}_성장기록.xlsx`);
};

/**
 * exportGrowthMonthlyToExcel: 월별 성장 기록을 엑셀로 내보냄
 */
export const exportGrowthMonthlyToExcel = (selectedMonth, selectedGroup, selectedCategory, students, monthlyRecords) => {
  if (!selectedGroup || !selectedCategory) return;
  const days = new Date(selectedMonth.split('-')[0], selectedMonth.split('-')[1], 0).getDate();
  const filtered = students.filter(s => selectedGroup.type === 'class' ? (s.grade === selectedGroup.grade && s.class_number === selectedGroup.class_number) : (s.club === selectedGroup.name)).sort((a, b) => a.student_number - b.student_number);
  const data = filtered.map(student => {
    const row = { '번호/반': selectedGroup.type === 'class' ? student.student_number : `${student.grade}-${student.class_number}`, '성명': student.name };
    for (let d = 1; d <= days; d++) {
      const date = `${selectedMonth}-${String(d).padStart(2, '0')}`;
      const rec = monthlyRecords[date]?.[student.id];
      let displayValue = '';
      if (rec) {
        if (rec.values && rec.values.length > 0) displayValue = rec.values.filter(v => v !== '' && v !== undefined).join(' / ');
        else if (rec.value) displayValue = rec.value;
      }
      row[`${d}일`] = displayValue;
    }
    return row;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, '월별기록');
  XLSX.writeFile(workbook, `${selectedMonth}_${selectedGroup.name || selectedGroup.id}_${selectedCategory.title}_월별성장기록.xlsx`);
};
