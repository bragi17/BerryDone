// 修复 Commissions.vue 文件
const fs = require('fs');
const path = require('path');

const filePath = 'src/renderer/src/views/Commissions.vue';
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// 找到关键行
const loadingLineIndex = lines.findIndex(l => l.includes('loading-container'));
console.log('Loading container at line:', loadingLineIndex + 1);

// 找到第一个 empty-state 或 services-container
let endLineIndex = -1;
for (let i = loadingLineIndex + 1; i < lines.length; i++) {
  if (lines[i].includes('v-else-if') && lines[i].includes('filteredServices')) {
    endLineIndex = i;
    console.log('Found end at line:', endLineIndex + 1);
    break;
  }
}

if (loadingLineIndex !== -1 && endLineIndex !== -1) {
  // 保留 loading-container 的完整结构（3行）
  // 然后直接跳到 empty-state
  const goodLines = [
    ...lines.slice(0, loadingLineIndex),
    '    <div v-if="loading" class="loading-container">',
    '      <n-spin size="large" />',
    '      <p>加载中...</p>',
    '    </div>',
    '',
    ...lines.slice(endLineIndex)
  ];

  const newContent = goodLines.join('\n');
  fs.writeFileSync(filePath, newContent, 'utf-8');
  console.log('✅ File fixed successfully!');
  console.log(`Removed lines ${loadingLineIndex + 2} to ${endLineIndex}`);
} else {
  console.log('❌ Could not find required lines');
}
