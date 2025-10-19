const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(express.json());
app.use(express.static("public"));

const DATA_FILE = path.join(__dirname, "students.json");

function readStudents() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
  const data = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(data);
}

function writeStudents(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

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

app.get("/students", (req, res) => {
  try {
    const students = readStudents();
    res.json(students);
  } catch (error) {
    console.error("Error reading students:", error);
    res.status(500).json({ error: "Failed to read students" });
  }
});

app.post("/students", (req, res) => {
  try {
    let newStudent = req.body;
    if (!newStudent.studentId || !newStudent.name) {
      return res.status(400).json({ error: "Missing student ID or name" });
    }
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

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
