#!/usr/bin/env node
// Syncs Mission Control todos into each project's CLAUDE.md
//
// Single-project mode (legacy):
//   echo '{"path":"~/project","todos":["a","b"]}' | node write-todos.cjs
//
// Sync-all mode:
//   echo '{"~/proj1":["a"],"~/proj2":["b","c"]}' | node write-todos.cjs --sync-all

const fs = require('fs');
const path = require('path');

const START = '<!-- MC-TODOS-START -->';
const END = '<!-- MC-TODOS-END -->';

function writeTodos(projectPath, todos) {
  const resolved = projectPath.replace(/^~/, process.env.HOME);
  const claudeMd = path.join(resolved, 'CLAUDE.md');

  let section = `${START}\n`;
  if (todos.length > 0) {
    section += `## Current Priorities (Mission Control)\n`;
    todos.forEach((t) => { section += `- [ ] ${t}\n`; });
  }
  section += END;

  let content = '';
  if (fs.existsSync(claudeMd)) {
    content = fs.readFileSync(claudeMd, 'utf8');
    const startIdx = content.indexOf(START);
    const endIdx = content.indexOf(END);
    if (startIdx !== -1 && endIdx !== -1) {
      content = content.slice(0, startIdx) + section + content.slice(endIdx + END.length);
    } else {
      content = content.trimEnd() + '\n\n' + section + '\n';
    }
  } else {
    content = section + '\n';
  }

  fs.writeFileSync(claudeMd, content);
  return claudeMd;
}

const syncAll = process.argv.includes('--sync-all');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    if (syncAll) {
      // data = { "~/path1": ["todo1"], "~/path2": ["todo2", "todo3"] }
      let count = 0;
      for (const [projectPath, todos] of Object.entries(data)) {
        const file = writeTodos(projectPath, todos);
        console.log(`  Synced ${todos.length} todo(s) -> ${file}`);
        count++;
      }
      console.log(`Done: synced ${count} project(s)`);
    } else {
      // Legacy single-project mode
      const { path: projectPath, todos } = data;
      const file = writeTodos(projectPath, todos);
      console.log(`Synced ${todos.length} todo(s) to ${file}`);
    }
  } catch (err) {
    console.error('write-todos error:', err.message);
    process.exit(1);
  }
});
