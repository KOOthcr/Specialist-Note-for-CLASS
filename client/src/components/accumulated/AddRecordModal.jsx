import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase/config';
import { useModal } from '../common/GlobalModal';

// 누가기록 일괄 추가 모달 (AccumulatedRecordPage에서 분리)
// 여러 학생에게 동시에 텍스트/사진/동영상 기록을 추가할 수 있음
function AddRecordModal({ isOpen, onClose, students, type, onSave, selectedGroup, currentUser }) {
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [recordDate, setRecordDate] = useState(
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const { showAlert } = useModal();

  // 모달이 열릴 때마다 입력 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setContent('');
      setFile(null);
      setRecordDate(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
      setIsSubmitting(false);
      setSubmitStatus('');
    }
  }, [isOpen]);

  if (!isOpen || students.length === 0) return null;

  const handleSubmit = async () => {
    if (type === 'text' && !content.trim()) return showAlert('내용을 입력해주세요.', '입력 오류', 'error');
    if (type !== 'text' && !file) return showAlert('파일을 선택해주세요.', '입력 오류', 'error');
    if (!recordDate) return showAlert('날짜를 선택해주세요.', '입력 오류', 'error');

    setIsSubmitting(true);
    setSubmitStatus('업로드 준비 중...');
    try {
      let fileUrl = null;
      let fileName = '';

      // 파일이 있고 텍스트 타입이 아니면 Firebase Storage에 실제 파일 업로드
      if (type !== 'text' && file && currentUser) {
        setSubmitStatus('파일을 서버에 업로드 중입니다... (최대 15초 대기)');
        const fileRef = ref(storage, `accumulated_records/${currentUser.uid}/${Date.now()}_${file.name}`);

        // 15초 타임아웃 설정 (무한 대기 방지)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 15000)
        );
        await Promise.race([uploadBytes(fileRef, file), timeoutPromise]);

        setSubmitStatus('파일 주소 생성 중...');
        fileUrl = await getDownloadURL(fileRef);
        fileName = file.name;
      }

      setSubmitStatus('데이터베이스에 기록 저장 중...');
      let baseContent = type === 'text' ? content : `[${type.toUpperCase()}] 첨부 파일: ${fileName}\n${content}`;

      // 동아리 그룹에서 작성하는 경우 내용 앞에 동아리명 자동 추가
      if (selectedGroup && selectedGroup.type === 'club') {
        baseContent = `[${selectedGroup.name}] ` + baseContent;
      }

      const recordData = {
        type,
        content: baseContent,
        date: recordDate,
        ...(fileUrl && { fileUrl, fileName })
      };

      await onSave(students, recordData);
      showAlert('성공적으로 저장되었습니다.', '저장 완료');
      onClose();
    } catch (e) {
      console.error('Upload/Save Error:', e);
      if (e.message === 'timeout') {
        showAlert('업로드 시간이 초과되었습니다. Firebase Storage가 활성화되어 있는지(규칙 설정 포함) 확인해주세요.', '업로드 실패', 'error');
      } else {
        showAlert(`저장에 실패했습니다: ${e.message}`, '오류', 'error');
      }
    } finally {
      setIsSubmitting(false);
      setSubmitStatus('');
    }
  };

  const getTitle = () => {
    if (type === 'photo') return '사진 기록 일괄 추가';
    if (type === 'video') return '동영상 기록 일괄 추가';
    return '누가기록 (텍스트) 일괄 추가';
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '550px', borderRadius: '24px', padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h3 style={{ marginBottom: '5px', fontWeight: '800', color: 'var(--color-primary-dark)' }}>{getTitle()}</h3>
            <p style={{ color: '#888', fontSize: '13px' }}>
              대상 학생: <b style={{ color: '#333' }}>{students.length}명</b>
              <span style={{ marginLeft: '8px', color: '#999' }}>({students.map(s => s.name).join(', ').substring(0, 30)}{students.length > 3 ? '...' : ''})</span>
            </p>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>📅 기록 날짜</label>
          <input type="date" className="auth-input" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px' }} />
        </div>

        {type !== 'text' && (
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="input-label">📁 {type === 'photo' ? '사진' : '동영상'} 파일 첨부</label>
            <input type="file" accept={type === 'photo' ? 'image/*' : 'video/*'} onChange={(e) => setFile(e.target.files[0])} style={{ padding: '10px', border: '1px dashed #ccc', borderRadius: '12px', width: '100%', backgroundColor: '#fdfdfd' }} />
            {isSubmitting && submitStatus && (
              <p style={{ fontSize: '13px', color: 'var(--color-primary)', marginTop: '8px', fontWeight: 'bold' }}>⏳ {submitStatus}</p>
            )}
          </div>
        )}

        <div className="form-group" style={{ marginBottom: '30px' }}>
          <label className="input-label">{type === 'text' ? '📝 관찰 내용' : '📝 간단한 메모 (선택)'}</label>
          <textarea className="auth-input" style={{ height: '140px', padding: '15px', resize: 'none', borderRadius: '12px' }} value={content} onChange={(e) => setContent(e.target.value)} placeholder={type === 'text' ? '선택한 학생들의 공통 행동 관찰 내용을 자세히 적어주세요.' : '파일에 대한 설명을 적어주세요.'} />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-outline-green" style={{ flex: 1, padding: '14px', borderRadius: '14px' }} onClick={onClose} disabled={isSubmitting}>취소</button>
          <button className="btn-solid-green" style={{ flex: 1, padding: '14px', borderRadius: '14px' }} onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '진행 중...' : `${students.length}명에게 기록 저장`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AddRecordModal;
