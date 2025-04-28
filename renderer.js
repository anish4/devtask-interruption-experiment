const { ipcRenderer } = require('electron');
const problems = require('./problems');
const snippets = require('./comprehensionSnippets');
const fs = require('fs');
const path = require('path');


// DOM Elements
let newTaskBtn, openVSBtn, submitSolutionBtn;
let taskDesc, timeBox, outputDiv;
let compSelect, loadCompBtn, submitCompBtn, compResults;
let testSelect, testOpenBtn, runTestsBtn, testResults;

// State
let currentTask = null;
let taskStartTime = null;
let comprehensionStart = null;
let testStartTime = null;
let currentMode = 'normal';
let interruptionInterval = null;
let currentTaskType = ''; 
const fdsQuestions = [
  "I can't stand it when things don't go the way I want.",
  "I become very frustrated when things aren't easy for me.",
  "I cannot tolerate feeling frustrated.",
  "I get very upset if things don't work out as planned.",
  "I feel like giving up easily when facing difficulty.",
  "I find it hard to deal with failure or mistakes."
];

const interruptionTypes = [
  { title: "Scheduled Meeting", message: "You have a client meeting in 5 minutes." },
  { title: "Phone Call", message: "Incoming call from your supervisor." },
  { title: "New Email", message: "Urgent email received from project manager." },
];

window.addEventListener('DOMContentLoaded', () => {
  // Mode Selection
  const modeSelector = document.getElementsByName('mode');
  modeSelector.forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentMode = e.target.value;
      console.log(`Mode changed to: ${currentMode}`);
      if (currentMode === 'interruption') {
        startInterruptions();
        ipcRenderer.send('set-interruption-mode', true); // ✅ Tell backend to allow interruptions
      } else {
        stopInterruptions();
        ipcRenderer.send('set-interruption-mode', false); // ✅ Tell backend to block manual interruptions
      }
    });
  });

  // Coding Module
  newTaskBtn = document.getElementById('btn-new-task');
  openVSBtn = document.getElementById('btn-open-vscode');
  submitSolutionBtn = document.getElementById('btn-submit-solution');
  taskDesc = document.getElementById('task-description');
  timeBox = document.getElementById('completion-time');
  outputDiv = document.getElementById('output-container');


  document.getElementById('btn-analyze-fds').addEventListener('click', analyzeFDS);
  document.getElementById('btn-analyze-sus').addEventListener('click', analyzeSUS);
  document.getElementById('btn-analyze-tlx').addEventListener('click', analyzeTLX);

  newTaskBtn.addEventListener('click', loadNewTask);
  openVSBtn.addEventListener('click', openInVSCode);
  submitSolutionBtn.addEventListener('click', submitSolution);

  // Code Comprehension Module
  compSelect = document.getElementById('comprehension-select');
  loadCompBtn = document.getElementById('btn-load-comprehension');
  submitCompBtn = document.getElementById('btn-submit-comprehension');
  compResults = document.getElementById('comprehension-results');

  loadCompBtn.addEventListener('click', loadComprehension);
  submitCompBtn.addEventListener('click', submitComprehension);

  snippets.forEach(sn => {
    const opt = document.createElement('option');
    opt.value = sn.id;
    opt.textContent = sn.description;
    compSelect.appendChild(opt);
  });

  // Testing Module
  testSelect = document.getElementById('testing-select');
  testOpenBtn = document.getElementById('btn-open-testing');
  runTestsBtn = document.getElementById('btn-run-tests');
  testResults = document.getElementById('testing-results');

  document.getElementById('btn-analyze-task-metrics').addEventListener('click', analyzeTaskMetrics);


  testOpenBtn.addEventListener('click', () => {
    const fn = testSelect.value;
    if (!fn) return alert('Please select a function first.');
    testResults.innerHTML = '';
    testStartTime = Date.now();
    ipcRenderer.send('open-testing', fn);
  });

  runTestsBtn.addEventListener('click', () => {
    const fn = testSelect.value;
    if (!fn) return alert('No function selected.');
    ipcRenderer.send('run-testing', fn);
  });

  // Start interruption system
  startInterruptions();
  //fds setup
  const fdsButton = document.getElementById('btn-record-fds');
  fdsButton.addEventListener('click', () => {
    showFDSModal();
  });
  // SUS Button
document.getElementById('btn-record-sus').addEventListener('click', () => {
  showSUSModal();
});

