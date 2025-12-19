document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("studentForm");
  const fields = {
    studentId: document.getElementById("studentId"),
    fullName: document.getElementById("fullName"),
    gmail: document.getElementById("gmail"),
    gender: document.getElementById("gender"),
    program: document.getElementById("program"),
    yearLevel: document.getElementById("yearLevel"),
    university: document.getElementById("university"),
  };
  const errors = Array.from(form.querySelectorAll(".form-error"));
  const tableBody = document.querySelector("#studentTable tbody");
  const filters = document.querySelectorAll('input[name="filter"]');
  const searchBox = document.getElementById("searchBox");
  let students = [];

  const courseFilter = document.getElementById("courseFilter");

  function populateCourses(students) {
    const programs = Array.from(
      new Set(students.map((s) => s.program).filter(Boolean))
    ).sort();
    courseFilter.innerHTML = '<option value="">All Courses</option>';
    programs.forEach((prog) => {
      courseFilter.innerHTML += `<option value="${prog}">${prog}</option>`;
    });
  }

  courseFilter.addEventListener("change", renderStudents);

  // Show Toast Modal
  function showToast(msg, success = true) {
    const modal = document.getElementById("toastModal");
    const message = document.getElementById("toastMessage");
    const icon = document.querySelector(".toast-icon");
    if (!modal || !message || !icon) return;

    message.textContent = msg;
    if (success) {
      icon.textContent = "✓";
      icon.style.background =
        "linear-gradient(135deg, #2d7a2d 0%, #1a5c1a 100%)";
      message.style.color = "#1a5c1a";
    } else {
      icon.textContent = "✗";
      icon.style.background =
        "linear-gradient(135deg, #c94e3a 0%, #a83d2c 100%)";
      message.style.color = "#c94e3a";
    }
    modal.classList.add("show");
    setTimeout(() => {
      modal.classList.remove("show");
    }, 2000);
  }

  // Show Confirmation Modal
  function showConfirmation(title, text) {
    return new Promise((resolve) => {
      const modal = document.getElementById("confirmModal");
      const titleEl = document.getElementById("confirmTitle");
      const textEl = document.getElementById("confirmText");
      const btnConfirm = document.getElementById("btnConfirm");
      const btnCancel = document.getElementById("btnCancel");

      titleEl.textContent = title;
      textEl.textContent = text;
      modal.classList.add("show");

      const handleConfirm = () => {
        modal.classList.remove("show");
        cleanup();
        resolve(true);
      };

      const handleCancel = () => {
        modal.classList.remove("show");
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        btnConfirm.removeEventListener("click", handleConfirm);
        btnCancel.removeEventListener("click", handleCancel);
      };

      btnConfirm.addEventListener("click", handleConfirm);
      btnCancel.addEventListener("click", handleCancel);
    });
  }

  // Validate Field
  function validateField(input, idx) {
    const value = input.value.trim();
    let message = "";
    if (!value) {
      message = "This field is required.";
    } else if (input.id === "studentId" && !/^[A-Za-z0-9-]+$/.test(value)) {
      message = "Student ID must contain only letters, numbers, and hyphens.";
    } else if (input.id === "gmail" && !/^[^@]+@[^@]+\.[^@]+$/.test(value)) {
      message = "Invalid email format.";
    } else if (input.id === "yearLevel" && !value) {
      message = "Please select a Year Level.";
    }
    errors[idx].textContent = message;
    input.classList.toggle("form-invalid", !!message);
    return !message;
  }

  Object.values(fields).forEach((f, idx) =>
    f.addEventListener("input", () => validateField(f, idx))
  );

  // Form Submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let isValid = true;
    Object.values(fields).forEach((f, idx) => {
      if (!validateField(f, idx)) isValid = false;
    });
    if (!isValid) {
      showToast("Please correct errors above.", false);
      return;
    }

    const confirmed = await showConfirmation(
      "Add Student",
      "Are you sure you want to add this student?"
    );
    if (!confirmed) return;

    const newStudent = {
      studentId: fields.studentId.value.trim(),
      name: fields.fullName.value.trim(),
      gmail: fields.gmail.value.trim(),
      gender: fields.gender.value.trim(),
      program: fields.program.value.trim(),
      yearLevel: fields.yearLevel.value.trim(),
      university: fields.university.value.trim(),
    };

    try {
      const res = await fetch("/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStudent),
      });
      if (!res.ok) {
        showToast("❌ Error adding student", false);
        return;
      }
      form.reset();
      errors.forEach((e) => (e.textContent = ""));
      showToast("Student added!");
      fetchStudents();
    } catch (error) {
      showToast("❌ Network error", false);
    }
  });

  async function fetchStudents() {
    try {
      const res = await fetch("/students");
      students = await res.json();
      populateCourses(students);
      renderStudents();
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  }

  function renderStudents() {
    tableBody.innerHTML = "";
    let filtered = [...students];
    const selected = document.querySelector(
      'input[name="filter"]:checked'
    ).value;
    const query = searchBox.value.toLowerCase();

    if (selected === "name")
      filtered.sort((a, b) => a.name.localeCompare(b.name));

    const selectedProgram = courseFilter.value;
    if (selectedProgram) {
      filtered = filtered.filter((s) => s.program === selectedProgram);
    }

    if (selected === "male")
      filtered = filtered.filter((s) => s.gender === "Male");
    if (selected === "female")
      filtered = filtered.filter((s) => s.gender === "Female");
    if (query)
      filtered = filtered.filter((s) => s.name.toLowerCase().includes(query));

    filtered.forEach((s) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.studentId}</td>
        <td>${s.name}</td>
        <td>${s.gender}</td>
        <td>${s.gmail}</td>
        <td>${s.program}</td>
        <td>${s.yearLevel}</td>
        <td>${s.university}</td>
        <td style="text-align: right;">
          <button class="delete-btn" data-id="${s.id}" title="Delete">
            <i class="bi bi-trash3"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Delete Button Logic
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = btn.dataset.id;
        const confirmed = await showConfirmation(
          "Delete Student",
          "Are you sure? This action cannot be undone."
        );
        if (!confirmed) return;

        try {
          await fetch(`/students/${id}`, { method: "DELETE" });
          showToast("Student deleted.");
          fetchStudents();
        } catch (error) {
          showToast("❌ Error deleting student", false);
        }
      });
    });
  }

  fetchStudents();
  filters.forEach((f) => f.addEventListener("change", renderStudents));
  searchBox.addEventListener("input", renderStudents);

  // --- NEW: CHATBOT LOGIC ---
  const chatToggleBtn = document.getElementById("chatToggleBtn");
  const chatContainer = document.getElementById("chatContainer");
  const closeChatBtn = document.getElementById("closeChatBtn");
  const chatInput = document.getElementById("chatInput");
  const sendMessageBtn = document.getElementById("sendMessageBtn");
  const chatHistory = document.getElementById("chatHistory");

  // Open/Close Chat
  if (chatToggleBtn) {
    chatToggleBtn.addEventListener("click", () => {
      chatContainer.classList.remove("hidden");
    });
  }
  if (closeChatBtn) {
    closeChatBtn.addEventListener("click", () => {
      chatContainer.classList.add("hidden");
    });
  }

  // Send Message Logic
  // Updated Send Message Function with Loader
  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // 1. Add User Message to UI
    appendMessage("user", message);
    chatInput.value = ""; // Clear input

    // 2. Add "Typing..." Indicator
    const loaderId = "loader-" + Date.now(); // Unique ID to find it later
    const loaderDiv = document.createElement("div");
    loaderDiv.classList.add("message", "bot-message");
    loaderDiv.id = loaderId;

    // Insert the 3 dots HTML
    loaderDiv.innerHTML = `
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
    `;

    chatHistory.appendChild(loaderDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight; // Scroll to bottom

    try {
      // 3. Send to Backend
      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();

      // 4. Remove the Loader
      const loaderToRemove = document.getElementById(loaderId);
      if (loaderToRemove) loaderToRemove.remove();

      // 5. Add Real Bot Response
      appendMessage("bot", data.reply);
    } catch (error) {
      // Handle Error
      const loaderToRemove = document.getElementById(loaderId);
      if (loaderToRemove) loaderToRemove.remove();
      appendMessage("bot", "❌ Error: Could not reach the AI server.");
      console.error(error);
    }
  }

  function appendMessage(sender, text) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add(
      "message",
      sender === "user" ? "user-message" : "bot-message"
    );

    // --- NEW FORMATTING LOGIC ---
    if (sender === "bot") {
      // 1. Convert **text** to <strong>text</strong> (Bold)
      let formattedText = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

      // 2. Convert numbered lists (1. Name) to have line breaks
      formattedText = formattedText.replace(/\n/g, "<br>");

      msgDiv.innerHTML = formattedText; // Use innerHTML instead of textContent
    } else {
      msgDiv.textContent = text;
    }
    // -----------------------------

    chatHistory.appendChild(msgDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }
  window.fillChat = function (text) {
    const chatInput = document.getElementById("chatInput");
    chatInput.value = text;
    // Optional: Automatically send it
    // document.getElementById("sendMessageBtn").click();
  };
  function appendLoader() {
    const loaderDiv = document.createElement("div");
    loaderDiv.classList.add("message", "bot-message");
    const id = "loader-" + Date.now();
    loaderDiv.id = id;
    loaderDiv.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
    chatHistory.appendChild(loaderDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
    return id;
  }

  function removeLoader(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  if (sendMessageBtn) {
    sendMessageBtn.addEventListener("click", sendMessage);
  }
  if (chatInput) {
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });
  }
});

// Preloader
window.addEventListener("load", () => {
  const preloader = document.getElementById("preloader");
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add("hide");
      setTimeout(() => preloader.remove(), 1200);
    }, 1500);
  }
});
