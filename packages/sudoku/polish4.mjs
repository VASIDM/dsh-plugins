import { readFileSync, writeFileSync } from 'node:fs';

let t = readFileSync('client.js', 'utf8');
const before = t;

t = t.replace(
  `      const startWalk = () => {
        if (!game.solution.some((value) => value !== 0)) return;`,
  `      const startWalk = () => {
        if (generating || walk) return;
        if (!game.solution.some((value) => value !== 0)) return;`,
);
t = t.replace(
  `                  disabled: Boolean(walk),
                  onClick: () => newGame(item.id),`,
  `                  disabled: Boolean(walk) || generating,
                  onClick: () => newGame(item.id),`,
);
t = t.replace(
  `              h('button', { type: 'button', className: 'sdk-btn accent', disabled: Boolean(walk), onClick: () => newGame(game.difficulty) }, '换一题'),
              h('button', { type: 'button', className: 'sdk-btn', disabled: Boolean(walk), onClick: restart }, '重来')),`,
  `              h('button', { type: 'button', className: 'sdk-btn accent', disabled: Boolean(walk) || generating, onClick: () => newGame(game.difficulty) }, '换一题'),
              h('button', { type: 'button', className: 'sdk-btn', disabled: Boolean(walk) || generating, onClick: restart }, '重来')),`,
);
t = t.replace(
  `                  h('button', { type: 'button', className: 'sdk-tool', onClick: () => applyValue(selected, 0), disabled: selected < 0 }, '擦除', h('small', null, '⌫')),
                  h('button', { type: 'button', className: 'sdk-tool' + (notesMode ? ' on' : ''), onClick: () => setNotesMode(!notesMode) }, notesMode ? '笔记 开' : '笔记', h('small', null, 'N')),
                  h('button', { type: 'button', className: 'sdk-tool' + (autoNotes ? ' on' : ''), onClick: () => setAutoNotes(!autoNotes) }, autoNotes ? '候选 开' : '候选', h('small', null, 'C')),
                  h('button', { type: 'button', className: 'sdk-tool', onClick: undo, disabled: undoRef.current.length === 0 }, '撤销', h('small', null, 'U')),
                  h('button', { type: 'button', className: 'sdk-tool', onClick: redo, disabled: redoRef.current.length === 0 }, '重做', h('small', null, 'Y')),
                  h('button', { type: 'button', className: 'sdk-tool', onClick: hint, disabled: game.done }, '提示', h('small', null, 'H')),
                  h('button', { type: 'button', className: 'sdk-tool', onClick: check, disabled: game.done }, '检查', h('small', null, 'K')),
                  h('button', { type: 'button', className: 'sdk-tool', onClick: startWalk, disabled: game.done }, '完整解答', h('small', null, 'E'))))),`,
  `                  h('button', { type: 'button', className: 'sdk-tool', onClick: () => applyValue(selected, 0), disabled: selected < 0 || generating || paused }, '擦除', h('small', null, '⌫')),
                  h('button', { type: 'button', className: 'sdk-tool' + (notesMode ? ' on' : ''), onClick: () => setNotesMode(!notesMode), disabled: generating }, notesMode ? '笔记 开' : '笔记', h('small', null, 'N')),
                  h('button', { type: 'button', className: 'sdk-tool' + (autoNotes ? ' on' : ''), onClick: () => setAutoNotes(!autoNotes), disabled: generating }, autoNotes ? '候选 开' : '候选', h('small', null, 'C')),
                  h('button', { type: 'button', className: 'sdk-tool', onClick: undo, disabled: generating || undoRef.current.length === 0 }, '撤销', h('small', null, 'U')),
                  h('button', { type: 'button', className: 'sdk-tool', onClick: redo, disabled: generating || redoRef.current.length === 0 }, '重做', h('small', null, 'Y')),
                  h('button', { type: 'button', className: 'sdk-tool', onClick: hint, disabled: generating || game.done }, '提示', h('small', null, 'H')),
                  h('button', { type: 'button', className: 'sdk-tool', onClick: check, disabled: generating || game.done }, '检查', h('small', null, 'K')),
                  h('button', { type: 'button', className: 'sdk-tool', onClick: startWalk, disabled: generating || game.done }, '完整解答', h('small', null, 'E'))))),`,
);
t = t.replace(
  `                    className: 'sdk-num' + (digitsLeft[d + 1] >= 9 ? ' done' : ''),
                    onClick: () => { if (selected >= 0) applyValue(selected, d + 1); },`,
  `                    className: 'sdk-num' + (digitsLeft[d + 1] >= 9 ? ' done' : ''),
                    disabled: generating,
                    onClick: () => { if (selected >= 0) applyValue(selected, d + 1); },`,
);
t = t.replace(
  `      const applyValue = (index, digit) => {
        const current = gameRef.current;
        if (current.done || walk || current.puzzle[index]) return;`,
  `      const applyValue = (index, digit) => {
        const current = gameRef.current;
        if (current.done || walk || generating || paused || current.puzzle[index]) return;`,
);

writeFileSync('client.js', t, 'utf8');
console.log('changed:', before !== t);