// TLX Button
document.getElementById('btn-record-tlx').addEventListener('click', () => {
  showTLXModal();
});

  // Attach submit event on FDS form
  const fdsForm = document.getElementById('fds-form');
  fdsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const phaseType = document.getElementById('fds-type').value;
    if (!phaseType) {
      alert('Please select if this is Before or After Interruption.');
      return;
    }
    const formData = new FormData(e.target);
    const answers = [];

    for (let pair of formData.entries()) {
      answers.push(parseInt(pair[1]));
    }
    const avgScore = (answers.reduce((a,b) => a+b, 0) / answers.length).toFixed(2);
    const feedback = {
      timestamp: new Date().toISOString(),
      mode: currentMode || 'normal',
      module: currentTaskType || 'general',
      fdsAnswers: answers,
      fdsAverage: avgScore,
      feedbackType:phaseType
    };

    ipcRenderer.send('save-fds-feedback', feedback);

    document.getElementById('fds-modal').style.display = 'none';
    showThankYou();
  });
  // SUS Form Submit
document.getElementById('sus-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const answers = [];
  for (let pair of formData.entries()) {
    answers.push(parseInt(pair[1]));
  }

  const feedback = {
    timestamp: new Date().toISOString(),
    mode: currentMode,
    module: currentTaskType || 'general',
    susAnswers: answers
  };

  ipcRenderer.send('save-sus-feedback', feedback);

  document.getElementById('sus-modal').style.display = 'none';
  showThankYou();
});

// TLX Form Submit
document.getElementById('tlx-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const ratings = [];
  for (let pair of formData.entries()) {
    ratings.push(parseInt(pair[1]));
  }

  const feedback = {
    timestamp: new Date().toISOString(),
    mode: currentMode,
    module: currentTaskType || 'general',
    tlxRatings: ratings
  };

  ipcRenderer.send('save-tlx-feedback', feedback);

  document.getElementById('tlx-modal').style.display = 'none';
  showThankYou();
});
});
//saving metrices
function saveTaskMetric(metricData) {
  ipcRenderer.send('save-task-metric', metricData);
}

//fds logic
function showFDSModal() {
  const modal = document.getElementById('fds-modal');
  const form = document.getElementById('fds-form');
  const questionsDiv = document.getElementById('fds-questions');

  // Clear previous questions
  questionsDiv.innerHTML = '';

  // Now render each question
  fdsQuestions.forEach((q, idx) => {
    const container = document.createElement('div');
    container.style.marginBottom = "15px";

    const question = document.createElement('p');
    question.textContent = `${idx + 1}. ${q}`;
    question.style.fontWeight = "bold";

    container.appendChild(question);

    for (let i = 1; i <= 5; i++) {
      const label = document.createElement('label');
      label.style.marginRight = '10px';
      label.innerHTML = `<input type="radio" name="q${idx}" value="${i}" required> ${i}`;
      container.appendChild(label);
    }

    questionsDiv.appendChild(container);
  });

  modal.style.display = 'block';
}

function showSUSModal() {
  const modal = document.getElementById('sus-modal');
  const questionsDiv = document.getElementById('sus-questions');
  questionsDiv.innerHTML = '';

  const susQuestions = [
    "I think that I would like to use this system frequently.",
    "I found the system unnecessarily complex.",
    "I thought the system was easy to use.",
    "I think that I would need the support of a technical person to use this system.",
    "I found the various functions in this system were well integrated.",
    "I thought there was too much inconsistency in this system.",
    "I would imagine that most people would learn to use this system very quickly.",
    "I found the system very cumbersome to use.",
    "I felt very confident using the system.",
    "I needed to learn a lot of things before I could get going with this system."
  ];

  susQuestions.forEach((q, idx) => {
    const container = document.createElement('div');
    container.style.marginBottom = "20px";

    const question = document.createElement('p');
    question.textContent = `${idx + 1}. ${q}`;
    question.style.fontWeight = 'bold';

    container.appendChild(question);

    for (let i = 1; i <= 5; i++) {
      const label = document.createElement('label');
      label.style.marginRight = '10px';
      label.innerHTML = `<input type="radio" name="q${idx}" value="${i}" required> ${i}`;
      container.appendChild(label);
    }

    questionsDiv.appendChild(container);
  });

  modal.style.display = 'block';
}

