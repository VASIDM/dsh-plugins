import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('client.js', 'utf8');
const before = t;
let n = 0;
const swap = (oldText, newText) => {
  if (!t.includes(oldText)) throw new Error('missing: ' + oldText.slice(0, 70));
  t = t.replace(oldText, newText);
  n += 1;
};

swap(
  `      { id: 'hard', label: '困难', clues: 32, level: 3, effort: 3, note: '常规高难' },
      { id: 'expert', label: '专家', clues: 28, level: 4, effort: 8, note: '多步试错' },
      { id: 'master', label: '大师', clues: 24, level: 6, effort: 16, note: '硬核' },`,
  `      { id: 'hard', label: 'Hard', clues: 32, level: 3, effort: 3, note: 'Standard hard' },
      { id: 'expert', label: 'Expert', clues: 28, level: 4, effort: 8, note: 'Multi-step' },
      { id: 'master', label: 'Master', clues: 24, level: 6, effort: 16, note: 'Brutal' },`,
);

swap(`      if (unit.every((i) => rowOf(i) === row)) return '第' + (row + 1) + '行';
      if (unit.every((i) => colOf(i) === col)) return '第' + (col + 1) + '列';
      return '第' + (boxOf(unit[0]) + 1) + '宫';`,
  `      if (unit.every((i) => rowOf(i) === row)) return 'row ' + (row + 1);
      if (unit.every((i) => colOf(i) === col)) return 'column ' + (col + 1);
      return 'box ' + (boxOf(unit[0]) + 1);`);

swap(
  `      record('初始', '初始盘面', '共 ' + puzzle.filter((value) => value !== 0).length + ' 个已给数字。先看唯一候选与隐藏唯一，再做数对、区块与 X-Wing 排除。', [], 0);`,
  `      record('Initial', 'Initial grid', 'Given ' + puzzle.filter((value) => value !== 0).length + ' digits. Start with naked/hidden singles, then pairs, pointing and X-Wing.', [], 0);`,
);
swap(
  `                record('数对', '显性数对：' + unitName(unit), '在' + unitName(unit) + '中，' + cellName(cells[0]) + ' 与 ' + cellName(cells[1]) + ' 都只剩 ' + bitsOf(ca).join('、') + ' 两个候选。这两个数必然占住这两格，所以同单元的其它格可以排除 ' + bitsOf(ca).join('、') + '（共 ' + removed + ' 处）。', cells, 0);`,
  `                record('Naked pair', 'Naked pair: ' + unitName(unit), 'In ' + unitName(unit) + ', ' + cellName(cells[0]) + ' and ' + cellName(cells[1]) + ' have exactly ' + bitsOf(ca).join(' and ') + ' as candidates. Those two digits must occupy these two cells, so they can be removed from the rest of the unit (' + removed + ' cells).', cells, 0);`,
);
swap(
  `                record('区块', '区块指向：第' + (row + 1) + '行', '在第' + (box + 1) + '宫中，' + d + ' 只可能出现在第' + (row + 1) + '行（' + spots.map(cellName).join('、') + '）。因此这一行的 ' + d + ' 必在该宫内，行内其它格的 ' + d + ' 可以排除（' + removed + ' 处）。', spots, 0);`,
  `                record('Pointing', 'Pointing: row ' + (row + 1), 'In box ' + (box + 1) + ', ' + d + ' can only appear in row ' + (row + 1) + ' (' + spots.map(cellName).join(', ') + '). So the ' + d + ' in that row must lie inside this box, and can be removed from the rest of the row (' + removed + ' cells).', spots, 0);`,
);
swap(
  `                record('区块', '区块指向：第' + (col + 1) + '列', '在第' + (box + 1) + '宫中，' + d + ' 只可能出现在第' + (col + 1) + '列（' + spots.map(cellName).join('、') + '）。列内其它格的 ' + d + ' 因此可以排除（' + removed + ' 处）。', spots, 0);`,
  `                record('Pointing', 'Pointing: column ' + (col + 1), 'In box ' + (box + 1) + ', ' + d + ' can only appear in column ' + (col + 1) + ' (' + spots.map(cellName).join(', ') + '). So the ' + d + ' in that column must lie inside this box, and can be removed from the rest of the column (' + removed + ' cells).', spots, 0);`,
);
swap(
  `              record('区块', '行列区块：' + unitName(unit), '在' + unitName(unit) + '中，' + d + ' 只能落在第' + (box + 1) + '宫（' + spots.map(cellName).join('、') + '）。宫内的 ' + d + ' 因此锁定在这一' + (unit.length === 9 && rowOf(unit[0]) === rowOf(unit[1]) ? '行' : '列') + '上，宫内其它格的 ' + d + ' 可以排除（' + removed + ' 处）。', spots, 0);`,
  `              record('Box/line', 'Box/line: ' + unitName(unit), 'In ' + unitName(unit) + ', ' + d + ' can only fall inside box ' + (box + 1) + ' (' + spots.map(cellName).join(', ') + '). The ' + d + ' in that box is therefore locked to this ' + (rowOf(unit[0]) === rowOf(unit[1]) ? 'row' : 'column') + ', so other cells in the box can lose ' + d + ' (' + removed + ' cells).', spots, 0);`,
);
swap(
  `                record('X-Wing', 'X-Wing：' + d, '数字 ' + d + ' 在第' + (first.r + 1) + '行与第' + (second.r + 1) + '行都只剩两个位置，且列相同（第' + (first.cols[0] + 1) + '、' + (first.cols[1] + 1) + '列）。这四个位置构成矩形，其中两格必为 ' + d + '，因此这两列其它行的 ' + d + ' 可以排除（' + removed + ' 处）。', cells, 0);`,
  `                record('X-Wing', 'X-Wing: ' + d, 'Digit ' + d + ' has only two positions in row ' + (first.r + 1) + ' and row ' + (second.r + 1) + ', and they share the same columns (' + (first.cols[0] + 1) + ', ' + (first.cols[1] + 1) + '). These four cells form a rectangle with two ' + d + 's, so ' + d + ' can be removed from the other rows in those columns (' + removed + ' cells).', cells, 0);`,
);
swap(
  `            record('唯一候选', '唯一候选：' + cellName(i), cellName(i) + ' 所在的行、列、宫已经出现除 ' + digit + ' 以外的全部数字，因此这一格只能填 ' + digit + '。', [i], digit);`,
  `            record('Naked single', 'Naked single: ' + cellName(i), cellName(i) + ' has only ' + digit + ' left once its row, column and box are considered.', [i], digit);`,
);
swap(
  `              record('隐藏唯一', '隐藏唯一：' + cellName(index) + ' = ' + d, '在' + unitName(unit) + '里，数字 ' + d + ' 只有 ' + cellName(index) + ' 一个可行位置（其余空格都被已填数字排除），所以这里必填 ' + d + '。', [index], d);`,
  `              record('Hidden single', 'Hidden single: ' + cellName(index) + ' = ' + d, 'In ' + unitName(unit) + ', ' + d + ' fits only in ' + cellName(index) + '; every other empty cell is excluded, so ' + d + ' must go there.', [index], d);`,
);
swap(
  `        record('试探', '试探：' + cellName(best) + ' = ' + digit, '唯一候选、隐藏唯一、数对、区块与 X-Wing 都无法推进。选候选最少的 ' + cellName(best) + '（' + bestCount + ' 个候选）试填 ' + digit + '，沿该分支推演可解，因此成立；若后续出现矛盾则回退换下一个候选。', [best], digit);`,
  `        record('Trial', 'Trial: ' + cellName(best) + ' = ' + digit, 'Naked/hidden singles, pairs, pointing and X-Wing cannot advance. Take the cell with the fewest candidates, ' + cellName(best) + ' (' + bestCount + ' candidates), and try ' + digit + '; this branch is solvable, so it stands. Backtrack and try another candidate if it later contradicts.', [best], digit);`,
);

