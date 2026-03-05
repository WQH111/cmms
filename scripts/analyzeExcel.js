// 分析 Excel 模板结构
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelPath = path.join(__dirname, '../../CMMS Master Data Standards Appendix A - PTLNG FLNG FLOC Level 5_Rev.01.xlsx');

try {
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  console.log('=== Excel 模板分析 ===\n');
  console.log('工作表名称:', sheetName);
  console.log('工作表数量:', workbook.SheetNames.length);

  // 获取数据范围
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  console.log('\n数据范围:', worksheet['!ref']);
  console.log('行数:', range.e.r + 1);
  console.log('列数:', range.e.c + 1);

  // 读取表头（第一行）
  console.log('\n=== 表头字段 ===');
  const headers = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    const cell = worksheet[cellAddress];
    const header = cell ? cell.v : '';
    headers.push(header);
    console.log(`列 ${col + 1}: ${header}`);
  }

  // 读取前 3 行数据作为示例
  console.log('\n=== 前 3 行数据示例 ===');
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  jsonData.slice(0, 4).forEach((row, idx) => {
    console.log(`\n第 ${idx + 1} 行:`, JSON.stringify(row, null, 2));
  });

  // 输出字段映射建议
  console.log('\n=== 字段映射建议 ===');
  console.log('总字段数:', headers.length);
  console.log('建议映射到 TreeNode 的字段:');
  headers.forEach((header, idx) => {
    if (header.toLowerCase().includes('level')) {
      console.log(`  - ${header} (列 ${idx + 1}) -> level`);
    }
    if (header.toLowerCase().includes('name') || header.toLowerCase().includes('description')) {
      console.log(`  - ${header} (列 ${idx + 1}) -> name/description`);
    }
    if (header.toLowerCase().includes('code') || header.toLowerCase().includes('id')) {
      console.log(`  - ${header} (列 ${idx + 1}) -> code`);
    }
    if (header.toLowerCase().includes('system')) {
      console.log(`  - ${header} (列 ${idx + 1}) -> system/subSystem`);
    }
  });

} catch (error) {
  console.error('读取 Excel 文件失败:', error.message);
}
