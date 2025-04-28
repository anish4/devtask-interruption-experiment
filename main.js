const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const express = require('express');

const problems = require('./problems');
let snippets = [];
const snippetsPath = path.join(__dirname, 'comprehensionSnippets.js');
const feedbackFile = path.join(__dirname, 'fds_feedback.json');
const susFile = path.join(__dirname, 'sus_feedback.json');
const tlxFile = path.join(__dirname, 'tlx_feedback.json');
const metricsFile = path.join(__dirname, 'task_metrics.json');

if (fs.existsSync(snippetsPath)) {
  snippets = require(snippetsPath);
} else {
  console.warn('Warning: comprehensionSnippets.js not found.');
}

let mainWindow;
let interruptionEnabled = false; // Start in normal mode

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
function createInterruptionWindow(title, message) {
  const interruptionWindow = new BrowserWindow({
    width: 500,
    height: 300,
    alwaysOnTop: true,
    frame: true,
    transparent: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  interruptionWindow.loadURL(`file://${__dirname}/interruption.html?title=${encodeURIComponent(title)}&message=${encodeURIComponent(message)}`);

  setTimeout(() => {
    if (!interruptionWindow.isDestroyed()) {
      interruptionWindow.close();
    }
  }, 10000);
}

function startApiServer() {
  const apiApp = express();
  apiApp.use(express.json());

  apiApp.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  apiApp.post('/trigger-interruption', (req, res) => {
    if (!interruptionEnabled) {
        return res.status(403).send({ error: 'Interruptions are disabled in Normal Mode.' });
      }
    const type = req.body.type;
    let title = "Interruption", message = "You have been interrupted.";

    if (type === 'email') {
      title = "New Email Alert";
      message = "Urgent email received from Project Manager.";
    } else if (type === 'phone') {
      title = "Incoming Call";
      message = "Supervisor is calling you!";
    } else if (type === 'meeting') {
      title = "Scheduled Meeting";
      message = "Your scheduled meeting starts in 5 minutes.";
    }

    createInterruptionWindow(title, message);
    res.send({ status: 'Interruption triggered' });
  });

  apiApp.listen(5000, () => {
    console.log('✅ API server running on http://localhost:5000');
  });
}


app.whenReady().then(() => {
  createMainWindow();
  startApiServer();
  //startAutomaticInterruptions();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!mainWindow) createMainWindow(); });


ipcMain.on('save-task-metric', (event, metricData) => {
  console.log('Saving metric data:', metricData);
  let existing = [];
  if (fs.existsSync(metricsFile)) {
    existing = JSON.parse(fs.readFileSync(metricsFile));
  }
  existing.push(metricData);
  fs.writeFileSync(metricsFile, JSON.stringify(existing, null, 2));
});

ipcMain.on('set-interruption-mode', (event, enabled) => {
    interruptionEnabled = enabled;
    console.log(`Interruption Mode globally set to: ${enabled}`);
  });

ipcMain.on('save-fds-feedback', (event, feedback) => {
    let existing = [];
    if (fs.existsSync(feedbackFile)) {
      const data = fs.readFileSync(feedbackFile);
      existing = JSON.parse(data);
    }
    existing.push(feedback);
    fs.writeFileSync(feedbackFile, JSON.stringify(existing, null, 2));
  });

  ipcMain.on('save-sus-feedback', (event, feedback) => {
    let existing = [];
    if (fs.existsSync(susFile)) {
      existing = JSON.parse(fs.readFileSync(susFile));
    }
    existing.push(feedback);
    fs.writeFileSync(susFile, JSON.stringify(existing, null, 2));
  });
  
  ipcMain.on('save-tlx-feedback', (event, feedback) => {
    let existing = [];
    if (fs.existsSync(tlxFile)) {
      existing = JSON.parse(fs.readFileSync(tlxFile));
    }
    existing.push(feedback);
    fs.writeFileSync(tlxFile, JSON.stringify(existing, null, 2));
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
    if (!task) return event.sender.send('test-results', { error: 'Problem not found.' });

    let passedCount = 0;
    const results = [];
    task.testCases.forEach(tc => {
      try {
        const userOut = eval(`userFn(${tc.input})`);
        const expected = eval(tc.expected);
        const passed = typeof expected === 'number'
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

// Comprehension Handlers
if (snippets.length > 0) {
  ipcMain.on('open-comprehension', (event, snippet) => {
    const filePath = path.join(app.getPath('temp'), 'comprehensionSnippet.js');
    fs.writeFileSync(filePath, `// Fix the bugs below:\n${snippet.code}\n`, 'utf8');
    exec(`code "${filePath}"`);
  });

  ipcMain.on('submit-comprehension', (event, snippet) => {
    const filePath = path.join(app.getPath('temp'), 'comprehensionSnippet.js');
    if (!fs.existsSync(filePath)) {
      return event.sender.send('comprehension-results', { error: 'Snippet not found.' });
    }

    let code = fs.readFileSync(filePath, 'utf8').replace(/module\.exports\s*=\s*\w+\s*;?/g, '');
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


// Testing Handlers
ipcMain.on('open-testing', (event, fnName) => {
  const fnPath = path.join(__dirname, 'testing_functions', `${fnName}.js`);
  const tempTestPath = path.join(app.getPath('temp'), `${fnName}.test.js`);
  const targetFnPath = path.join(app.getPath('temp'), `${fnName}.js`);
  fs.copyFileSync(fnPath, targetFnPath);

  if (!fs.existsSync(tempTestPath)) {
    fs.writeFileSync(tempTestPath, `// Write tests using "${fnName}" below\n`, 'utf8');
  }
  exec(`code "${targetFnPath}" "${tempTestPath}"`);
});

ipcMain.on('run-testing', (event, fnName) => {
  const fnPath = path.join(app.getPath('temp'), `${fnName}.js`);
  const testPath = path.join(app.getPath('temp'), `${fnName}.test.js`);
  if (!fs.existsSync(fnPath) || !fs.existsSync(testPath)) {
    return event.sender.send('testing-results', { error: 'Missing function or test file.' });
  }

  try {
    delete require.cache[require.resolve(fnPath)];
    const fn = require(fnPath);
    const lines = fs.readFileSync(testPath, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('//'));

    const results = [];
    lines.forEach((line) => {
      try {
        const testFn = new Function('fn', `return ${line}`);
        const result = testFn(fn);
        results.push({ line: line.trim(), passed: result === true });
      } catch (err) {
        results.push({ line: line.trim(), error: err.message });
      }
    });

    event.sender.send('testing-results', { results });
  } catch (err) {
    event.sender.send('testing-results', { error: err.message });
  }
});

ipcMain.on('trigger-custom-interruption', (event, data) => {
    createInterruptionWindow(data.title, data.message);
  });
  