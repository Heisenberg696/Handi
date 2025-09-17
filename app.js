let socket = null;
let currentToken = null;
let currentUser = null;
let notificationCount = 0;
let createdJobs = [];
let assignedJobs = [];
let selectedJob = null;
let actionHistory = [];

// ---------------- Utility Functions ----------------
function log(message, type = "info") {
  const logDiv = document.getElementById("log");
  const entry = document.createElement("div");
  entry.className = `log-entry log-${type}`;

  // Add timestamp to log entries
  const timestamp = new Date().toLocaleTimeString();
  entry.innerHTML = `<small>[${timestamp}]</small> ${message}`;

  logDiv.appendChild(entry);
  logDiv.scrollTop = logDiv.scrollHeight;

  // Show export button after some logs
  const exportBtn = document.getElementById("exportLogBtn");
  if (logDiv.children.length > 5 && exportBtn) {
    exportBtn.style.display = "inline-block";
  }
}

function clearLog() {
  document.getElementById("log").innerHTML = "";
  log("Log cleared", "info");

  // Hide export button
  const exportBtn = document.getElementById("exportLogBtn");
  if (exportBtn) exportBtn.style.display = "none";
}

function exportLog() {
  const logDiv = document.getElementById("log");
  const logs = Array.from(logDiv.children)
    .map((entry) => entry.textContent)
    .join("\n");

  const blob = new Blob([logs], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `job-activity-log-${new Date().toISOString().split("T")[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);

  log("Activity log exported", "success");
}

function switchTab(tabName) {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
  });
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active");
  });

  document
    .querySelector(`.tab[onclick="switchTab('${tabName}')"]`)
    .classList.add("active");
  document.getElementById(`${tabName}Tab`).classList.add("active");

  // Initialize filters and data when switching tabs
  if (tabName === "create") {
    setTimeout(() => {
      fetchCreatedJobs();
      updateStatistics();
    }, 100);
  } else if (tabName === "manage") {
    setTimeout(() => {
      fetchAssignedJobs();
      updateStatistics();
    }, 100);
  }
}

// ---------------- Authentication ----------------
async function login() {
  const serverUrl = document.getElementById("serverUrl").value;
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    log("Please enter both email and password", "warning");
    return;
  }

  try {
    const response = await fetch(`${serverUrl}/api/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (response.ok) {
      currentToken = data.token;
      currentUser = data.user;

      document.getElementById("authStatus").textContent =
        "Status: Authenticated";
      document.getElementById("authStatus").className = "status authenticated";

      document.getElementById("connectBtn").disabled = false;

      document.getElementById("userInfo").style.display = "block";
      document.getElementById("userInfo").innerHTML = `
        <h3>User Info</h3>
        <p><strong>ID:</strong> ${currentUser.id}</p>
        <p><strong>Email:</strong> ${currentUser.email}</p>
        <p><strong>Username:</strong> ${currentUser.username || "N/A"}</p>
        <p><strong>Role:</strong> ${currentUser.role}</p>
      `;

      // Show stats section
      const statsSection = document.getElementById("statsSection");
      if (statsSection) statsSection.style.display = "block";

      log("Login successful!", "success");
    } else {
      log(`Login failed: ${data.error || data.message}`, "error");
    }
  } catch (err) {
    log(`Error: ${err.message}`, "error");
  }
}

// ---------------- Socket Connection ----------------
function connectSocket() {
  const serverUrl = document.getElementById("serverUrl").value;
  socket = io(serverUrl, {
    auth: { token: currentToken },
  });

  socket.on("connect", () => {
    document.getElementById("socketStatus").textContent = "Socket: Connected";
    document.getElementById("socketStatus").className = "status connected";

    document.getElementById("createJobBtn").disabled = false;
    document.getElementById("refreshJobsBtn").disabled = false;
    document.getElementById("refreshCreatedJobsBtn").disabled = false;

    log("Socket connected!", "success");
  });

  socket.on("disconnect", () => {
    document.getElementById("socketStatus").textContent =
      "Socket: Disconnected";
    document.getElementById("socketStatus").className = "status disconnected";

    document.getElementById("createJobBtn").disabled = true;
    document.getElementById("refreshJobsBtn").disabled = true;
    document.getElementById("refreshCreatedJobsBtn").disabled = true;

    log("Socket disconnected", "error");
  });

  socket.on("notification", (notification) => {
    notificationCount++;
    const badge = document.getElementById("notificationCount");
    badge.textContent = notificationCount;
    badge.style.display = "inline";

    log(
      `<strong>Notification:</strong> ${notification.message}`,
      "notification"
    );

    // Update appropriate job lists based on notification type
    if (notification.type === "job_posted") {
      // Worker received a job assignment - refresh assigned jobs
      fetchAssignedJobs();
    } else if (
      ["job_accepted", "job_declined", "job_completed"].includes(
        notification.type
      )
    ) {
      // Customer received status update - refresh created jobs
      fetchCreatedJobs();
    }

    // Also refresh assigned jobs if user is viewing manage tab
    fetchAssignedJobs();
    updateStatistics();
  });
}

