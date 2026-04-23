import React, { useState, useEffect } from 'react';

// 성장 기록 항목 추가/수정 모달 (GrowthRecordPage에서 분리)
function CategoryModal({ isOpen, initialData, onSave, onDelete, onClose }) {
  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState('개수');
  const [columnCount, setColumnCount] = useState(1);

  // 수정 모드면 기존 데이터로, 추가 모드면 기본값으로 초기화
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setUnit(initialData.unit || '개수');
      setColumnCount(initialData.columnCount || 1);
    } else {
      setTitle('');
      setUnit('개수');
      setColumnCount(1);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '380px', borderRadius: '24px', padding: '32px' }}>
        <h3 style={{ marginBottom: '24px', fontWeight: '800' }}>{initialData ? '항목 수정' : '성장 기록 항목 추가'}</h3>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label style={{ fontWeight: '600', marginBottom: '8px' }}>항목 이름</label>
          <input type="text" className="auth-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 1단 줄넘기" />
        </div>

        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label style={{ fontWeight: '600', marginBottom: '8px' }}>측정 단위</label>
          <input type="text" className="auth-input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="예: 개수, 회, 초" />
        </div>

        <div className="form-group" style={{ marginBottom: '32px' }}>
          <label style={{ fontWeight: '600', marginBottom: '8px' }}>기록 칸 개수</label>
          <input type="number" min="1" max="10" className="auth-input" value={columnCount} onChange={(e) => setColumnCount(Number(e.target.value))} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-outline-green" style={{ flex: 1, padding: '12px' }} onClick={onClose}>취소</button>
            <button className="btn-solid-green" style={{ flex: 1, padding: '12px' }} onClick={() => onSave(title, unit, columnCount)}>저장하기</button>
          </div>
          {/* 수정 모드일 때만 삭제 버튼 표시 */}
          {initialData && (
            <button className="btn-outline-red" style={{ color: '#ff4d4f', borderColor: '#ff4d4f', padding: '10px' }} onClick={() => onDelete(initialData.id)}>항목 삭제하기</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CategoryModal;