swap(`        title: '数独 · 本地生成',
        'aria-label': '打开数独',`, `        title: 'Sudoku · generated locally',
        'aria-label': 'Open Sudoku',`);
swap(`      wide ? h('span', null, '数独') : null);`, `      wide ? h('span', null, 'Sudoku') : null);`);

swap(`'aria-label': '数独', 'data-theme': theme },`, `'aria-label': 'Sudoku', 'data-theme': theme },`);
swap(`h('span', { className: 'sdk-seal' }, '数'),`, `h('span', { className: 'sdk-seal' }, '9'),`);
swap(`              h('b', null, '数独'),
              h('span', null, difficulty.label + ' · ' + (walk ? '解答回放' : '试错 ' + (game.effort || 0) + ' 步') + ' · 最佳 ' + (best[game.difficulty] ? fmtTime(best[game.difficulty]) : '—'))),`,
  `              h('b', null, 'Sudoku'),
              h('span', null, difficulty.label + ' · ' + (walk ? 'Replay' : 'Trials ' + (game.effort || 0)) + ' · Best ' + (best[game.difficulty] ? fmtTime(best[game.difficulty]) : '—'))),`);
swap(`title: paused ? '继续' : '暂停', 'aria-label': paused ? '继续' : '暂停'`, `title: paused ? 'Resume' : 'Pause', 'aria-label': paused ? 'Resume' : 'Pause'`);
swap(`title: ui.minimized ? '展开' : '收起', 'aria-label': ui.minimized ? '展开' : '收起'`, `title: ui.minimized ? 'Expand' : 'Collapse', 'aria-label': ui.minimized ? 'Expand' : 'Collapse'`);
swap(`title: '关闭', 'aria-label': '关闭数独'`, `title: 'Close', 'aria-label': 'Close Sudoku'`);
swap(`'aria-label': '难度'`, `'aria-label': 'Difficulty'`);
swap(`onClick: () => newGame(game.difficulty) }, '换一题'),`, `onClick: () => newGame(game.difficulty) }, 'New puzzle'),`);
swap(`onClick: restart }, '重来')),`, `onClick: restart }, 'Restart')),`);
swap(`              h('span', null, '用时 ', h('b', null, fmtTime(game.elapsed))),
              h('span', null, '线索 ', h('b', null, String(game.clueCount || '—'))),
              h('span', null, '错误 ', h('b', null, String(game.mistakes))),
              h('span', null, '提示 ', h('b', null, String(game.hints)))),`,
  `              h('span', null, 'Time ', h('b', null, fmtTime(game.elapsed))),
              h('span', null, 'Clues ', h('b', null, String(game.clueCount || '—'))),
              h('span', null, 'Errors ', h('b', null, String(game.mistakes))),
              h('span', null, 'Hints ', h('b', null, String(game.hints)))),`);
