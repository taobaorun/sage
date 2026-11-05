import identity from './book-title.json';
import { pendulumPeriod, leverEffort } from './lesson-math.js';

// Replace these two neutral examples with the new book's learning relationships.
// Content is plain text; UI code uses textContent rather than interpolated HTML.
export const book = {
  title: identity.title,
  subtitle: '',
  chapters: [
    {
      id: 'pendulum', title: '长一点，会怎样？', kicker: '01 · 摆与时间',
      question: '同样轻轻摆动，长摆和短摆谁更慢？',
      summary: '摆越长，往返一次需要的时间越长。',
      hint: '改变摆长，比较一次往返。', running: true,
      control: { label: '摆长', min: .45, max: 1.1, step: .05, initial: .8, unit: 'm' },
      readout: value => `一次往返约 ${pendulumPeriod(value).toFixed(2)} 秒`,
      reading: [
        '保持重力条件和较小的摆动幅度不变，改变摆长。先预测，再比较摆锤往返一次所需的时间。',
        '这是理想小角度单摆：T = 2π√(L/g)，这里 g 取 9.81 m/s²，振幅为 14°。模型忽略空气阻力、支架摩擦与绳的质量，读数使用小角度近似。',
        '摆长和周期不是线性关系：摆长变成四倍，周期约变成两倍。改变参数时保留相位，避免把动画突然跳动误认为物理结果。',
      ],
    },
    {
      id: 'lever', title: '离支点远一点', kicker: '02 · 杠杆与平衡',
      question: '同样的负载，怎样用更小的力保持平衡？',
      summary: '力臂更长，平衡所需的力更小。',
      hint: '移动右侧施力点，看所需的力。', running: false,
      control: { label: '右侧力臂', min: .6, max: 1.6, step: .05, initial: 1, unit: '倍' },
      readout: value => `平衡所需的力：${leverEffort(value).toFixed(2)} 倍`,
      reading: [
        '左侧负载和力臂都取 1 个单位，只改变右侧力臂。模型自动展示保持水平平衡所需的右侧作用力。',
        '理想静力平衡满足左力 × 左力臂 = 右力 × 右力臂，因此右力 = 1 / 右力臂。右侧示意砝码的体积随所需作用力变化；这不是随意改变负载的动力学动画。',
        '这个等效实验忽略杠杆自重和支点摩擦，单位为相对值。试着让右侧力臂变长，再预测所需的力如何变化。',
      ],
    },
  ],
};
