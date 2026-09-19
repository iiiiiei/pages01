/* 跨组件交互信号（demo-app 写入，compose/heat 场景消费） */
export const interactionState = {
  clickX: 0.5,
  clickY: 0.5,
  clickT: -10000, // performance.now() 毫秒
  hold: 0,        // 0..1（按住强度，平滑）
};
