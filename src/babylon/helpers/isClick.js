export function isClick(pointerDownTime, pointerDownPos, evt) {
    const elapsed = performance.now() - pointerDownTime;
  
    const dx = evt.clientX - pointerDownPos.x;
    const dy = evt.clientY - pointerDownPos.y;
  
    const dist = Math.sqrt(dx * dx + dy * dy);
  
    const MAX_CLICK_TIME = 300;
    const MAX_MOVE_DIST = 5;
  
    return elapsed < MAX_CLICK_TIME && dist < MAX_MOVE_DIST;
  }
  