function showTLXModal() {
  const modal = document.getElementById('tlx-modal');
  const questionsDiv = document.getElementById('tlx-questions');
  questionsDiv.innerHTML = '';

  const tlxFactors = [
    "Mental Demand",
    "Physical Demand",
    "Temporal Demand",
    "Performance",
    "Effort",
    "Frustration"
  ];

  tlxFactors.forEach((factor, idx) => {
    const container = document.createElement('div');
    container.style.marginBottom = "20px";

    const question = document.createElement('p');
    question.textContent = `${idx + 1}. Rate your "${factor}" from 1 (Low) to 5 (High)`;
    question.style.fontWeight = 'bold';

    container.appendChild(question);

    for (let i = 1; i <= 5; i++) {
      const label = document.createElement('label');
      label.style.marginRight = '10px';
      label.innerHTML = `<input type="radio" name="q${idx}" value="${i}" required> ${i}`;
      container.appendChild(label);
    }

    questionsDiv.appendChild(container);
  });

  modal.style.display = 'block';
}

function showThankYou() {
  document.getElementById('thankyou-modal').style.display = 'block';
}

// Close Thank You Modal
function closeThankYou() {
  document.getElementById('thankyou-modal').style.display = 'none';
}

//testmetrices
function analyzeTaskMetrics() {
  const output = document.getElementById('analysis-results');
  const file = path.join(__dirname, 'task_metrics.json');

  if (!fs.existsSync(file)) {
    output.innerHTML = "<p style='color:red;'>No Task Metrics data found yet.</p>";
    return;
  }

  const data = JSON.parse(fs.readFileSync(file));
  if (data.length === 0) {
    output.innerHTML = "<p style='color:red;'>No task metrics recorded yet.</p>";
    return;
  }

  const modules = ["coding", "comprehension", "testing"];
  const modes = ["normal", "interruption"];

  let html = "<h3>Task Metrics Analysis</h3>";

  modules.forEach(module => {
    modes.forEach(mode => {
      const filtered = data.filter(d => d.module === module && d.mode === mode);
      if (filtered.length === 0) return;

      const avgTime = (filtered.reduce((sum, d) => sum + parseFloat(d.completionTimeSec), 0) / filtered.length).toFixed(2);
      const avgAcc = (filtered.reduce((sum, d) => sum + parseFloat(d.accuracyPercent), 0) / filtered.length).toFixed(2);
      const avgErr = (filtered.reduce((sum, d) => sum + parseFloat(d.errorRatePercent), 0) / filtered.length).toFixed(2);

      html += `
        <h4>${module.toUpperCase()} (${mode} Mode)</h4>
        <ul>
          <li>Average Completion Time: ${avgTime} seconds</li>
          <li>Average Accuracy: ${avgAcc}%</li>
          <li>Average Error Rate: ${avgErr}%</li>
        </ul>
      `;
    });
  });

  output.innerHTML = html;
}

// ───────────────────────────────────────────────
// Coding Module Logic
function loadNewTask() {
  const idx = Math.floor(Math.random() * problems.length);
  currentTask = problems[idx];
  taskDesc.textContent = currentTask.task;
  timeBox.textContent = '';
  outputDiv.innerHTML = '';
  taskStartTime = Date.now();
}

function openInVSCode() {
  if (!currentTask) return alert('Please click "New Task" first.');
  ipcRenderer.send('open-vscode', currentTask);
}

function submitSolution() {
  if (!currentTask) return alert('No task loaded.');
  if (!taskStartTime) return alert('Timer not started. Click "New Task" again.');
  const elapsed = ((Date.now() - taskStartTime) / 1000).toFixed(2);
  timeBox.textContent = `⏱️ Completion Time: ${elapsed} s`;
  ipcRenderer.send('submit-solution', currentTask.functionName);
}

ipcRenderer.on('test-results', (event, data) => {
  outputDiv.innerHTML = '<h3>Results</h3>';
  if (data.error) {
    outputDiv.innerHTML += `<p style="color:red;">Error: ${data.error}</p>`;
    return;
  }

  const { results, metrics } = data;
  results.forEach(r => {
    const status = r.passed
      ? '✅ Passed'
      : `❌ Failed (Expected: ${r.expected}, Got: ${r.output})`;
    outputDiv.innerHTML += `<p>Input: ${r.input} → ${status}</p>`;
  });

  outputDiv.innerHTML += `
    <p><strong>Accuracy:</strong> ${metrics.accuracy}%</p>
    <p><strong>Error Rate:</strong> ${metrics.errorRate}%</p>
    <p><strong>Passed:</strong> ${metrics.passedCount}/${metrics.totalTests}</p>
  `;
  const metricData = {
    timestamp: new Date().toISOString(),
    module: "coding",
    mode: currentMode,
    taskName: currentTask.task || "Unknown Task",
    completionTimeSec: ((Date.now() - taskStartTime) / 1000).toFixed(2),
    accuracyPercent: metrics.accuracy,
    errorRatePercent: metrics.errorRate
  };
  saveTaskMetric(metricData);
});

