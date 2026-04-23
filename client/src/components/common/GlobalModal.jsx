import React, { createContext, useContext, useState } from 'react';
import './GlobalModal.css';

const ModalContext = createContext();

export const useModal = () => useContext(ModalContext);

export const ModalProvider = ({ children }) => {
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success', // 'success', 'error', 'confirm'
    onConfirm: null
  });

  const showAlert = (message, title = '알림', type = 'success') => {
    setModal({ isOpen: true, title, message, type, onConfirm: null });
  };

  const showConfirm = (message, onConfirm, title = '확인') => {
    setModal({ isOpen: true, title, message, type: 'confirm', onConfirm });
  };

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {modal.isOpen && (
        <div className="global-modal-overlay" onClick={closeModal}>
          <div className="global-modal-content" onClick={e => e.stopPropagation()}>
            <div className={`modal-icon ${modal.type}`}>
              {modal.type === 'success' ? '✓' : modal.type === 'error' ? '✕' : '?'}
            </div>
            <h3 className="modal-title">{modal.title}</h3>
            <p className="modal-text">{modal.message}</p>
            <div className="modal-actions">
              {modal.type === 'confirm' && (
                <button className="btn-modal-cancel" onClick={closeModal}>취소</button>
              )}
              <button className="btn-modal-confirm" onClick={() => {
                if (modal.onConfirm) modal.onConfirm();
                closeModal();
              }}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
};
