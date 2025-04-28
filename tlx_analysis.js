// File: /Programmer-Interruption-Study/tlx_analysis.js

const fs = require('fs');
const path = require('path');

const tlxFile = path.join(__dirname, 'tlx_feedback.json');

if (!fs.existsSync(tlxFile)) {
  console.error("❌ TLX feedback file not found!");
  process.exit(1);
}

const tlxData = JSON.parse(fs.readFileSync(tlxFile));

if (tlxData.length === 0) {
  console.log("No TLX feedback data available.");
  process.exit(0);
}

console.log("────────────────────────────────────────────────");
console.log("NASA-TLX Data Analysis Summary:");

const factorNames = [
  "Mental Demand",
  "Physical Demand",
  "Temporal Demand",
  "Performance",
  "Effort",
  "Frustration"
];

let factorSums = new Array(factorNames.length).fill(0);

tlxData.forEach((entry, idx) => {
  entry.tlxRatings.forEach((rating, i) => {
    factorSums[i] += rating;
  });
});

const avgRatings = factorSums.map(sum => (sum / tlxData.length).toFixed(2));

factorNames.forEach((name, i) => {
  console.log(`${name}: Average Rating = ${avgRatings[i]}`);
});

console.log("────────────────────────────────────────────────");

const overallAvg = (avgRatings.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / avgRatings.length).toFixed(2);
console.log(`Overall Workload Index (Average of all factors): ${overallAvg}`);
console.log("────────────────────────────────────────────────");
