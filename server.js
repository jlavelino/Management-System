require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const Groq = require("groq-sdk");

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(express.json());
app.use(express.static("public"));

const DATA_FILE = path.join(__dirname, "students.json");

// Function to read student data
function readStudents() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
  const data = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(data);
}

// Function to write student data
function writeStudents(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// Ensure all students have unique IDs
function ensureStudentIds() {
  let students = readStudents();
  let changed = false;
  students.forEach((stu) => {
    if (!stu.id) {
      stu.id = Date.now() + Math.floor(Math.random() * 10000000);
      changed = true;
    }
  });
  if (changed) writeStudents(students);
}
ensureStudentIds();

// chat route
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    // get Real Data
    const students = readStudents();
    const studentDataString = JSON.stringify(students);

    // system Prompt
    const systemPrompt = `
  You are a helpful data analyst for a Student Information System.
  Here is the current database of students in JSON format:
  ${studentDataString}
  
  Instructions:
  1. Answer the user's question based ONLY on this data.
  2. If the user asks "Who am I?" or "What is my name?", explain that you only have access to the student database and do not know the user's identity.
  3. Format lists clearly with line breaks.
`;

    // 3. Call AI
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
    });

    const botReply =
      chatCompletion.choices[0]?.message?.content ||
      "I couldn't generate a response.";
    res.json({ reply: botReply });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({ error: "Failed to process chat request." });
  }
});

// Get all students
app.get("/students", (req, res) => {
  try {
    const students = readStudents();
    res.json(students);
  } catch (error) {
    console.error("Error reading students:", error);
    res.status(500).json({ error: "Failed to read students" });
  }
});

// Add a new student
app.post("/students", (req, res) => {
  try {
    let newStudent = req.body;
    // Basic validation
    if (!newStudent.studentId || !newStudent.name) {
      return res.status(400).json({ error: "Missing student ID or name" });
    }

    // Assign internal ID if missing
    newStudent.id =
      newStudent.id || Date.now() + Math.floor(Math.random() * 10000000);

    const students = readStudents();
    students.push(newStudent);
    writeStudents(students);

    res.json({ message: "Student added successfully", data: newStudent });
  } catch (error) {
    console.error("Error adding student:", error);
    res.status(500).json({ error: "Failed to add student" });
  }
});

// Delete a student by ID
app.delete("/students/:id", (req, res) => {
  try {
    const studentId = req.params.id;
    let students = readStudents();
    const filtered = students.filter((s) => String(s.id) !== String(studentId));
    if (filtered.length === students.length) {
      return res.status(404).json({ error: "Student not found" });
    }
    writeStudents(filtered);
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ error: "Failed to delete student" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
