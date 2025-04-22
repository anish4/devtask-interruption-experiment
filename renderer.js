const { ipcRenderer } = require('electron');
const problems = require('./problems');

let currentTask = "";
let startTime = null;

// Load a new coding task
function loadNewTask() {
    const randomIndex = Math.floor(Math.random() * problems.length);
    currentTask = problems[randomIndex];
    document.getElementById("task-description").innerText = currentTask.task;
    startTime = new Date(); // ⏱️ Start the timer
}

// Open the task in VS Code
function openInVSCode() {
    if (!currentTask) {
        alert("Please load a task first!");
        return;
    }

    ipcRenderer.send("open-vscode", currentTask);
}

// Submit solution for testing
function submitSolution() {
    if (!currentTask) {
        alert("Please load a task first!");
        return;
    }

    if (!startTime) {
        alert("Please start a task first.");
        return;
    }

    const endTime = new Date(); // ⏱️ Stop the timer
    const completionTime = ((endTime - startTime) / 1000).toFixed(2); // seconds

    // Display completion time
    const timeBox = document.getElementById("completion-time");
    timeBox.innerText = `⏱️ Completion Time: ${completionTime} seconds`;

    // Send for testing
    ipcRenderer.send("submit-solution", currentTask.functionName);
}

// Display test results
ipcRenderer.on("test-results", (event, data) => {
    const {results, metrics} = data
    const outputDiv = document.getElementById("output-container");

    if (!outputDiv) return;

    outputDiv.innerHTML = "<h3>Results</h3>";

    if (results.error) {
        outputDiv.innerHTML += `<p style="color:red;">Error: ${results.error}</p>`;
    } else {
        results.forEach(test => {
            const resultText = test.passed ? "✅ Passed" : `❌ Failed (Expected: ${test.expected}, Got: ${test.output})`;
            outputDiv.innerHTML += `<p>Input: ${test.input} → ${resultText}</p>`;
        });
        outputDiv.innerHTML += `
        <p><strong>Accuracy:</strong> ${metrics.accuracy}%</p>
        <p><strong>Error Rate:</strong> ${metrics.errorRate}%</p>
        <p><strong>Passed:</strong> ${metrics.passedCount}/${metrics.totalTests}</p>
    `;
        
    }
});
