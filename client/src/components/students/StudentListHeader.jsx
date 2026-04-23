import React, { useRef } from 'react';
import { utils, write, read } from 'xlsx';
import { db } from '../../firebase/config';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';
import { useModal } from '../common/GlobalModal';

function StudentListHeader({ title, currentUser, fetchStudents, onOpenModal, onOpenClubModal, clubs = [], onExcelExport }) {
  const { showAlert, showConfirm } = useModal();
  const studentFileInputRef = useRef(null);
  const clubFileInputRef = useRef(null);

  // 동아리 엑셀 양식 다운로드 (현재 등록된 동아리 목록 포함)
  const handleDownloadClubTemplate = () => {
    if (!clubs || clubs.length === 0) {
      showAlert("먼저 '동아리 추가(반드시 선입력)' 버튼을 통해 동아리를 등록해 주세요.", "동아리 미등록", "error");
      return;
    }

    const clubNames = clubs.map(c => c.name).join(',');
    const templateData = [
      ['학년', '반', '번호', '이름', '동아리명'],
      [5, 1, 1, '김철수', clubs[0].name],
      ['', '', '', '', '(동아리 목록 시트를 참고하여 입력하세요)']
    ];

    const ws = utils.aoa_to_sheet(templateData);
    
    // 데이터 유효성 검사 (드롭다운) 설정
    ws['!dataValidation'] = [
      {
        range: 'E2:E100',
        type: 'list',
        allowBlank: true,
        formula1: `"${clubNames}"` 
      }
    ];

    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "동아리등록양식");

    const listWs = utils.aoa_to_sheet([['등록된 동아리 이름'], ...clubs.map(c => [c.name])]);
    utils.book_append_sheet(wb, listWs, "동아리목록_참고");

    const excelBuffer = write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    const url = window.URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = '동아리학생_등록_양식.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // 엑셀 파일 업로드 처리 (전체 학생용)
  const handleStudentExcelUpload = async (e) => {
    if (!currentUser) {
      showAlert("로그인이 필요합니다.", "권한 오류", "error");
      return;
    }
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = read(data, { type: 'array' });
        let allStudents = [];

        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = utils.sheet_to_json(worksheet, { header: 1 });
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            const grade = parseInt(row[0]);
            const class_number = parseInt(row[1]);
            const student_number = parseInt(row[2]);
            const name = row[3];
            const gender = row[4];
            if (grade && class_number && student_number && name && gender) {
              allStudents.push({
                grade, class_number, student_number, name, gender, club: '', is_hidden: false, created_at: new Date().toISOString()
              });
            }
          }
        });

        if (allStudents.length === 0) {
          showAlert("유효한 학생 데이터가 없습니다.", "데이터 오류", "error");
          return;
        }

        showConfirm(`총 ${allStudents.length}명의 학생 데이터를 일괄 등록하시겠습니까?`, async () => {
          try {
            const batch = writeBatch(db);
            const studentsRef = collection(db, 'users', currentUser.uid, 'students');
            
            allStudents.forEach(student => {
              const newDocRef = doc(studentsRef);
              batch.set(newDocRef, student);
            });
            
            await batch.commit();
            showAlert("일괄 등록이 성공적으로 완료되었습니다.", "등록 완료");
            if (fetchStudents) fetchStudents(currentUser.uid);
          } catch (error) {
            console.error("Bulk upload error: ", error);
            showAlert("일괄 등록 중 오류가 발생했습니다.", "오류", "error");
          }
        }, "일괄 등록 확인");
      } catch (error) {
        console.error("Excel upload error:", error);
        showAlert("파일 처리 중 오류가 발생했습니다.", "오류", "error");
      }
      if (studentFileInputRef.current) studentFileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  // 엑셀 파일 업로드 처리 (동아리용)
  const handleClubExcelUpload = async (e) => {
    if (!currentUser) {
      alert("로그인이 필요합니다.");
      return;
    }
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = read(data, { type: 'array' });
        let clubData = [];

        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = utils.sheet_to_json(worksheet, { header: 1 });
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            const grade = parseInt(row[0]);
            const class_number = parseInt(row[1]);
            const student_number = parseInt(row[2]);
            const name = row[3];
            const clubName = row[4] || '';
            if (grade && class_number && student_number && name) {
              clubData.push({ grade, class_number, student_number, name, clubName });
            }
          }
        });

        if (clubData.length === 0) {
          alert("유효한 데이터가 없습니다.");
          return;
        }

        if (window.confirm(`${clubData.length}명의 동아리 정보를 업데이트하시겠습니까?`)) {
          const studentsRef = collection(db, 'users', currentUser.uid, 'students');
          const snapshot = await getDocs(studentsRef);
          const existingStudents = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

          const batch = writeBatch(db);
          let updatedCount = 0;

          clubData.forEach(item => {
            const target = existingStudents.find(s => 
              s.grade === item.grade && 
              s.class_number === item.class_number && 
              s.student_number === item.student_number && 
              s.name === item.name
            );
            if (target) {
              const docRef = doc(db, 'users', currentUser.uid, 'students', target.id);
              batch.update(docRef, { club: item.clubName, updated_at: new Date().toISOString() });
              updatedCount++;
            }
          });

          if (updatedCount > 0) {
            await batch.commit();
            alert(`${updatedCount}명의 정보가 업데이트되었습니다.`);
            if (fetchStudents) fetchStudents(currentUser.uid);
          } else {
            alert("일치하는 학생이 없습니다.");
          }
        }
      } catch (error) {
        console.error("Club upload error:", error);
        alert("오류가 발생했습니다.");
      }
      if (clubFileInputRef.current) clubFileInputRef.current.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="dashboard-header-container">
      <div className="dashboard-header-top">
        <h2 className="title">{title}</h2>
      </div>

      <div className="action-groups">
        <div className="action-group">
          <h4 className="group-title">👤 학생 관리</h4>
          <div className="group-buttons">
            <a href="/student_template.xlsx" download="학생_등록_양식.xlsx" className="btn-outline-green">
              학생 등록 엑셀 양식
            </a>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              style={{ display: 'none' }} 
              ref={studentFileInputRef}
              onChange={handleStudentExcelUpload}
            />
            <button className="btn-outline-green" onClick={() => studentFileInputRef.current?.click()}>
              학생 등록 엑셀 일괄등록
            </button>
            <button className="btn-solid-green" onClick={() => onOpenModal()}>+ 학생추가 (수동)</button>
            <button className="btn-outline-green" style={{ marginLeft: 'auto', backgroundColor: '#e8f5e9', fontWeight: 'bold' }} onClick={onExcelExport}>
              📥 명단 출력 (엑셀)
            </button>
          </div>
        </div>

        <div className="action-group">
          <h4 className="group-title">
            <img src="/club_icon.png" alt="동아리" style={{ width: '24px', height: '24px', borderRadius: '4px', marginRight: '8px' }} />
            동아리 관리
          </h4>
          <div className="group-buttons">
            <button className="btn-solid-green" onClick={onOpenClubModal}>
              동아리 추가(반드시 선입력)
            </button>
            <button className="btn-outline-green" onClick={handleDownloadClubTemplate}>
              동아리 학생 등록 엑셀 양식
            </button>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              style={{ display: 'none' }} 
              ref={clubFileInputRef}
              onChange={handleClubExcelUpload}
            />
            <button className="btn-outline-green" onClick={() => clubFileInputRef.current?.click()}>
              동아리 학생 등록 엑셀 일괄등록
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentListHeader;