// ---------------- Job Creation ----------------
async function createJob() {
  const serverUrl = document.getElementById("serverUrl").value;
  const workerId = document.getElementById("workerId").value;
  const title = document.getElementById("jobTitle").value;
  const description = document.getElementById("jobDescription").value;
  const rate = document.getElementById("jobRate").value;

  // Enhanced validation
  if (!workerId || !title || !description) {
    log(
      "Please fill in all required fields (Worker ID, Title, Description)",
      "warning"
    );
    return;
  }

  if (workerId === currentUser?.id) {
    log("You cannot assign a job to yourself", "warning");
    return;
  }

  try {
    const response = await fetch(`${serverUrl}/api/jobs/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentToken}`,
      },
      body: JSON.stringify({ workerId, title, description, rate }),
    });

    const data = await response.json();
    if (response.ok) {
      createdJobs.push(data.job);
      updateJobsList();
      updateStatistics();

      // Clear form after successful creation
      document.getElementById("jobTitle").value = "";
      document.getElementById("jobDescription").value = "";
      document.getElementById("jobRate").value = "";

      // Add to action history
      addToActionHistory(`Created job: ${data.job.title}`, "success");

      log(`Job created successfully: ${data.job.title}`, "success");
    } else {
      log(`Job creation failed: ${data.error || data.message}`, "error");
    }
  } catch (err) {
    log(`Error: ${err.message}`, "error");
  }
}

// ---------------- Enhanced Job Fetching ----------------
async function fetchCreatedJobs(statusFilter = null) {
  const serverUrl = document.getElementById("serverUrl").value;

  // Build URL with optional status filter
  let url = `${serverUrl}/api/jobs/created`;
  if (statusFilter) {
    url += `?status=${statusFilter}`;
  }

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });

    const data = await response.json();
    if (response.ok) {
      createdJobs = data.jobs;
      updateJobsList();
      updateJobsSummary(
        "created",
        data.count || data.jobs.length,
        statusFilter
      );
      updateStatistics();

      // Enhanced logging with count and filter info
      log(
        `Created jobs updated: ${data.count || data.jobs.length} jobs${
          statusFilter ? ` (filtered: ${statusFilter})` : ""
        }`,
        "info"
      );
    } else {
      log(
        `Failed to fetch created jobs: ${data.error || data.message}`,
        "error"
      );
    }
  } catch (err) {
    log(`Error: ${err.message}`, "error");
  }
}

async function fetchAssignedJobs(statusFilter = null) {
  const serverUrl = document.getElementById("serverUrl").value;

  // Build URL with optional status filter
  let url = `${serverUrl}/api/jobs/assigned`;
  if (statusFilter) {
    url += `?status=${statusFilter}`;
  }

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });

    const data = await response.json();
    if (response.ok) {
      assignedJobs = data.jobs;
      updateAssignedJobsList();
      updateJobsSummary(
        "assigned",
        data.count || data.jobs.length,
        statusFilter
      );
      updateStatistics();

      // Enhanced logging with count and filter info
      log(
        `Assigned jobs updated: ${data.count || data.jobs.length} jobs${
          statusFilter ? ` (filtered: ${statusFilter})` : ""
        }`,
        "info"
      );
    } else {
      log(
        `Failed to fetch assigned jobs: ${data.error || data.message}`,
        "error"
      );
    }
  } catch (err) {
    log(`Error: ${err.message}`, "error");
  }
}

// ---------------- Filter Functions ----------------
function filterCreatedJobs() {
  const statusFilter = document.getElementById("createdJobsFilter").value;
  fetchCreatedJobs(statusFilter || null);
}

function filterAssignedJobs() {
  const statusFilter = document.getElementById("assignedJobsFilter").value;
  fetchAssignedJobs(statusFilter || null);
}

