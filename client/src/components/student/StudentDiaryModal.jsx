import React from 'react';

// 학생용 체육 일기 작성 모달 (StudentPage에서 분리)
function StudentDiaryModal({ diaryText, setDiaryText, onSubmit, onClose }) {
  return (
    <div className="modal-body">
      <div className="modal-icon-large">📓</div>
      <h3 className="modal-title">오늘의 체육 일기</h3>
      <p className="modal-desc">오늘 수업에서 무엇을 배웠나요? 재미있었던 점이나 느낀 점을 자유롭게 적어보세요.</p>
      <textarea className="modal-textarea" placeholder="여기에 일기를 작성해 주세요..." value={diaryText} onChange={(e) => setDiaryText(e.target.value)} autoFocus />
      <div className="modal-actions">
        <button className="btn-cancel" onClick={onClose}>취소</button>
        <button className="btn-submit" onClick={onSubmit} disabled={!diaryText.trim()}>일기 제출하기</button>
      </div>
    </div>
  );
}

export default StudentDiaryModal;
