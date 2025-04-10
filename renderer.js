const { ipcRenderer } = require('electron');
const problems = require('./problems');

let currentTask = "";
let timeTaken = 0;

// Load a new coding task
function loadNewTask() {
    const randomIndex = Math.floor(Math.random() * problems.length);
    currentTask = problems[randomIndex];
    document.getElementById("task-description").innerText = currentTask.task;
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

    ipcRenderer.send("submit-solution", currentTask.functionName);
}

// Display test results
ipcRenderer.on("test-results", (event, results) => {
    const outputDiv = document.getElementById("output-container");
    outputDiv.innerHTML = "<h3>Results</h3>";

    if (results.error) {
        outputDiv.innerHTML += `<p style="color:red;">Error: ${results.error}</p>`;
    } else {
        results.forEach(test => {
            const resultText = test.passed ? "✅ Passed" : `❌ Failed (Expected: ${test.expected}, Got: ${test.output})`;
            outputDiv.innerHTML += `<p>Input: ${test.input} → ${resultText}</p>`;
        });
    }
});
