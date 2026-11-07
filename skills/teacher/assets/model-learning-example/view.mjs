export const title = '两位调用者怎样完成加一';
const words = { ready: '准备读取', read: '已读待写', done: '完成' };
export const state = (v) => [
  v.pc.every((p) => p === 'done') ? '两位都完成' : '执行中',
  `计数 ${v.n}\nA ${words[v.pc[0]]}\nB ${words[v.pc[1]]}`,
];
export const step = (action, from, to) => {
  if (action === 'Done') return '保持完成状态';
  if (action === 'Stuttering') return '暂不前进';
  const who = from.pc.findIndex((p, i) => p !== to.pc[i]);
  const actor = who === 0 ? 'A' : 'B';
  return to.pc[who] === 'read'
    ? `${actor} 读到 ${to.seen[who]}`
    : `${actor} 将读到的值加一，写入 ${to.n}`;
};
