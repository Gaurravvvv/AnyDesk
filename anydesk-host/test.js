const { mouse, Point } = require('@nut-tree-fork/nut-js');
mouse.config.mouseSpeed = 1000;
mouse.config.autoDelayMs = 0;

async function test() {
  console.log('Testing mouse move to 100, 100');
  await mouse.setPosition(new Point(100, 100));
  console.log('Mouse moved');
  
  console.log('Testing mouse move to 500, 500');
  await mouse.setPosition(new Point(500, 500));
  console.log('Mouse moved');
}

test().catch(console.error);
