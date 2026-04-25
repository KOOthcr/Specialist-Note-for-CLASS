import React from 'react';

/**
 * QuestionTableBody: 학생 질문 테이블 tbody 렌더링 컴포넌트
 * 로딩/빈 상태/질문 목록을 담당하며, 로직은 StudentQuestionPage에 유지됩니다.
 */
function QuestionTableBody({ loading, questions, formatDateTime, cleanContent, handleDelete }) {
  if (loading) {
    return (
      <tr><td colSpan="8" style={{ padding: '60px', textAlign: 'center', color: '#999' }}>데이터를 불러오는 중입니다...</td></tr>
    );
  }

  if (questions.length === 0) {
    return (
      <tr>
        <td colSpan="8" style={{ padding: '80px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>💬</div>
          <div style={{ color: '#999', fontSize: '16px' }}>아직 도착한 질문이 없습니다.</div>
        </td>
      </tr>
    );
  }

  return questions.map((q) => (
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
  ));
}

export default QuestionTableBody;
