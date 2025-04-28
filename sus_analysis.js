// File: /Programmer-Interruption-Study/sus_analysis.js

const fs = require('fs');
const path = require('path');

const susFile = path.join(__dirname, 'sus_feedback.json');

if (!fs.existsSync(susFile)) {
  console.error("❌ SUS feedback file not found!");
  process.exit(1);
}

const susData = JSON.parse(fs.readFileSync(susFile));

if (susData.length === 0) {
  console.log("No SUS feedback data available.");
  process.exit(0);
}

console.log("────────────────────────────────────────────────");
console.log("SUS Data Analysis Summary:");

let totalSusScore = 0;

susData.forEach((entry, idx) => {
  const rawScore = entry.susAnswers.reduce((a, b, i) => {
    if (i % 2 === 0) { // Odd numbered questions (index 0,2,4,6,8)
      return a + (entry.susAnswers[i] - 1);
    } else {           // Even numbered questions
      return a + (5 - entry.susAnswers[i]);
    }
  }, 0);

  const susScore = rawScore * 2.5; // SUS formula
  totalSusScore += susScore;

  console.log(`#${idx + 1}: SUS Score = ${susScore.toFixed(2)}`);
});

const avgSus = (totalSusScore / susData.length).toFixed(2);

console.log("────────────────────────────────────────────────");
console.log(`Average SUS Score: ${avgSus}`);
console.log("────────────────────────────────────────────────");
