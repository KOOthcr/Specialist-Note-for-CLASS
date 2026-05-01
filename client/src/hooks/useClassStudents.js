import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, getDocs, doc, writeBatch, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * useClassStudents: 학급별 학생 명단 페이지의 데이터 및 상태를 관리하는 커스텀 훅
 */
export function useClassStudents() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        fetchAllData(user.uid);
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchAllData = async (uid) => {
    try {
      const classesRef = collection(db, 'users', uid, 'classes');
      let classSnapshot = await getDocs(classesRef);
      let classList = classSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (classList.length === 0) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const profileData = userDoc.data();
          if (profileData.assigned_classes && profileData.assigned_classes.length > 0) {
            const batch = writeBatch(db);
            profileData.assigned_classes.forEach(ac => {
              const newClassRef = doc(collection(db, 'users', uid, 'classes'));
              batch.set(newClassRef, { ...ac, created_at: new Date().toISOString() });
            });
            await batch.commit();
            classSnapshot = await getDocs(classesRef);
            classList = classSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          }
        }
      }
      const studentsRef = collection(db, 'users', uid, 'students');
      const studentSnapshot = await getDocs(studentsRef);
      const studentList = studentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(studentList);

      // 학생 목록에는 있으나 classes 컬렉션에 없는 학급 자동 생성
      const existingClassKeys = new Set(classList.map(c => `${c.grade}-${c.class_number}`));
      const missingClasses = new Map();
      
      studentList.forEach(student => {
        if (student.grade && student.class_number) {
          const key = `${student.grade}-${student.class_number}`;
          if (!existingClassKeys.has(key) && !missingClasses.has(key)) {
            missingClasses.set(key, {
              grade: student.grade,
              class_number: student.class_number,
              leader: '',
              created_at: new Date().toISOString()
            });
          }
        }
      });

      if (missingClasses.size > 0) {
        const batch = writeBatch(db);
        missingClasses.forEach(classData => {
          const newClassRef = doc(collection(db, 'users', uid, 'classes'));
          batch.set(newClassRef, classData);
          classList.push({ id: newClassRef.id, ...classData });
        });
        await batch.commit();
      }

      // 반별로 정렬해서 업데이트
      classList.sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade;
        return a.class_number - b.class_number;
      });
      setClasses(classList);

      const clubsRef = collection(db, 'users', uid, 'clubs');
      const clubSnapshot = await getDocs(clubsRef);
      const clubList = clubSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClubs(clubList);
    } catch (error) {
      console.error("Error fetching data: ", error);
    }
  };

  return {
    students,
    classes,
    clubs,
    currentUser,
    fetchAllData
  };
}
