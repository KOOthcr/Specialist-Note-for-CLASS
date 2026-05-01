import React, { useState, useEffect } from 'react';

function StudentModal({ isOpen, student, onSave, onClose, clubs = [], initialData = {} }) {
  const [formData, setFormData] = useState({
    grade: '',
    class_number: '',
    student_number: '',
    name: '',
    gender: '남',
    club: ''
  });

  useEffect(() => {
    if (student) {
      setFormData({
        grade: student.grade || '',
        class_number: student.class_number || '',
        student_number: student.student_number || '',
        name: student.name || '',
        gender: student.gender || '남',
        club: student.club || ''
      });
    } else if (initialData) {
      setFormData({
        grade: initialData.grade || '',
        class_number: initialData.class_number || '',
        student_number: '',
        name: '',
        gender: '남',
        club: initialData.club || ''
      });
    } else {
      setFormData({
        grade: '',
        class_number: '',
        student_number: '',
        name: '',
        gender: '남',
        club: ''
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      grade: Number(formData.grade),
      class_number: Number(formData.class_number),
      student_number: Number(formData.student_number)
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 style={{marginBottom: '20px', color: 'var(--color-primary-dark)'}}>
          {student ? '학생 정보 수정' : '학생 수동 등록'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
            <div className="form-group" style={{flex: 1}}>
              <label className="input-label">학년 (필수)</label>
              <input type="number" name="grade" className="auth-input" value={formData.grade} onChange={handleChange} required min="1" max="6" />
            </div>
            <div className="form-group" style={{flex: 1}}>
              <label className="input-label">반 (필수)</label>
              <input type="number" name="class_number" className="auth-input" value={formData.class_number} onChange={handleChange} required min="1" max="25" />
            </div>
            <div className="form-group" style={{flex: 1}}>
              <label className="input-label">번호 (필수)</label>
              <input type="number" name="student_number" className="auth-input" value={formData.student_number} onChange={handleChange} required min="1" max="100" />
            </div>
          </div>
          <div className="form-group" style={{marginBottom:'15px'}}>
            <label className="input-label">이름 (필수)</label>
            <input type="text" name="name" className="auth-input" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="form-group" style={{marginBottom:'15px'}}>
            <label className="input-label">성별 (필수)</label>
            <select name="gender" className="auth-input" value={formData.gender} onChange={handleChange} required>
              <option value="남">남</option>
              <option value="여">여</option>
            </select>
          </div>
          <div className="form-group" style={{marginBottom:'20px'}}>
            <label className="input-label">동아리 (선택)</label>
            <select name="club" className="auth-input" value={formData.club} onChange={handleChange}>
              <option value="">-- 동아리 선택 --</option>
              {clubs.map(club => (
                <option key={club.id} value={club.name}>{club.name}</option>
              ))}
            </select>
          </div>
          
          <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
            <button type="button" className="btn-outline-green" onClick={onClose}>취소</button>
            <button type="submit" className="btn-solid-green">{student ? '수정하기' : '등록하기'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StudentModal;
