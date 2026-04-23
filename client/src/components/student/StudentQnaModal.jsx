import React from 'react';

// 학생용 선생님께 한마디 모달 (StudentPage에서 분리)
function StudentQnaModal({ qnaText, setQnaText, onSubmit, onClose }) {
  return (
    <div className="modal-body">
      <div className="modal-icon-large">💬</div>
      <h3 className="modal-title">선생님께 한마디</h3>
      <p className="modal-desc">수업 중 궁금했던 점이나 건의사항을 선생님만 볼 수 있게 남겨주세요.</p>
      <textarea className="modal-textarea" placeholder="여기에 질문이나 하고 싶은 말을 적어주세요..." value={qnaText} onChange={(e) => setQnaText(e.target.value)} autoFocus />
      <div className="modal-actions">
        <button className="btn-cancel" onClick={onClose}>취소</button>
        <button className="btn-submit" onClick={onSubmit} disabled={!qnaText.trim()}>메시지 보내기</button>
      </div>
    </div>
  );
}

export default StudentQnaModal;
