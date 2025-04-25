// File: /Programmer-Interruption-Study/renderer.js
const { ipcRenderer } = require('electron');
const problems = require('./problems');
const snippets = require('./comprehensionSnippets');

// DOM Elements (will be assigned once DOM is ready)
let newTaskBtn, openVSBtn, submitSolutionBtn;
let taskDesc, timeBox, outputDiv;
let compSelect, loadCompBtn, submitCompBtn, compResults;

// State
let currentTask = null;
let taskStartTime = null;
let comprehensionStart = null;

window.addEventListener('DOMContentLoaded', () => {
  // Coding Module Elements
  newTaskBtn = document.getElementById('btn-new-task');
  openVSBtn = document.getElementById('btn-open-vscode');
  submitSolutionBtn = document.getElementById('btn-submit-solution');
  taskDesc = document.getElementById('task-description');
  timeBox = document.getElementById('completion-time');
  outputDiv = document.getElementById('output-container');

  // Code Comprehension Elements
  compSelect = document.getElementById('comprehension-select');
  loadCompBtn = document.getElementById('btn-load-comprehension');
  submitCompBtn = document.getElementById('btn-submit-comprehension');
  compResults = document.getElementById('comprehension-results');

  // Attach event listeners
  newTaskBtn.addEventListener('click', loadNewTask);
  openVSBtn.addEventListener('click', openInVSCode);
  submitSolutionBtn.addEventListener('click', submitSolution);

  loadCompBtn.addEventListener('click', loadComprehension);
  submitCompBtn.addEventListener('click', submitComprehension);

  // Populate comprehension dropdown
  snippets.forEach(sn => {
    const opt = document.createElement('option');
    opt.value = sn.id;
    opt.textContent = sn.description;
    compSelect.appendChild(opt);
  });
});

// ------------------------------
// Coding Module Functions
// ------------------------------
function loadNewTask() {
  // Pick a random problem
  const idx = Math.floor(Math.random() * problems.length);
  currentTask = problems[idx];

  // Update UI
  taskDesc.textContent = currentTask.task;
  timeBox.textContent = '';
  outputDiv.innerHTML = '';

  // Start timer
  taskStartTime = Date.now();
}

function openInVSCode() {
  if (!currentTask) {
    alert('Please click "New Task" first.');
    return;
  }
  ipcRenderer.send('open-vscode', currentTask);
}

function submitSolution() {
  if (!currentTask) {
    alert('No task loaded.');
    return;
  }
  if (!taskStartTime) {
    alert('Timer not started. Click "New Task" again.');
    return;
  }

  // Calculate elapsed time
  const elapsed = ((Date.now() - taskStartTime) / 1000).toFixed(2);
  timeBox.textContent = `⏱️ Completion Time: ${elapsed} s`;

  // Send for evaluation
  ipcRenderer.send('submit-solution', currentTask.functionName);
}

// Receive test results
ipcRenderer.on('test-results', (event, data) => {
  outputDiv.innerHTML = '<h3>Results</h3>';
  if (data.error) {
    outputDiv.innerHTML += `<p style="color:red;">Error: ${data.error}</p>`;
    return;
  }

  const { results, metrics } = data;
  results.forEach(r => {
    const status = r.passed ? '✅ Passed' : `❌ Failed (Expected: ${r.expected}, Got: ${r.output})`;
    outputDiv.innerHTML += `<p>Input: ${r.input} → ${status}</p>`;
  });
  outputDiv.innerHTML += `
    <p><strong>Accuracy:</strong> ${metrics.accuracy}%</p>
    <p><strong>Error Rate:</strong> ${metrics.errorRate}%</p>
    <p><strong>Passed:</strong> ${metrics.passedCount}/${metrics.totalTests}</p>
  `;
});

// --------------------------------
// Code Comprehension Module
// --------------------------------
function loadComprehension() {
  const id = compSelect.value;
  if (!id) {
    alert('Please select a snippet.');
    return;
  }
  const snippet = snippets.find(s => s.id === id);
  if (!snippet) return;

  // Clear previous results
  compResults.innerHTML = '';

  // Open snippet in VS Code
  ipcRenderer.send('open-comprehension', snippet);

  // Start timer for fix time
  comprehensionStart = Date.now();
}

function submitComprehension() {
  const id = compSelect.value;
  if (!id) {
    alert('No snippet loaded.');
    return;
  }
  const snippet = snippets.find(s => s.id === id);
  if (!snippet) return;

  // Send snippet and tests for validation
  ipcRenderer.send('submit-comprehension', snippet);
}

// Receive comprehension results
ipcRenderer.on('comprehension-results', (event, payload) => {
  compResults.innerHTML = '';
  if (payload.error) {
    compResults.innerHTML = `<p style="color:red;">${payload.error}</p>`;
    return;
  }

  // Calculate fix time
  const elapsed = ((Date.now() - comprehensionStart) / 1000).toFixed(1);
  let html = `<p>Fix Time: ${elapsed} s</p><ul>`;
  payload.results.forEach(r => {
    if (r.error) {
      html += `<li>Test "${r.test}": ⚠️ ${r.error}</li>`;
    } else {
      html += `<li>Test "${r.test}": ${r.passed ? '✅ Passed' : '❌ Failed'}</li>`;
    }
  });
  html += '</ul>';

  compResults.innerHTML = html;
});
