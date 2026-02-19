import fs from 'fs';

try {
  // 1. 讀取 Word 檔案 (請確保檔名和您放進去的完全一致)
  const fileBuffer = fs.readFileSync('./記帳工作單-測試.docx');
  
  // 2. 轉成最乾淨、沒有任何前綴的 Base64
  const base64String = fileBuffer.toString('base64');
  
  // 3. 組合出 TypeScript 檔案的內容
  const fileContent = `export const WORK_ORDER_TEMPLATE_BASE64 = "${base64String}";\n`;
  
  // 4. 直接寫入到 src 資料夾中覆蓋舊的 wordTemplate.ts
  fs.writeFileSync('./src/wordTemplate.ts', fileContent);
  
  console.log('🎉 轉換成功！完美的 src/wordTemplate.ts 已經建立好了！趕快去按按鈕吧！');
} catch (error) {
  console.error('❌ 發生錯誤：請確認「記帳工作單-測試.docx」是否放在正確的位置。', error.message);
}