// ───────────────────────────────────────────────
// Code Comprehension Module Logic
function loadComprehension() {
  const id = compSelect.value;
  if (!id) return alert('Please select a snippet.');
  const snippet = snippets.find(s => s.id === id);
  if (!snippet) return;

  compResults.innerHTML = '';
  ipcRenderer.send('open-comprehension', snippet);
  comprehensionStart = Date.now();
}

function submitComprehension() {
  const id = compSelect.value;
  if (!id) return alert('No snippet loaded.');
  const snippet = snippets.find(s => s.id === id);
  if (!snippet) return;
  ipcRenderer.send('submit-comprehension', snippet);
}

ipcRenderer.on('comprehension-results', (event, payload) => {
  compResults.innerHTML = '';
  if (payload.error) {
    compResults.innerHTML = `<p style="color:red;">${payload.error}</p>`;
    return;
  }

  const elapsed = ((Date.now() - comprehensionStart) / 1000).toFixed(2);
  const totalTests = payload.results.length;
  const passedTests = payload.results.filter(t => t.passed).length;
  const accuracy = ((passedTests / totalTests) * 100).toFixed(2);
  const errorRate = (100 - accuracy).toFixed(2);

  let html = `
    <p>⏱️ Fix Time: ${elapsed} s</p>
    <p>✅ Accuracy: ${accuracy}%</p>
    <p>❌ Error Rate: ${errorRate}%</p>
    <p>Passed: ${passedTests}/${totalTests}</p>
    <ul>
  `;

  payload.results.forEach(r => {
    if (r.error) {
      html += `<li>Test "${r.test}": ⚠️ ${r.error}</li>`;
    } else {
      html += `<li>Test "${r.test}": ${r.passed ? '✅ Passed' : '❌ Failed'}</li>`;
    }
  });

  html += '</ul>';
  compResults.innerHTML = html;
  const metricData = {
    timestamp: new Date().toISOString(),
    module: "comprehension",
    mode: currentMode,
    taskName: "Comprehension Snippet",
    completionTimeSec: elapsed,
    accuracyPercent: accuracy,
    errorRatePercent: errorRate
  };
  saveTaskMetric(metricData);
});

// ───────────────────────────────────────────────
// Testing Module Logic
ipcRenderer.on('testing-results', (_evt, payload) => {
  testResults.innerHTML = '';
  if (payload.error) {
    testResults.innerHTML = `<p style="color:red;">${payload.error}</p>`;
    return;
  }

  const totalTests = payload.results.length;
  const passedTests = payload.results.filter(t => t.passed).length;
  const elapsed = testStartTime ? ((Date.now() - testStartTime) / 1000).toFixed(2) : 'N/A';
  const accuracy = ((passedTests / totalTests) * 100).toFixed(2);
  const errorRate = (100 - accuracy).toFixed(2);

  let html = `
    <p>⏱️ Test Writing Time: ${elapsed} s</p>
    <p>✅ Accuracy: ${accuracy}%</p>
    <p>❌ Error Rate: ${errorRate}%</p>
    <p>Passed: ${passedTests}/${totalTests}</p>
    <ul>
  `;

  payload.results.forEach(r => {
    if (r.error) {
      html += `<li>${r.line} → ⚠️ ${r.error}</li>`;
    } else {
      html += `<li>${r.line} → ${r.passed ? '✅ Passed' : '❌ Failed'}</li>`;
    }
  });

  html += '</ul>';
  testResults.innerHTML = html;
  const metricData = {
    timestamp: new Date().toISOString(),
    module: "testing",
    mode: currentMode,
    taskName: "Test Writing",
    completionTimeSec: elapsed,
    accuracyPercent: accuracy,
    errorRatePercent: errorRate
  };
  saveTaskMetric(metricData);
});

// ───────────────────────────────────────────────
// Interruption System
function startInterruptions() {
  if (interruptionInterval) clearInterval(interruptionInterval);
  interruptionInterval = setInterval(() => {
    if (currentMode === 'interruption') {
      triggerRandomInterruption();
    }
  }, 20000); 
}

