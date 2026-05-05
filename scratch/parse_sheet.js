const fs = require('fs');
const { execSync } = require('child_process');

function getXMLPart(partName) {
  return execSync(`unzip -p "E-commerce Shipping Weight & Volume Master V2.xlsx" ${partName}`).toString();
}

const sharedStringsXML = getXMLPart('xl/sharedStrings.xml');
const sheet1XML = getXMLPart('xl/worksheets/sheet1.xml');

const strings = [];
const siRegex = /<si>([\s\S]*?)<\/si>/g;
const tRegex = /<t[^>]*>([\s\S]*?)<\/t>/;
let siMatch;
while ((siMatch = siRegex.exec(sharedStringsXML)) !== null) {
  const tMatch = tRegex.exec(siMatch[1]);
  strings.push(tMatch ? tMatch[1] : '');
}

const rows = [];
const rowRegex = /<row.*?>([\s\S]*?)<\/row>/g;
const cellRegex = /<c r="([A-Z]+)[0-9]+"([^>]*?)>([\s\S]*?)<\/c>/g;
const typeRegex = /t="s"/;
const vRegex = /<v>(.*?)<\/v>/;

let rowMatch;
while ((rowMatch = rowRegex.exec(sheet1XML)) !== null) {
  const rowContent = rowMatch[1];
  const row = {};
  let cellMatch;
  while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
    const col = cellMatch[1];
    const attrs = cellMatch[2];
    const content = cellMatch[3];
    const isString = typeRegex.test(attrs);
    const vMatch = vRegex.exec(content);
    if (vMatch) {
      const val = vMatch[1];
      row[col] = isString ? strings[parseInt(val)] : parseFloat(val);
    }
  }
  if (Object.keys(row).length > 0) rows.push(row);
}

const data = rows.slice(1).map(r => ({
  category: r.A,
  subcategory: r.B,
  billedWeight: r.J
})).filter(r => r.category && r.subcategory);

const result = {};
data.forEach(item => {
  if (!result[item.category]) result[item.category] = {};
  result[item.category][item.subcategory] = item.billedWeight;
});

fs.writeFileSync('shipping_data.json', JSON.stringify(result, null, 2));
console.log('Successfully generated shipping_data.json');
