import fs from 'fs';
const text = fs.readFileSync('eslint-report.json', 'utf8');
const jsonText = text.substring(text.indexOf('['));
const report = JSON.parse(jsonText);
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

fs.writeFileSync('eslint-summary.json', JSON.stringify(summary, null, 2));
