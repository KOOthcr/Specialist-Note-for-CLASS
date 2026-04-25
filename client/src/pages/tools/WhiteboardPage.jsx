import React, { useState, useEffect, useRef } from 'react';
import './WhiteboardPage.css';
import { useModal } from '../../components/common/GlobalModal';

function WhiteboardPage() {
  const { showAlert } = useModal();
  const editorRef = useRef(null);
  const [fontSize, setFontSize] = useState('55px');
  const [isAutoSave, setIsAutoSave] = useState(true);
  const [charCount, setCharCount] = useState(0);

  // 초기 데이터 로드 및 자동 저장 설정
  useEffect(() => {
    const savedContent = localStorage.getItem('whiteboard_content');
    if (savedContent && editorRef.current) {
      editorRef.current.innerHTML = savedContent;
      updateCharCount();
    }

    const timer = setInterval(() => {
      if (isAutoSave && editorRef.current) {
        localStorage.setItem('whiteboard_content', editorRef.current.innerHTML);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [isAutoSave]);

  const updateCharCount = () => {
    if (editorRef.current) {
      setCharCount(editorRef.current.innerText.length);
    }
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) editorRef.current.focus();
  };

  const handleFontSizeChange = (e) => {
    const size = e.target.value;
    setFontSize(size);
    // 선택된 텍스트의 크기 변경 (직접 스타일 적용)
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const span = document.createElement('span');
      span.style.fontSize = size;
      const range = selection.getRangeAt(0);
      range.surroundContents(span);
    }
  };

  const handleSave = () => {
    if (editorRef.current) {
      localStorage.setItem('whiteboard_content', editorRef.current.innerHTML);
      showAlert('저장되었습니다.', '알림');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="tool-page-container">
      <div className="whiteboard-container">
        
        {/* 상단 툴바 */}
        <div className="whiteboard-toolbar">
          <div className="toolbar-left">
            <select 
              className="font-size-select" 
              value={fontSize} 
              onChange={handleFontSizeChange}
            >
              <option value="30px">30px</option>
              <option value="40px">40px</option>
              <option value="55px">55px</option>
              <option value="70px">70px</option>
              <option value="100px">100px</option>
            </select>

            <div className="toolbar-group">
              <button className="toolbar-btn" onClick={() => execCommand('bold')}>B</button>
              <button className="toolbar-btn" onClick={() => execCommand('italic')}>I</button>
              <button className="toolbar-btn" onClick={() => execCommand('underline')}>U</button>
              <button className="toolbar-btn" onClick={() => execCommand('strikeThrough')}>T</button>
            </div>

            <div className="toolbar-group">
              <button className="toolbar-btn color-picker-btn" onClick={() => execCommand('foreColor', '#ffffff')}>
                <span>A</span>
                <div className="color-bar" style={{ backgroundColor: '#ffffff' }}></div>
              </button>
              <button className="toolbar-btn color-picker-btn" onClick={() => execCommand('foreColor', '#FFD700')}>
                <span>A</span>
                <div className="color-bar" style={{ backgroundColor: '#FFD700' }}></div>
              </button>
              <button className="toolbar-btn" onClick={() => execCommand('removeFormat')}>⟲</button>
            </div>
          </div>

          <div className="toolbar-right">
            <div className="auto-save-section">
              <span>자동 저장</span>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={isAutoSave}
                  onChange={(e) => setIsAutoSave(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
            
            <button className="action-btn btn-save" onClick={handleSave}>💾 저장</button>
            <button className="action-btn" onClick={() => showAlert('목록 기능은 준비 중입니다.', '알림')}>📑 목록</button>
            <button className="action-btn" onClick={handlePrint}>🖨️ 인쇄</button>
          </div>
        </div>

        {/* 칠판 본문 */}
        <div className="blackboard-area" style={{ position: 'relative' }}>
          <div className="char-count">{charCount} / 10000</div>
          <div
            ref={editorRef}
            className="editor-content"
            contentEditable
            suppressContentEditableWarning
            onInput={updateCharCount}
            style={{ fontSize: fontSize, minHeight: '100%', outline: 'none' }}
          ></div>
        </div>

        {/* 플로팅 버튼 */}
        <div className="floating-add-btn" onClick={() => execCommand('insertHorizontalRule')}>
          +
        </div>
      </div>
    </div>
  );
}

export default WhiteboardPage;
