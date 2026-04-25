import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * useAllStudents: 전체 학생 및 동아리 데이터를 관리하는 커스텀 훅
 */
export function useAllStudents() {
  const [students, setStudents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchStudents(user.uid);
        fetchClubs(user.uid);
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchStudents = async (uid) => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users', uid, 'students'));
      const studentList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(studentList.sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade;
        if (a.class_number !== b.class_number) return a.class_number - b.class_number;
        return a.student_number - b.student_number;
      }));
    } catch (error) {
      console.error("Error fetching students: ", error);
    }
  };

  const fetchClubs = async (uid) => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users', uid, 'clubs'));
      const clubList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClubs(clubList);
    } catch (error) {
      console.error("Error fetching clubs: ", error);
    }
  };

  return {
    students,
    clubs,
    currentUser,
    fetchStudents,
    fetchClubs
  };
}
