import React, { useState, useEffect } from 'react';
import './DustPage.css';

function DustPage() {
  const [loading, setLoading] = useState(true);
  const [dustData, setDustData] = useState(null);

  // 데이터 새로고침 (가짜 데이터 로드)
  const fetchMockData = () => {
    setLoading(true);
    
    setTimeout(() => {
      // 0 ~ 150 사이의 랜덤 값
      const pm10 = Math.floor(Math.random() * 100) + 20; 
      const pm25 = Math.floor(Math.random() * 80) + 10;
      
      setDustData({
        location: '우리 학교 (위치 기반 API 연동 예정)',
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        pm10: pm10,
        pm25: pm25
      });
      
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    fetchMockData();
  }, []);

  const getStatusInfo = (value, isPm25 = false) => {
    // 기준: PM10 (미세먼지) / PM2.5 (초미세먼지)
    const bounds = isPm25 
      ? { good: 15, normal: 35, bad: 75 }
      : { good: 30, normal: 80, bad: 150 };

    if (value <= bounds.good) return { text: '좋음', color: '#3b82f6', emoji: '😄' };
    if (value <= bounds.normal) return { text: '보통', color: '#10b981', emoji: '🙂' };
    if (value <= bounds.bad) return { text: '나쁨', color: '#f59e0b', emoji: '😷' };
    return { text: '매우나쁨', color: '#ef4444', emoji: '😱' };
  };

  return (
    <div className="tool-page-container">
      <div className="dust-card">
        <h2 className="tool-title">☁️ 미세먼지 정보</h2>
        
        <p className="dust-notice">
          * 현재 화면은 <strong>예시 데이터</strong>를 보여주고 있습니다.<br/>
          (추후 공공데이터 API 연동 필요)
        </p>

        {loading ? (
          <div className="dust-loading">
            <div className="spinner"></div>
            <p>미세먼지 정보를 불러오는 중...</p>
          </div>
        ) : dustData && (
          <div className="dust-content">
            <div className="dust-header">
              <span className="dust-location">📍 {dustData.location}</span>
              <span className="dust-time">업데이트: {dustData.time}</span>
            </div>

            <div className="dust-grid">
              {/* 미세먼지 (PM10) */}
              <div className="dust-item">
                <div className="dust-label">미세먼지 (PM10)</div>
                <div 
                  className="dust-emoji"
                  style={{ color: getStatusInfo(dustData.pm10).color }}
                >
                  {getStatusInfo(dustData.pm10).emoji}
                </div>
                <div 
                  className="dust-status"
                  style={{ color: getStatusInfo(dustData.pm10).color }}
                >
                  {getStatusInfo(dustData.pm10).text}
                </div>
                <div className="dust-value">
                  {dustData.pm10} <span>µg/m³</span>
                </div>
              </div>

              {/* 초미세먼지 (PM2.5) */}
              <div className="dust-item">
                <div className="dust-label">초미세먼지 (PM2.5)</div>
                <div 
                  className="dust-emoji"
                  style={{ color: getStatusInfo(dustData.pm25, true).color }}
                >
                  {getStatusInfo(dustData.pm25, true).emoji}
                </div>
                <div 
                  className="dust-status"
                  style={{ color: getStatusInfo(dustData.pm25, true).color }}
                >
                  {getStatusInfo(dustData.pm25, true).text}
                </div>
                <div className="dust-value">
                  {dustData.pm25} <span>µg/m³</span>
                </div>
              </div>
            </div>

            <div className="activity-guide">
              <h3>체육 수업 가이드</h3>
              <p>
                {(dustData.pm10 > 80 || dustData.pm25 > 35) 
                  ? '⚠️ 미세먼지 수치가 높습니다. 실내 체육(강당/체육관)을 권장합니다.'
                  : '✅ 야외 체육 활동이 가능합니다.'}
              </p>
            </div>

            <button className="control-btn start-btn refresh-btn" onClick={fetchMockData}>
              데이터 새로고침
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DustPage;
