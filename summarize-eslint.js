const fs = require('fs');
const report = JSON.parse(fs.readFileSync('eslint-report.json', 'utf8'));
const summary = {};

report.forEach(file => {
  if (file.errorCount === 0 && file.warningCount === 0) return;
  const filePath = file.filePath.replace(process.cwd() + '/', '');
  
  file.messages.forEach(msg => {
    if (!summary[filePath]) summary[filePath] = {};
    if (!summary[filePath][msg.ruleId]) summary[filePath][msg.ruleId] = 0;
    summary[filePath][msg.ruleId]++;
  });
});

console.log(JSON.stringify(summary, null, 2));
