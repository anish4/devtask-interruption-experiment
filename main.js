const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const problems = require('./problems'); // Load coding problems

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
});

// Function to check if VS Code is installed
function isVSCodeInstalled(callback) {
    exec('code --version', (error, stdout, stderr) => {
        callback(!error);
    });
}

// Open a coding task in VS Code
ipcMain.on("open-vscode", (event, task) => {
    const taskFilePath = path.join(app.getPath('temp'), `${task.functionName}.js`);

    // Write task function template
    const fileContent = `
// Task: ${task.task}
function ${task.functionName}(input) {
    // Write your solution here
}

// Export the function for testing
module.exports = ${task.functionName};
    `;

    fs.writeFileSync(taskFilePath, fileContent);

    isVSCodeInstalled((installed) => {
        if (installed) {
            exec(`code "${taskFilePath}"`);
        } else {
            event.sender.send("vscode-error", "VS Code is not installed on your system.");
        }
    });
});

// Run test cases when user submits solution
ipcMain.on("submit-solution", (event, functionName) => {
    const taskFilePath = path.join(app.getPath('temp'), `${functionName}.js`);

    if (!fs.existsSync(taskFilePath)) {
        event.sender.send("test-results", { error: "Solution file not found!" });
        return;
    }

    try {
        delete require.cache[require.resolve(taskFilePath)]; // Clear require cache
        const userFunction = require(taskFilePath);  // Load user's function

        const task = problems.find(p => p.functionName === functionName);
        if (!task) {
            event.sender.send("test-results", { error: "Problem not found!" });
            return;
        }

        // Run test cases
        let results = [];
        let passedCount = 0;

        for (const test of task.testCases) {
            try {
                let userOutput = eval(`userFunction(${test.input})`);
                let expectedOutput = eval(test.expected);

                let passed = false;

                // Handle both numbers and strings correctly
                if (typeof expectedOutput === "number" && typeof userOutput === "number") {
                    passed = userOutput === expectedOutput; // Exact number comparison
                } else {
                    passed = JSON.stringify(userOutput) === JSON.stringify(expectedOutput); // String comparison
                }
                if (passed) passedCount++;

                results.push({
                    input: test.input,
                    expected: expectedOutput,
                    output: userOutput,
                    passed: passed
                });
            } catch (error) {
                results.push({ input: test.input, error: error.message });
            }
        }
        const totalTests = task.testCases.length;
        const accuracy = ((passedCount / totalTests) * 100).toFixed(2);
        const errorRate = (100 - accuracy).toFixed(2);

event.sender.send("test-results", {
    results,
    metrics: { accuracy, errorRate, totalTests, passedCount }
});
    } catch (error) {
        event.sender.send("test-results", { error: error.message });
    }
});
