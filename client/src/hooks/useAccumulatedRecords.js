import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * useAccumulatedRecords: 누가기록 페이지의 데이터 및 그룹 상태를 관리하는 커스텀 훅
 */
export function useAccumulatedRecords() {
  const [currentUser, setCurrentUser] = useState(null);
  const [classes, setClasses] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState({ id: 'all', name: '전체', type: 'all' });
  const [studentRecords, setStudentRecords] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchGroups(user.uid);
        fetchStudents(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchGroups = async (uid) => {
    try {
      const classSnap = await getDocs(collection(db, 'users', uid, 'classes'));
      setClasses(classSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'class' })).sort((a, b) => a.grade - b.grade || a.class_number - b.class_number));
      const clubSnap = await getDocs(collection(db, 'users', uid, 'clubs'));
      setClubs(clubSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'club' })));
    } catch (e) { console.error(e); }
  };

  const fetchStudents = async (uid) => {
    try {
      const snap = await getDocs(collection(db, 'users', uid, 'students'));
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) { console.error(e); }
  };

  const fetchStudentRecords = async (studentId) => {
    if (!currentUser) return;
    try {
      const q = query(collection(db, 'users', currentUser.uid, 'accumulated_records'), where('studentId', '==', studentId), orderBy('date', 'desc'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      setStudentRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      try {
        const fallbackSnap = await getDocs(collection(db, 'users', currentUser.uid, 'accumulated_records'));
        setStudentRecords(fallbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(r => r.studentId === studentId).sort((a, b) => new Date(b.date) - new Date(a.date)));
      } catch (err) { console.error(err); }
    }
  };

  return {
    currentUser,
    classes,
    clubs,
    students,
    selectedGroup,
    setSelectedGroup,
    studentRecords,
    setStudentRecords,
    fetchStudentRecords
  };
}
