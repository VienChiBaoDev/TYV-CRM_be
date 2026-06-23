const XLSX = require('xlsx');

const workbook = XLSX.readFile('/Users/macbook/TalentManagement/TalentManagement_BE/rewards.xlsx');

const sheetsToDump = ['QUY ĐỊNH CHUNG', 'Thưởng team traffic', 'Thưởng phòng kinh doanh', 'KINH DOANH - đã check', 'TECH - đã check'];

for (const name of sheetsToDump) {
  console.log(`\n=== Sheet: ${name} ===`);
  const sheet = workbook.Sheets[name];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // read as raw arrays of rows
  console.log(`Total Rows: ${data.length}`);
  for (let i = 0; i < Math.min(15, data.length); i++) {
    console.log(`Row ${i}:`, JSON.stringify(data[i]));
  }
}