// ---------------- Enhanced Job Display ----------------
function updateJobsList() {
  const jobsList = document.getElementById("jobsList");
  jobsList.innerHTML = "";

  if (createdJobs.length === 0) {
    jobsList.innerHTML = '<p class="empty-state">No jobs created yet...</p>';
    return;
  }

  createdJobs.forEach((job) => {
    const jobDiv = document.createElement("div");
    jobDiv.className = `job-card ${job.status}`;
    jobDiv.innerHTML = `
      <div class="job-header">
        <h4>${job.title}</h4>
        <span class="status-badge ${
          job.status
        }">${job.status.toUpperCase()}</span>
      </div>
      <p class="job-description">${job.description}</p>
      <div class="job-meta">
        <p><strong>Worker:</strong> ${
          job.worker?.username || job.worker?.email || "N/A"
        }</p>
        <p><strong>Rate:</strong> ${job.rate ? `$${job.rate}` : "N/A"}</p>
        <p><strong>Created:</strong> ${new Date(
          job.createdAt
        ).toLocaleDateString()}</p>
        ${
          job.completedAt
            ? `<p><strong>Completed:</strong> ${new Date(
                job.completedAt
              ).toLocaleDateString()}</p>`
            : ""
        }
      </div>
    `;
    jobsList.appendChild(jobDiv);
  });
}

function updateAssignedJobsList() {
  const list = document.getElementById("assignedJobsList");
  list.innerHTML = "";

  if (assignedJobs.length === 0) {
    list.innerHTML = '<p class="empty-state">No jobs assigned yet...</p>';
    return;
  }

  assignedJobs.forEach((job) => {
    const jobDiv = document.createElement("div");
    jobDiv.className = `job-card ${job.status} clickable`;
    jobDiv.innerHTML = `
      <div class="job-header">
        <h4>${job.title}</h4>
        <span class="status-badge ${
          job.status
        }">${job.status.toUpperCase()}</span>
      </div>
      <p class="job-description">${job.description}</p>
      <div class="job-meta">
        <p><strong>Customer:</strong> ${
          job.customer?.username || job.customer?.email || "N/A"
        }</p>
        <p><strong>Rate:</strong> ${job.rate ? `$${job.rate}` : "N/A"}</p>
        <p><strong>Created:</strong> ${new Date(
          job.createdAt
        ).toLocaleDateString()}</p>
        ${
          job.completedAt
            ? `<p><strong>Completed:</strong> ${new Date(
                job.completedAt
              ).toLocaleDateString()}</p>`
            : ""
        }
      </div>
    `;

    jobDiv.onclick = (event) => selectJob(job, event);
    list.appendChild(jobDiv);
  });
}

function updateJobsSummary(type, count, filter) {
  const summaryId =
    type === "created" ? "createdJobsSummary" : "assignedJobsSummary";
  const countId = type === "created" ? "createdJobsCount" : "assignedJobsCount";

  const summaryDiv = document.getElementById(summaryId);
  const countSpan = document.getElementById(countId);

  if (summaryDiv && countSpan) {
    summaryDiv.style.display = count > 0 ? "block" : "none";
    countSpan.textContent = count;

    const summaryText = summaryDiv.querySelector(".summary-text");
    if (summaryText) {
      summaryText.innerHTML = `Showing <span id="${countId}">${count}</span> jobs${
        filter ? ` (${filter})` : ""
      }`;
    }
  }
}

// ---------------- Job Management ----------------
function selectJob(job, event) {
  selectedJob = job;

  document.querySelectorAll(".job-card.clickable").forEach((el) => {
    el.classList.remove("selected");
  });

  if (event && event.currentTarget) {
    event.currentTarget.classList.add("selected");
  }

  document.getElementById("jobActionsPanel").style.display = "block";
  document.getElementById("selectedJobDetails").innerHTML = `
    <h4>${job.title}</h4>
    <p class="job-description">${job.description}</p>
    <div class="job-meta">
      <p><strong>Customer:</strong> ${
        job.customer?.username || job.customer?.email || "N/A"
      }</p>
      <p><strong>Rate:</strong> ${job.rate ? `$${job.rate}` : "N/A"}</p>
      <p><strong>Status:</strong> <span class="status-badge ${
        job.status
      }">${job.status.toUpperCase()}</span></p>
      <p><strong>Created:</strong> ${new Date(
        job.createdAt
      ).toLocaleDateString()}</p>
      ${
        job.completedAt
          ? `<p><strong>Completed:</strong> ${new Date(
              job.completedAt
            ).toLocaleDateString()}</p>`
          : ""
      }
    </div>
  `;

  // Show/hide action buttons based on job status
  document.getElementById("acceptJobBtn").style.display =
    job.status === "pending" ? "inline-block" : "none";
  document.getElementById("declineJobBtn").style.display =
    job.status === "pending" ? "inline-block" : "none";
  document.getElementById("completeJobBtn").style.display =
    job.status === "accepted" ? "inline-block" : "none";

  // Show action history if available
  updateActionHistoryDisplay();
}

