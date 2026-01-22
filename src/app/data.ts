// --- 1. INTERFACES ---
export interface SubjectTopic {
  name: string;
  subtopics: string[];
  practical: string;
}

export interface Student {
  id: string;
  name: string;
  rollNo: number;
  category: "High Performer" | "Average" | "Struggler";
  strength: string;
  weakness: string;
  attendance: string;
  scores: { Math: number; Physics: number; Biology: number };
}

export interface ClassData {
  className: string;
  teacherId: string;
  students: Student[];
  curriculum: { [key: string]: SubjectTopic[] };
}

export interface TeacherProfile {
  id: string;
  name: string;
  age: number;
  qualification: string;
  experience: string;
  english_fluency: "Poor" | "Average" | "Good";
  teaching_style: string;
  strength: string;
  weakness: string;
}

// --- 2. TEACHER DATABASE ---
export const TEACHERS: { [key: string]: TeacherProfile } = {
  "Sunita": {
    id: "t1",
    name: "Sunita Sharma",
    age: 45,
    qualification: "B.A. Hindi, B.Ed",
    experience: "15 Years",
    english_fluency: "Poor",
    teaching_style: "Textbook Reader",
    strength: "Caring, motherly figure.",
    weakness: "Struggles to explain logic. Relies on rote memorization.",
  },
  "Rajesh": {
    id: "t2",
    name: "Rajesh Yadav",
    age: 28,
    qualification: "B.Sc Physics",
    experience: "2 Years",
    english_fluency: "Average",
    teaching_style: "Energetic but Chaotic",
    strength: "Good at Science concepts.",
    weakness: "Zero classroom control. Students climb on benches.",
  },
  "Anjali": {
    id: "t3",
    name: "Anjali Deshmukh",
    age: 50,
    qualification: "M.Sc Math",
    experience: "25 Years",
    english_fluency: "Good",
    teaching_style: "Strict Disciplinarian",
    strength: "Completes syllabus on time.",
    weakness: "Scary. Students are afraid to ask doubts.",
  }
};

// *** EXPORT DEFAULT PROFILE ***
export const TEACHER_PROFILE = TEACHERS["Sunita"];

// --- 3. CURRICULUM (FULL 6 TOPICS) ---
const CURRICULUM_6TH = {
  "Math": [
    { name: "Knowing Our Numbers", subtopics: ["Place Value", "Commas"], practical: "Digit Cards" },
    { name: "Whole Numbers", subtopics: ["Number Line"], practical: "Floor Jump" },
    { name: "Playing with Numbers", subtopics: ["LCM/HCF"], practical: "Pebble Groups" },
    { name: "Basic Geometry", subtopics: ["Points, Lines"], practical: "Matchstick Shapes" },
    { name: "Fractions", subtopics: ["Equivalent Fractions"], practical: "Paper Folding" },
    { name: "Decimals", subtopics: ["Tenths, Money"], practical: "Fake Market" }
  ],
  "Physics": [
    { name: "Motion", subtopics: ["Types of Motion"], practical: "Hand-span vs Ruler" },
    { name: "Light", subtopics: ["Shadows"], practical: "Torch Play" },
    { name: "Electricity", subtopics: ["Circuits"], practical: "LED & Battery" },
    { name: "Magnets", subtopics: ["Poles"], practical: "Iron Filings" },
    { name: "Force", subtopics: ["Friction"], practical: "Pushing Box" },
    { name: "Machines", subtopics: ["Levers"], practical: "Stick Lift" }
  ],
  "Biology": [
    { name: "Food Sources", subtopics: ["Ingredients"], practical: "Lunchbox List" },
    { name: "Components", subtopics: ["Nutrients"], practical: "Iodine Test" },
    { name: "Fibre to Fabric", subtopics: ["Weaving"], practical: "Cloth Pulling" },
    { name: "Plants", subtopics: ["Leaf Parts"], practical: "Leaf Impression" },
    { name: "Body Movements", subtopics: ["Joints"], practical: "Elbow Feel" },
    { name: "Organisms", subtopics: ["Habitats"], practical: "Garden Walk" }
  ]
};

const CURRICULUM_7TH = {
  "Math": [
    { name: "Integers", subtopics: ["Add/Sub"], practical: "Dice Game" },
    { name: "Fractions", subtopics: ["Multiplication"], practical: "Apple Cut" },
    { name: "Data", subtopics: ["Mean/Mode"], practical: "Height Chart" },
    { name: "Equations", subtopics: ["Balancing"], practical: "Tarazu" },
    { name: "Angles", subtopics: ["Complementary"], practical: "Scissors" },
    { name: "Triangles", subtopics: ["Pythagoras"], practical: "Paper Cut" }
  ],
  "Physics": [
    { name: "Heat", subtopics: ["Thermometer"], practical: "Hot/Cold Water" },
    { name: "Winds", subtopics: ["Pressure"], practical: "Balloon Blow" },
    { name: "Motion", subtopics: ["Speed"], practical: "Pendulum" },
    { name: "Current", subtopics: ["Heating Effect"], practical: "Electromagnet" },
    { name: "Light", subtopics: ["Lenses"], practical: "Spoon Reflection" },
    { name: "Sound", subtopics: ["Vibration"], practical: "Rubber Band" }
  ],
  "Biology": [
    { name: "Plant Nutrition", subtopics: ["Photosynthesis"], practical: "Black Paper Leaf" },
    { name: "Animal Nutrition", subtopics: ["Digestion"], practical: "Teeth Count" },
    { name: "Fibre", subtopics: ["Wool/Silk"], practical: "Burning Test" },
    { name: "Respiration", subtopics: ["Lungs"], practical: "Chest Measure" },
    { name: "Human Heart", subtopics: ["Circulation"], practical: "Stethoscope" },
    { name: "Reproduction", subtopics: ["Seeds"], practical: "Flower Dissection" }
  ]
};

// --- 4. STUDENT GENERATOR ---
const firstNames = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan", "Rohan", "Kabir"];
const lastNames = ["Sharma", "Verma", "Gupta", "Malhotra", "Singh", "Yadav", "Patel", "Reddy"];

const generateStudents = (count: number): Student[] => {
  return Array.from({ length: count }).map((_, i) => {
    const rand = Math.random();
    let category: "High Performer" | "Average" | "Struggler" = "Average";
    if (rand > 0.8) category = "High Performer";
    else if (rand < 0.2) category = "Struggler";

    return {
      id: `s${i + 1}`,
      name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
      rollNo: i + 1,
      category,
      strength: "Hardworking",
      weakness: "Needs attention",
      attendance: "Regular",
      scores: { Math: 50, Physics: 50, Biology: 50 }
    };
  });
};

export const SCHOOL_DATA: { [key: string]: ClassData } = {
  "Class 6A": { className: "Class 6A", teacherId: "t1", students: generateStudents(50), curriculum: CURRICULUM_6TH },
  "Class 6B": { className: "Class 6B", teacherId: "t2", students: generateStudents(50), curriculum: CURRICULUM_6TH },
  "Class 7A": { className: "Class 7A", teacherId: "t3", students: generateStudents(50), curriculum: CURRICULUM_7TH },
  "Class 7B": { className: "Class 7B", teacherId: "t1", students: generateStudents(50), curriculum: CURRICULUM_7TH }
};