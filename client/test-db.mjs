import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAgl1eDL6gkB--IQValOC4S8JXDICT9cew",
  authDomain: "specialist-note-for-class.firebaseapp.com",
  projectId: "specialist-note-for-class",
  storageBucket: "specialist-note-for-class.firebasestorage.app",
  messagingSenderId: "885863478236",
  appId: "1:885863478236:web:87478bc9e7509aa7e29519",
  measurementId: "G-94T9K175SG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testConnection() {
  try {
    console.log("Connecting to Firestore...");
    const testCollectionRef = collection(db, "test_connection");
    
    // Add a document
    console.log("Writing test document...");
    const docRef = await addDoc(testCollectionRef, {
      message: "Hello from test script!",
      timestamp: new Date()
    });
    console.log("Document written with ID: ", docRef.id);
    
    // Read documents
    console.log("Reading test document...");
    const querySnapshot = await getDocs(testCollectionRef);
    querySnapshot.forEach((doc) => {
      console.log(`Read ${doc.id} =>`, doc.data().message);
    });
    
    // Clean up
    console.log("Deleting test document...");
    await deleteDoc(docRef);
    console.log("Cleanup successful.");

    console.log("✅ 결과: 파이어베이스 DB 연결 성공!");
    process.exit(0);
  } catch (error) {
    console.error("❌ 결과: 파이어베이스 DB 연결 실패!", error);
    process.exit(1);
  }
}

testConnection();
