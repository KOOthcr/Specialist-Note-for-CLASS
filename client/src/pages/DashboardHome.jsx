import React, { useState, useEffect } from 'react';
import './DashboardHome.css';

const CHEERING_MESSAGES = [
  "환영합니다! 오늘도 힘찬 하루 보내세요!",
  "선생님의 열정이 아이들의 미래를 밝힙니다.",
  "오늘 하루도 즐거움이 가득한 교실이 되기를 바랍니다.",
  "선생님의 따뜻한 미소가 최고의 수업입니다.",
  "작은 노력들이 모여 큰 기적을 만듭니다. 화이팅!",
  "오늘도 아이들과 함께 행복한 시간 보내세요.",
  "선생님의 헌신에 늘 감사합니다. 오늘도 응원합니다!",
  "지친 하루 끝에 보람찬 미소가 번지기를.",
  "선생님이 계셔서 아이들은 매일 조금씩 자라납니다.",
  "오늘도 수고 많으십니다. 긍정의 에너지를 전파해 주세요!",
  "교실에 핀 웃음꽃이 선생님의 하루를 응원합니다.",
  "한 명의 훌륭한 교사는 만 명의 아이들을 바꿉니다.",
  "선생님의 하루가 평안하고 보람되길 기원합니다.",
  "오늘도 빛나는 하루가 될 거예요. 힘내세요!",
  "아이들의 눈망울 속에서 작은 희망을 발견하는 하루되세요.",
  "선생님의 진심은 언제나 아이들에게 닿습니다.",
  "바쁜 일상 속에서도 잠시 하늘을 보는 여유를 잊지 마세요.",
  "오늘 하루도 선생님의 뜻깊은 발자취가 될 것입니다.",
  "가장 위대한 마법은 선생님의 따뜻한 말 한마디입니다.",
  "언제나 묵묵히 최선을 다하는 선생님, 정말 멋지십니다!"
];

function DashboardHome() {
  const [randomMessage, setRandomMessage] = useState("");
  const [teacherName, setTeacherName] = useState('홍길동');

  useEffect(() => {
    const savedName = localStorage.getItem('teacherName');
    if (savedName) setTeacherName(savedName);

    const randomIndex = Math.floor(Math.random() * CHEERING_MESSAGES.length);
    setRandomMessage(CHEERING_MESSAGES[randomIndex]);
  }, []);

  return (
    <div className="dashboard-home-container">
      <div className="welcome-banner">
        <h1 className="welcome-title">{teacherName} 선생님,</h1>
        <p className="welcome-message">"{randomMessage}"</p>
      </div>
    </div>
  );
}

export default DashboardHome;
