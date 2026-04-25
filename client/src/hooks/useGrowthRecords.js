import { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';

/**
 * useGrowthRecords: 성장 기록 페이지의 데이터 및 카테고리 상태를 관리하는 커스텀 훅
 */
export function useGrowthRecords() {
  const [currentUser, setCurrentUser] = useState(null);
  const [classes, setClasses] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [students, setStudents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => { if (user) { setCurrentUser(user); fetchInitialData(user.uid); } });
    return () => unsubscribe();
  }, []);

  const fetchInitialData = async (uid) => {
    try {
      const classSnapshot = await getDocs(collection(db, 'users', uid, 'classes'));
      setClasses(classSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.grade - b.grade || a.class_number - b.class_number));
      const clubSnapshot = await getDocs(collection(db, 'users', uid, 'clubs'));
      setClubs(clubSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      const studentSnapshot = await getDocs(collection(db, 'users', uid, 'students'));
      setStudents(studentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) { console.error(e); }
  };

  const fetchCategoriesForGroup = async (uid, groupId) => {
    try {
      const q = query(collection(db, 'users', uid, 'growth_categories'), where('groupId', '==', groupId));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCategories(list);
      if (list.length > 0) setSelectedCategory(list[0]);
      else setSelectedCategory(null);
    } catch (e) { console.error(e); }
  };

  return {
    currentUser,
    classes,
    clubs,
    students,
    categories,
    setCategories,
    selectedCategory,
    setSelectedCategory,
    fetchCategoriesForGroup
  };
}
