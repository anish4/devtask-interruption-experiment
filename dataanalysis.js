const fs = require('fs');
const path = require('path');

// Path to your feedback file
const feedbackFile = path.join(__dirname, 'fds_feedback.json');

// Check if file exists
if (!fs.existsSync(feedbackFile)) {
  console.error("Feedback data file not found!");
  process.exit(1);
}

// Load data
const feedbackData = JSON.parse(fs.readFileSync(feedbackFile));

// Separate into Before and After groups
const beforeData = feedbackData.filter(f => f.feedbackType === 'before_interruption');
const afterData = feedbackData.filter(f => f.feedbackType === 'after_interruption');

// Calculate average FDS for Before group
const avgBefore = beforeData.length > 0
  ? (beforeData.reduce((sum, f) => sum + parseFloat(f.fdsAverage), 0) / beforeData.length).toFixed(2)
  : 'N/A';

// Calculate average FDS for After group
const avgAfter = afterData.length > 0
  ? (afterData.reduce((sum, f) => sum + parseFloat(f.fdsAverage), 0) / afterData.length).toFixed(2)
  : 'N/A';

// Calculate Delta
let delta = 'N/A';
if (avgBefore !== 'N/A' && avgAfter !== 'N/A') {
  delta = (avgAfter - avgBefore).toFixed(2);
}

// Output Summary
console.log("────────────────────────────────────────────────");
console.log("FDS Data Analysis Summary:");
console.log(`Total Records: ${feedbackData.length}`);
console.log(`Before Interruption Samples: ${beforeData.length}`);
console.log(`After Interruption Samples: ${afterData.length}`);
console.log("────────────────────────────────────────────────");
console.log(`Average FDS Score (Before Interruption): ${avgBefore}`);
console.log(`Average FDS Score (After Interruption): ${avgAfter}`);
console.log(`Delta (After - Before): ${delta}`);
console.log("────────────────────────────────────────────────");

// If you want, you can also list each entry
console.log("\nSample Records:");
feedbackData.forEach((f, idx) => {
  console.log(`#${idx + 1}: [${f.feedbackType}] Score: ${f.fdsAverage}`);
});
console.log("────────────────────────────────────────────────");
