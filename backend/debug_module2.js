import 'dotenv/config';
import { mapQuestionToCOs } from './src/services/questionPaper/coMapper.js';
import { mapQuestionToCOsT4 } from './src/services/questionPaper/t4CoMapper.js';
import { extractQuestionsFromTextT4 } from './src/services/questionPaper/t4QuestionExtractor.js';
import { extractQuestionsFromTextT5 } from './src/services/questionPaper/t5QuestionExtractor.js';

const coRecord = {
  CO1: "Design and implement simple programs using primitive data types, functions, and class basics in C++.",
  CO2: "Analyze and explain object-oriented concepts like classes, inheritance, polymorphism, and abstraction.",
  CO3: "Evaluate the complexity and structure of custom class hierarchies and polymorphism.",
  CO4: "Develop memory-efficient applications using dynamic memory allocation and pointers.",
  CO5: "Construct robust applications with advanced templates, exceptions, and Standard Template Library (STL).",
  CO6: "Implement concurrent algorithms and multi-threading models in modern C++."
};

const unitsAndTopics = [
  {
    unitNumber: "Unit 1",
    unitTitle: "Introduction to OOP and Class Basics",
    topics: ["Primitive Data Types", "Variables", "Control Structures", "Loops", "Functions", "Classes", "Objects", "Constructors", "Destructors"]
  },
  {
    unitNumber: "Unit 2",
    unitTitle: "Object-oriented principles (Inheritance, Polymorphism, Abstraction)",
    topics: ["Inheritance", "Polymorphism", "Virtual Functions", "Abstract Classes", "Interfaces", "Encapsulation"]
  }
];

const runTests = async () => {
  console.log("=== STARTING DYNAMIC MODULE 1 & 2 OBE BOUNDARY MAPPING VALIDATION ===\n");

  // TEST 1: T1 Mapping for MODULE_1 Question
  console.log("--- Test 1: T1 Mapping for MODULE_1 Question ---");
  const qModule1 = {
    questionNo: "1",
    questionText: "Write a C++ program to define a Class named Student with attributes name and age. Create a parameterized constructor and a display function.",
    marks: 5,
    module: "MODULE_1"
  };
  const resultM1 = await mapQuestionToCOs(qModule1, coRecord, unitsAndTopics);
  console.log("Mapped Outcomes:\n", JSON.stringify(resultM1, null, 2));
  console.log("\n------------------------------------------------\n");

  // TEST 2: T1 Mapping for MODULE_2 Question
  console.log("--- Test 2: T1 Mapping for MODULE_2 Question ---");
  const qModule2 = {
    questionNo: "2",
    questionText: "Explain dynamic binding and run-time polymorphism with virtual functions in C++ using a code snippet to demonstrate inheritance.",
    marks: 5,
    module: "MODULE_2"
  };
  const resultM2 = await mapQuestionToCOs(qModule2, coRecord, unitsAndTopics);
  console.log("Mapped Outcomes:\n", JSON.stringify(resultM2, null, 2));
  console.log("\n------------------------------------------------\n");

  // TEST 3: T4 Question Extraction & Mapping (with exactly 13 questions to pass count validation)
  console.log("--- Test 3: T4 Question Extraction & Mapping (13 Questions) ---");
  const rawT4Text = `
  T4 Examination: Object Oriented Programming & Advanced C++
  Max Marks: 25
  PART A - MCQs (1 Mark each)
  1. Which keyword is used to implement inheritance in C++?
  2. What is the default access specifier for members of a class in C++?
  3. A virtual function is declared in a base class and redefined in a derived class. True or False?
  4. Which of the following OOP principles provides security to data?
  5. What is a constructor?
  6. Which operator cannot be overloaded?
  7. Which keyword is used to handle exceptions in C++?
  8. Destructors can be overloaded. True or False?
  9. An abstract class cannot be instantiated. True or False?
  10. Polymorphism is of how many types?
  
  PART B - Descriptive Questions (5 Marks each)
  11. Design a base class Shape and derive Circle and Rectangle from it. Show class declarations.
  12. Explain runtime polymorphism and virtual destructors with an illustrative example.
  13. Write a program to implement dynamic arrays and handle exceptions in C++.
  `;
  try {
    const t4Groups = await extractQuestionsFromTextT4(rawT4Text, coRecord, unitsAndTopics);
    console.log("Extracted T4 Groups:");
    let totalT4Count = 0;
    t4Groups.forEach((group, idx) => {
      console.log(`\nGroup ${idx + 1}: Module: ${group.module}, Tool: ${group.toolType}`);
      group.questions.forEach((q) => {
        totalT4Count++;
        console.log(`  Q${q.questionNo} (${q.marks}M) [Cog: ${q.cognitiveLevel}, Nature: ${q.nature}]:`);
        console.log(`    Text: ${q.questionText}`);
        console.log(`    Mapped COs: ${JSON.stringify(q.mappedCOs)}`);
        console.log(`    Justification: ${q.justification}`);
      });
    });
    console.log(`\nValidation Check: T4 Total Questions Extracted = ${totalT4Count}`);
    if (totalT4Count === 13) {
      console.log("Result: VALIDATED (Exactly 13 questions)");
    } else {
      console.log(`Result: REJECTED (Expected 13 questions, but got ${totalT4Count})`);
    }
  } catch (err) {
    console.error("T4 extraction failed:", err);
  }
  console.log("\n------------------------------------------------\n");

  // TEST 4: T5 Question Extraction & Mapping (with exactly 4 parent questions to pass validation)
  console.log("--- Test 4: T5 Question Extraction & Mapping (4 Parent Questions) ---");
  const rawT5Text = `
  T5 Assignment: Advanced C++ Concepts
  Question 1:
  a) Write a C++ program using control structures to find the factorial of a number. (10 Marks)
  b) Explain constructor overloading with a code example. (10 Marks)
  
  Question 2:
  a) Implement pure virtual functions and abstract classes in C++. (10 Marks)
  b) Create a derived class Manager from Employee and show method overriding. (10 Marks)

  Question 3:
  a) Discuss exception handling mechanism in C++. (10 Marks)
  b) Write a program to show throw, try and catch blocks. (10 Marks)

  Question 4:
  a) Explain templates and generic classes. (10 Marks)
  b) Design a generic swap function to swap integers and floats. (10 Marks)
  `;
  try {
    const t5Groups = await extractQuestionsFromTextT5(rawT5Text, coRecord, unitsAndTopics);
    console.log("Extracted T5 Groups:");
    const baseQuestionSet = new Set();
    t5Groups.forEach((group, idx) => {
      console.log(`\nGroup ${idx + 1}: Module: ${group.module}, Tool: ${group.toolType}`);
      group.questions.forEach((q) => {
        baseQuestionSet.add(q.questionNo);
        console.log(`  Q${q.questionNo} (${q.marks}M) [Cog: ${q.cognitiveLevel}, Nature: ${q.nature}]:`);
        console.log(`    Text: ${q.questionText}`);
        console.log(`    Mapped COs: ${JSON.stringify(q.mappedCOs)}`);
        console.log(`    Justification: ${q.justification}`);
      });
    });
    console.log(`\nValidation Check: T5 Parent Questions Extracted = ${baseQuestionSet.size}`);
    if (baseQuestionSet.size <= 4) {
      console.log("Result: VALIDATED (At most 4 parent questions)");
    } else {
      console.log(`Result: REJECTED (Expected at most 4 parent questions, but got ${baseQuestionSet.size})`);
    }
  } catch (err) {
    console.error("T5 extraction failed:", err);
  }
  console.log("\n================================================\n");
  process.exit(0);
};

runTests();
