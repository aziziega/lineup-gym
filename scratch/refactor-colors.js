const fs = require('fs');
const path = require('path');

const replacements = [
  [/bg-\[#1A1A1A\]/g, 'bg-card'],
  [/bg-\[#111\]/g, 'bg-background'],
  [/border-\[#2A2A2A\]/g, 'border-border'],
  [/text-\[#888\]/g, 'text-muted-foreground'],
  [/text-white/g, 'text-foreground'],
  [/text-\[#D4FF00\]/g, 'text-accent'],
  [/bg-\[#FF2A2A\]/g, 'bg-primary'],
  [/text-\[#FF2A2A\]/g, 'text-primary'],
  [/text-\[#555\]/g, 'text-muted-foreground/60'],
];

function walk(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      walk(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let changed = false;
      replacements.forEach(([regex, replacement]) => {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          changed = true;
        }
      });
      if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
      }
    }
  });
}

walk('app/dashboard');
walk('components');
