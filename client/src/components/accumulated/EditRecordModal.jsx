import React, { useState, useEffect } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import { useModal } from '../common/GlobalModal';

// 개별 누가기록 수정 모달 (AccumulatedRecordPage에서 분리)
// 날짜와 내용만 수정 가능 (파일 재업로드 미지원)
function EditRecordModal({ isOpen, onClose, record, onUpdate }) {
  const [content, setContent] = useState('');
  const [recordDate, setRecordDate] = useState('');
  const [recordTime, setRecordTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showAlert } = useModal();

  // 모달이 열리면 기존 기록 데이터로 입력 필드 채우기
  useEffect(() => {
    if (isOpen && record) {
      setContent(record.content || '');
      setRecordDate(record.date || '');
      setRecordTime(record.time || (record.timestamp ? new Date(record.timestamp.seconds * 1000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''));
    }
  }, [isOpen, record]);

  if (!isOpen || !record) return null;

  const handleSubmit = async () => {
    if (!content.trim()) return showAlert('내용을 입력해주세요.', '입력 오류', 'error');
    if (!recordDate) return showAlert('날짜를 선택해주세요.', '입력 오류', 'error');

    setIsSubmitting(true);
    try {
      await onUpdate(record.id, {
        content,
        date: recordDate,
        time: recordTime,
        updated_at: serverTimestamp()
      });
      showAlert('성공적으로 수정되었습니다.', '수정 완료');
      onClose();
    } catch (e) {
      console.error('Update Error:', e);
      showAlert(`수정에 실패했습니다: ${e.message}`, '오류', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '500px', borderRadius: '24px', padding: '32px' }}>
        <h3 style={{ marginBottom: '20px', fontWeight: '800', color: 'var(--color-primary-dark)' }}>기록 수정</h3>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="input-label">📅 기록 날짜</label>
            <input type="date" className="auth-input" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px' }} />
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="input-label">🕒 기록 시간</label>
            <input type="time" className="auth-input" value={recordTime} onChange={(e) => setRecordTime(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px' }} />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '30px' }}>
          <label className="input-label">📝 관찰 내용</label>
          <textarea className="auth-input" style={{ height: '140px', padding: '15px', resize: 'none', borderRadius: '12px' }} value={content} onChange={(e) => setContent(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-outline-green" style={{ flex: 1, padding: '14px', borderRadius: '14px' }} onClick={onClose}>취소</button>
          <button className="btn-solid-green" style={{ flex: 1, padding: '14px', borderRadius: '14px' }} onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '수정 중...' : '수정 완료'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditRecordModal;