function stopInterruptions() {
  if (interruptionInterval) {
    clearInterval(interruptionInterval);
    interruptionInterval = null;
  }
}

function triggerRandomInterruption() {
  if (currentMode !== 'interruption') return;
  const random = interruptionTypes[Math.floor(Math.random() * interruptionTypes.length)];

  // Instead of generic trigger, send specific type
  ipcRenderer.send('trigger-custom-interruption', random);
}

// Analyze FDS Feedback
function analyzeFDS() {
  const output = document.getElementById('analysis-results');
  const file = path.join(__dirname, 'fds_feedback.json');

  if (!fs.existsSync(file)) {
    output.innerHTML = "<p style='color:red;'>No FDS data found.</p>";
    return;
  }

  const data = JSON.parse(fs.readFileSync(file));
  const before = data.filter(d => d.feedbackType === 'before_interruption');
  const after = data.filter(d => d.feedbackType === 'after_interruption');

  const avgBefore = before.length > 0 ? (before.reduce((sum, d) => sum + parseFloat(d.fdsAverage), 0) / before.length).toFixed(2) : 'N/A';
  const avgAfter = after.length > 0 ? (after.reduce((sum, d) => sum + parseFloat(d.fdsAverage), 0) / after.length).toFixed(2) : 'N/A';
  const delta = (avgBefore !== 'N/A' && avgAfter !== 'N/A') ? (avgAfter - avgBefore).toFixed(2) : 'N/A';

  output.innerHTML = `
    <h3>FDS Analysis</h3>
    <p><strong>Average FDS (Before Interruption):</strong> ${avgBefore}</p>
    <p><strong>Average FDS (After Interruption):</strong> ${avgAfter}</p>
    <p><strong>Delta (After - Before):</strong> ${delta}</p>
  `;
}

// Analyze SUS Feedback
function analyzeSUS() {
  const output = document.getElementById('analysis-results');
  const file = path.join(__dirname, 'sus_feedback.json');

  if (!fs.existsSync(file)) {
    output.innerHTML = "<p style='color:red;'>No SUS data found.</p>";
    return;
  }

  const data = JSON.parse(fs.readFileSync(file));

  let totalScore = 0;
  data.forEach(entry => {
    const raw = entry.susAnswers.reduce((sum, score, idx) => {
      return sum + (idx % 2 === 0 ? (score - 1) : (5 - score));
    }, 0);
    totalScore += raw * 2.5;
  });

  const avgSUS = (totalScore / data.length).toFixed(2);

  output.innerHTML = `
    <h3>SUS Analysis</h3>
    <p><strong>Average SUS Score:</strong> ${avgSUS}</p>
    <p><strong>Interpretation:</strong> ${interpretSUS(avgSUS)}</p>
  `;
}

// Analyze TLX Feedback
function analyzeTLX() {
  const output = document.getElementById('analysis-results');
  const file = path.join(__dirname, 'tlx_feedback.json');

  if (!fs.existsSync(file)) {
    output.innerHTML = "<p style='color:red;'>No TLX data found.</p>";
    return;
  }

  const data = JSON.parse(fs.readFileSync(file));
  const sums = new Array(6).fill(0);

  data.forEach(entry => {
    entry.tlxRatings.forEach((rating, idx) => {
      sums[idx] += rating;
    });
  });

  const avgs = sums.map(sum => (sum / data.length).toFixed(2));
  const overall = (avgs.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / avgs.length).toFixed(2);

  output.innerHTML = `
    <h3>NASA-TLX Analysis</h3>
    <ul>
      <li>Mental Demand: ${avgs[0]}</li>
      <li>Physical Demand: ${avgs[1]}</li>
      <li>Temporal Demand: ${avgs[2]}</li>
      <li>Performance: ${avgs[3]}</li>
      <li>Effort: ${avgs[4]}</li>
      <li>Frustration: ${avgs[5]}</li>
    </ul>
    <p><strong>Overall Workload Index:</strong> ${overall}</p>
  `;
}

// Helper function to interpret SUS score
function interpretSUS(score) {
  score = parseFloat(score);
  if (score >= 85) return "Excellent Usability 🚀";
  if (score >= 70) return "Good Usability ✅";
  if (score >= 50) return "OK Usability ⚠️";
  return "Poor Usability ❌";
}