async function handleJobAction(action) {
  if (!selectedJob) {
    log("No job selected", "warning");
    return;
  }

  const serverUrl = document.getElementById("serverUrl").value;

  try {
    const response = await fetch(
      `${serverUrl}/api/jobs/${selectedJob._id}/${action}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${currentToken}` },
      }
    );

    const data = await response.json();
    if (response.ok) {
      const actionText =
        action === "accept"
          ? "accepted"
          : action === "decline"
          ? "declined"
          : "completed";
      log(`Job ${actionText} successfully`, "success");

      // Add to action history
      addToActionHistory(
        `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} job: ${
          selectedJob.title
        }`,
        "success"
      );

      // Refresh jobs and update UI
      await fetchAssignedJobs();

      // Update the selected job if it still exists
      const updatedJob = assignedJobs.find(
        (job) => job._id === selectedJob._id
      );
      if (updatedJob) {
        selectJob(updatedJob);
      } else {
        // Job no longer in current filter, hide action panel
        document.getElementById("jobActionsPanel").style.display = "none";
        selectedJob = null;
      }

      updateStatistics();
    } else {
      log(`Failed to ${action} job: ${data.error || data.message}`, "error");
    }
  } catch (err) {
    log(`Error: ${err.message}`, "error");
  }
}

// ---------------- Action History ----------------
function addToActionHistory(action, type) {
  const timestamp = new Date().toLocaleTimeString();
  actionHistory.unshift({ action, type, timestamp });

  // Keep only last 10 actions
  if (actionHistory.length > 10) {
    actionHistory = actionHistory.slice(0, 10);
  }
}

function updateActionHistoryDisplay() {
  const historyDiv = document.getElementById("actionHistory");
  const historyList = document.getElementById("actionHistoryList");

  if (!historyDiv || !historyList) return;

  if (actionHistory.length === 0) {
    historyDiv.style.display = "none";
    return;
  }

  historyDiv.style.display = "block";
  historyList.innerHTML = "";

  actionHistory.slice(0, 5).forEach((item) => {
    const entry = document.createElement("div");
    entry.className = `log-entry log-${item.type}`;
    entry.innerHTML = `<small>[${item.timestamp}]</small> ${item.action}`;
    historyList.appendChild(entry);
  });
}

// ---------------- Statistics ----------------
function updateStatistics() {
  const totalCreated = createdJobs.length;
  const totalAssigned = assignedJobs.length;
  const completed = [...createdJobs, ...assignedJobs].filter(
    (job) => job.status === "completed"
  ).length;
  const pending = [...createdJobs, ...assignedJobs].filter(
    (job) => job.status === "pending"
  ).length;

  // Update stat cards
  const statElements = {
    totalCreatedJobs: totalCreated,
    totalAssignedJobs: totalAssigned,
    completedJobs: completed,
    pendingJobs: pending,
  };

  Object.entries(statElements).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;

      // Add animation effect
      element.style.transform = "scale(1.1)";
      setTimeout(() => {
        element.style.transform = "scale(1)";
      }, 200);
    }
  });
}

// ---------------- Initialization ----------------
document.addEventListener("DOMContentLoaded", function () {
  log("Application initialized", "info");

  // Initialize any default values or setup
  const serverUrl = document.getElementById("serverUrl");
  if (serverUrl && !serverUrl.value) {
    serverUrl.value = "http://localhost:4000";
  }

  // Add transition effects
  document.body.style.transition = "all 0.3s ease";

  // Setup keyboard shortcuts
  document.addEventListener("keydown", function (e) {
    // Ctrl+Enter to create job (when in create tab and form is focused)
    if (e.ctrlKey && e.key === "Enter") {
      const activeTab = document.querySelector(".tab-content.active");
      if (activeTab && activeTab.id === "createTab") {
        const createBtn = document.getElementById("createJobBtn");
        if (createBtn && !createBtn.disabled) {
          e.preventDefault();
          createJob();
        }
      }
    }
  });

  // Auto-refresh jobs every 30 seconds if connected
  setInterval(() => {
    if (socket && socket.connected && currentToken) {
      const activeTab = document.querySelector(".tab-content.active");
      if (activeTab) {
        if (activeTab.id === "createTab") {
          fetchCreatedJobs();
        } else if (activeTab.id === "manageTab") {
          fetchAssignedJobs();
        }
      }
    }
  }, 30000);
});

// Add CSS transitions for smooth animations
const style = document.createElement("style");
style.textContent = `
  .job-card {
    transition: all 0.2s ease;
  }
  .stat-number {
    transition: transform 0.2s ease;
  }
  .notification-counter {
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
`;
document.head.appendChild(style);
