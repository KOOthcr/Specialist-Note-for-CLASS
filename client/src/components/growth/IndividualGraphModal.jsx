import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

// 개인 성장 데이터 모달 - 다중 꺾은선 그래프 포함 (GrowthRecordPage에서 분리)
function IndividualGraphModal({ isOpen, student, category, records, onClose }) {
  if (!isOpen || !student || !category) return null;

  // 그래프 선 색상 팔레트
  const colCount = category.columnCount || 1;
  const colors = ['#388e3c', '#1976d2', '#f57c00', '#7b1fa2', '#d32f2f', '#0288d1', '#e64a19', '#512da8', '#c2185b', '#00796b'];

  // 날짜별 데이터를 그래프 포인트 형태로 가공
  const studentData = Object.entries(records)
    .map(([date, data]) => {
      const rec = data?.[student.id];
      const values = rec?.values && rec.values.length > 0
        ? rec.values.map(v => Number(v) || 0)
        : [Number(rec?.value || 0)];
      return { date, day: Number(date.split('-')[2]), values, note: rec?.note || '' };
    })
    .filter(d => d.values.some(v => v > 0))
    .sort((a, b) => a.day - b.day);

  const handleDownload = () => {
    const data = studentData.map(d => {
      const row = { '날짜': d.date };
      for (let i = 0; i < colCount; i++) {
        row[`${category.unit} ${i + 1}`] = d.values[i] !== undefined && d.values[i] !== 0 ? d.values[i] : '';
      }
      row['관찰 메모'] = d.note;
      return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '성장기록');
    XLSX.writeFile(workbook, `${student.name}_${category.title}_성장리포트.xlsx`);
  };

  // SVG 그래프 크기 및 좌표 계산
  const maxValue = Math.max(...studentData.flatMap(d => d.values), 10);
  const chartHeight = 180;
  const containerWidth = 540;
  const getCoords = (index, value) => {
    const x = (index * (containerWidth / (Math.max(studentData.length - 1, 1)))) + 20;
    const y = chartHeight - (value / maxValue) * chartHeight;
    return { x, y };
  };

  // 꺾은선 그래프 SVG 경로 생성
  const generateLinePath = (colIdx) => {
    if (studentData.length < 2) return '';
    return 'M ' + studentData.map((d, i) => {
      const { x, y } = getCoords(i, d.values[colIdx] || 0);
      return `${x},${y}`;
    }).join(' L ');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ width: '700px', borderRadius: '24px', padding: '32px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '800' }}>{student.name} 학생 [{category.title}] 성장 리포트</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-solid-green" style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '50px' }} onClick={handleDownload}>엑셀 다운로드</button>
            <button className="btn-outline-green" style={{ fontSize: '13px', padding: '8px 16px', borderRadius: '50px' }} onClick={onClose}>닫기</button>
          </div>
        </div>

        {/* 그래프 범례 (다중 측정인 경우에만 표시) */}
        {colCount > 1 && (
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginBottom: '10px' }}>
            {Array.from({ length: colCount }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '600' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: colors[i % colors.length] }}></div>
                <span>{category.unit} {i + 1}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ backgroundColor: '#fcfcfc', borderRadius: '20px', padding: '20px', border: '1px solid #eee' }}>
          <svg style={{ width: '100%', height: '220px', overflow: 'visible' }}>
            {Array.from({ length: colCount }).map((_, colIdx) => (
              <g key={`line-group-${colIdx}`}>
                {studentData.length > 1 && <path d={generateLinePath(colIdx)} fill="none" stroke={colors[colIdx % colors.length]} strokeWidth="3" strokeLinecap="round" opacity="0.8" />}
                {studentData.map((d, i) => {
                  const val = d.values[colIdx] || 0;
                  if (val === 0) return null; // 0값은 렌더링 생략
                  const { x, y } = getCoords(i, val);
                  const labelY = y - 12 - (colIdx * 4); // 라벨이 겹치지 않게 Y축 위치 조정
                  return (
                    <g key={`point-${i}-${colIdx}`}>
                      <circle cx={x} cy={y} r="4" fill="#fff" stroke={colors[colIdx % colors.length]} strokeWidth="2" />
                      <text x={x} y={labelY} textAnchor="middle" fontSize="10" fontWeight="bold" fill={colors[colIdx % colors.length]}>{val}</text>
                    </g>
                  );
                })}
              </g>
            ))}
            {/* X축 날짜 표시 (한 번만 렌더링) */}
            {studentData.map((d, i) => {
              const { x } = getCoords(i, 0);
              return <text key={`day-${i}`} x={x} y={chartHeight + 20} textAnchor="middle" fontSize="10" fill="#999">{d.day}일</text>;
            })}
          </svg>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>최근 관찰 메모</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {studentData.slice(-5).reverse().map((d, i) => (
              <div key={i} style={{ padding: '12px', background: '#f9f9f9', borderRadius: '10px', fontSize: '13px' }}>
                <span style={{ fontWeight: 'bold', marginRight: '10px' }}>{d.date}</span> {d.note || '메모 없음'}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default IndividualGraphModal;
