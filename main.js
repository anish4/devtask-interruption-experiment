// File: /Programmer-Interruption-Study/main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const problems = require('./problems');
let snippets = [];
const snippetsPath = path.join(__dirname, 'comprehensionSnippets.js');
if (fs.existsSync(snippetsPath)) {
  snippets = require(snippetsPath);
} else {
  console.warn('Warning: comprehensionSnippets.js not found. Comprehension module disabled.');
}

let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createMainWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (!mainWindow) createMainWindow();
});

// Coding Module Handlers
ipcMain.on('open-vscode', (event, task) => {
  const filePath = path.join(app.getPath('temp'), `${task.functionName}.js`);
  const template = `// Task: ${task.task}\nfunction ${task.functionName}(input) {\n  // Write your solution here\n}\nmodule.exports = ${task.functionName};\n`;
  fs.writeFileSync(filePath, template, 'utf8');
  exec(`code "${filePath}"`);
});

ipcMain.on('submit-solution', (event, functionName) => {
  const filePath = path.join(app.getPath('temp'), `${functionName}.js`);
  if (!fs.existsSync(filePath)) {
    return event.sender.send('test-results', { error: 'Solution file not found.' });
  }

  try {
    delete require.cache[require.resolve(filePath)];
    const userFn = require(filePath);
    const task = problems.find(p => p.functionName === functionName);
    if (!task) {
      return event.sender.send('test-results', { error: 'Problem definition not found.' });
    }

    let passedCount = 0;
    const results = [];
    task.testCases.forEach(tc => {
      try {
        const userOut = eval(`userFn(${tc.input})`);
        const expected = eval(tc.expected);
        const passed = (typeof expected === 'number')
          ? userOut === expected
          : JSON.stringify(userOut) === JSON.stringify(expected);
        if (passed) passedCount++;
        results.push({ input: tc.input, expected, output: userOut, passed });
      } catch (err) {
        results.push({ input: tc.input, error: err.message });
      }
    });

    const totalTests = task.testCases.length;
    const accuracy = ((passedCount / totalTests) * 100).toFixed(2);
    const errorRate = (100 - accuracy).toFixed(2);

    event.sender.send('test-results', {
      results,
      metrics: { totalTests, passedCount, accuracy, errorRate }
    });
  } catch (e) {
    event.sender.send('test-results', { error: e.message });
  }
});

// Comprehension Module Handlers
if (snippets.length > 0) {
  ipcMain.on('open-comprehension', (event, snippet) => {
    const filePath = path.join(app.getPath('temp'), 'comprehensionSnippet.js');
    const content = `// Fix the bugs below:\n${snippet.code}\n`;
    fs.writeFileSync(filePath, content, 'utf8');
    exec(`code "${filePath}"`);
  });

  ipcMain.on('submit-comprehension', (event, snippet) => {
    const filePath = path.join(app.getPath('temp'), 'comprehensionSnippet.js');
    if (!fs.existsSync(filePath)) {
      return event.sender.send('comprehension-results', { error: 'Snippet file not found.' });
    }

    let code = fs.readFileSync(filePath, 'utf8');
    code = code.replace(/module\.exports\s*=\s*\w+\s*;?/g, '');

    const results = [];
    for (const tc of snippet.tests) {
      try {
        const fn = new Function(code + `\nreturn ${tc.testExpression};`);
        results.push({ test: tc.testExpression, passed: fn() });
      } catch (err) {
        results.push({ test: tc.testExpression, error: err.message });
      }
    }
    event.sender.send('comprehension-results', { results });
  });
}