swap(`'aria-label': walk ? '解答棋盘' : '数独棋盘'`, `'aria-label': walk ? 'Solution board' : 'Sudoku board'`);
swap(`'aria-label': '第' + (cellRow + 1) + '行第' + (cellCol + 1) + '列' + (value ? '，' + value : '，空'),`,
  `'aria-label': 'Row ' + (cellRow + 1) + ', column ' + (cellCol + 1) + (value ? ', ' + value : ', empty'),`);
swap(`h('div', { className: 'sdk-spin' }), '正在本地生成题目…')`, `h('div', { className: 'sdk-spin' }), 'Generating puzzle…')`);
swap(`                h('strong', null, '完成'),
                h('span', null, '用时 ' + fmtTime(game.elapsed) + ' · 提示 ' + game.hints + ' 次'),`,
  `                h('strong', null, 'Solved'),
                h('span', null, 'Time ' + fmtTime(game.elapsed) + ' · Hints ' + game.hints),`);
swap(`onClick: () => newGame(game.difficulty) }, '再来一局'),`, `onClick: () => newGame(game.difficulty) }, 'New puzzle'),`);
swap(`onClick: () => setShowWin(false) }, '看看棋盘')))`, `onClick: () => setShowWin(false) }, 'View board')))`);
swap(`h('span', null, '第 ' + (walk.index + 1) + ' / ' + walk.steps.length + ' 步' + (walkStep.digit ? ' · 填入 ' + walkStep.digit : '') + (walk.solved ? '' : ' · 未完成'))),`,
  `h('span', null, 'Step ' + (walk.index + 1) + ' / ' + walk.steps.length + (walkStep.digit ? ' · place ' + walkStep.digit : '') + (walk.solved ? '' : ' · incomplete'))),`);
swap(`onClick: () => setWalk((c) => ({ ...c, index: 0 })) }, '首步'),`, `onClick: () => setWalk((c) => ({ ...c, index: 0 })) }, 'First'),`);
swap(`onClick: () => stepWalk(-1) }, '上一步'),`, `onClick: () => stepWalk(-1) }, 'Prev'),`);
swap(`onClick: () => stepWalk(1) }, '下一步'),`, `onClick: () => stepWalk(1) }, 'Next'),`);
swap(`onClick: () => setWalk((c) => ({ ...c, index: c.steps.length - 1 })) }, '末步'),`,
  `onClick: () => setWalk((c) => ({ ...c, index: c.steps.length - 1 })) }, 'Last'),`);
swap(`onClick: () => setWalk(null) }, '退出')))`, `onClick: () => setWalk(null) }, 'Exit')))`);

swap(`applyValue(selected, 0), disabled: selected < 0 || generating || paused }, '擦除'`, `applyValue(selected, 0), disabled: selected < 0 || generating || paused }, 'Erase'`);
swap(`notesMode ? '笔记 开' : '笔记'`, `notesMode ? 'Notes on' : 'Notes'`);
swap(`autoNotes ? '候选 开' : '候选'`, `autoNotes ? 'Candidates on' : 'Candidates'`);
swap(`onClick: undo, disabled: generating || undoRef.current.length === 0 }, '撤销'`, `onClick: undo, disabled: generating || undoRef.current.length === 0 }, 'Undo'`);
swap(`onClick: redo, disabled: generating || redoRef.current.length === 0 }, '重做'`, `onClick: redo, disabled: generating || redoRef.current.length === 0 }, 'Redo'`);
swap(`onClick: hint, disabled: generating || game.done }, '提示'`, `onClick: hint, disabled: generating || game.done }, 'Hint'`);
swap(`onClick: check, disabled: generating || game.done }, '检查'`, `onClick: check, disabled: generating || game.done }, 'Check'`);
swap(`onClick: startWalk, disabled: generating || game.done }, '完整解答'`, `onClick: startWalk, disabled: generating || game.done }, 'Solution'`);

swap(`title: '拖动缩放（保持比例）'`, `title: 'Resize (keeps ratio)'`);
swap(`          label: () => '数独',`, `          label: () => 'Sudoku',`);

writeFileSync('client.js', t, 'utf8');
console.log('replacements', n, 'remaining CJK', (t.match(/[\u4e00-\u9fa5]/g) || []).length);
