import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, query, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useModal } from '../components/common/GlobalModal';
import * as XLSX from 'xlsx';
import './StudentList.css'; // 기존 테이블 스타일 재사용

function StudentQuestionPage() {
  const { showConfirm, showAlert } = useModal();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        const unsubscribeQ = fetchQuestions(user.uid);
        return () => unsubscribeQ && unsubscribeQ();
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const fetchQuestions = (uid) => {
    const qnaRef = collection(db, 'users', uid, 'student_questions');
    const legacyRef = collection(db, 'users', uid, 'accumulated_records');
    
    // 두 컬렉션의 변화를 모두 감지하여 통합
    let qnaData = [];
    let legacyData = [];

    const updateCombined = () => {
      const combined = [...qnaData, ...legacyData]
        .sort((a, b) => {
          const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
          const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
          return timeB - timeA;
        });
      setQuestions(combined);
      setLoading(false);
    };

    const unsubQna = onSnapshot(query(qnaRef), (snapshot) => {
      qnaData = snapshot.docs.map(doc => ({ id: doc.id, collection: 'student_questions', ...doc.data() }));
      updateCombined();
    });

    const unsubLegacy = onSnapshot(query(legacyRef), (snapshot) => {
      legacyData = snapshot.docs.map(doc => ({ id: doc.id, collection: 'accumulated_records', ...doc.data() }))
        .filter(entry => 
          entry.isStudentEntry === true && 
          entry.content && 
          entry.content.includes('[선생님께 한마디]')
        );
      updateCombined();
    });

    return () => {
      unsubQna();
      unsubLegacy();
    };
  };

  const handleDelete = (question) => {
    showConfirm("이 질문을 삭제하시겠습니까? 삭제된 기록은 복구할 수 없습니다.", async () => {
      try {
        if (!currentUser) return;
        const collectionName = question.collection || 'accumulated_records';
        const docRef = doc(db, 'users', currentUser.uid, collectionName, question.id);
        await deleteDoc(docRef);
        showAlert("질문이 성공적으로 삭제되었습니다.", "삭제 완료");
      } catch (error) {
        console.error("삭제 오류:", error);
        showAlert("삭제 중 오류가 발생했습니다.", "오류", "error");
      }
    }, "질문 삭제");
  };

  const handleExcelExport = () => {
    if (questions.length === 0) {
      showAlert("다운로드할 질문 데이터가 없습니다.", "알림");
      return;
    }

    const data = questions.map((q) => ({
      '날짜/시간': formatDateTime(q.timestamp),
      '학년': q.grade || '',
      '반': q.classNum || '',
      '번호': q.studentNum || '',
      '이름': q.studentName || '',
      '동아리': q.club || '',
      '한마디 내용': cleanContent(q.content)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "학생질문");
    
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    XLSX.writeFile(workbook, `학생_질문_리스트_${today}.xlsx`);
    showAlert("질문 리스트가 엑셀 파일로 저장되었습니다.", "다운로드 완료");
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return '-';
    // serverTimestamp인 경우 toDate() 사용
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? '오후' : '오전';
    const h12 = hours % 12 || 12;
    const minStr = minutes < 10 ? `0${minutes}` : minutes;
    
    return `${year}-${month}-${day} ${ampm} ${h12}:${minStr}`;
  };

  const cleanContent = (content) => {
    return content.replace(/^\[선생님께 한마디\]\s*/, '');
  };

  return (
    <div className="student-dashboard">
      <div className="dashboard-header-container" style={{ padding: '20px 30px', backgroundColor: '#fff', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: '900', color: 'var(--color-primary-dark)', fontSize: '24px' }}>
              💬 학생 질문 및 한마디
            </h2>
            <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '14px' }}>
              학생들이 대시보드에서 선생님께 남긴 질문과 메시지를 실시간으로 확인합니다.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <button 
              className="btn-outline-green" 
              onClick={handleExcelExport}
              style={{ padding: '10px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold' }}
            >
              📊 질문 리스트 다운받기
            </button>
            <div style={{ textAlign: 'right', borderLeft: '1px solid #eee', paddingLeft: '20px' }}>
              <div style={{ fontSize: '13px', color: '#999', marginBottom: '4px' }}>누적 메시지</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--color-primary)' }}>{questions.length}<span style={{ fontSize: '15px', color: '#666', marginLeft: '2px' }}>건</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="table-container" style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <table className="student-table">
          <thead>
            <tr>
              <th style={{ borderRadius: '15px 0 0 0' }}>날짜/시간</th>
              <th>학년</th>
              <th>반</th>
              <th>번호</th>
              <th>이름</th>
              <th>동아리</th>
              <th>한마디 내용</th>
              <th style={{ borderRadius: '0 15px 0 0' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" style={{ padding: '60px', textAlign: 'center', color: '#999' }}>데이터를 불러오는 중입니다...</td></tr>
            ) : questions.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '80px', textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '15px' }}>💬</div>
                  <div style={{ color: '#999', fontSize: '16px' }}>아직 도착한 질문이 없습니다.</div>
                </td>
              </tr>
            ) : (
              questions.map((q) => (
                <tr key={q.id}>
                  <td style={{ fontSize: '13px', color: '#777', width: '170px' }}>
                    {formatDateTime(q.timestamp)}
                  </td>
                  <td style={{ width: '60px' }}>{q.grade || '-'}</td>
                  <td style={{ width: '60px' }}>{q.classNum || '-'}</td>
                  <td style={{ width: '60px' }}>{q.studentNum || '-'}</td>
                  <td style={{ fontWeight: 'bold', width: '100px', color: '#333' }}>{q.studentName}</td>
                  <td style={{ width: '120px', fontSize: '13px', color: '#888' }}>{q.club || '-'}</td>
                  <td style={{ textAlign: 'left', padding: '15px 25px', lineHeight: '1.6', color: '#444', whiteSpace: 'pre-wrap' }}>
                    {cleanContent(q.content)}
                  </td>
                  <td style={{ width: '80px' }}>
                    <button 
                      onClick={() => handleDelete(q)}
                      style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #ff4d4f', color: '#ff4d4f', backgroundColor: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fff1f0'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StudentQuestionPage;
