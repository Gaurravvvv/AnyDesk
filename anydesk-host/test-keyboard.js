const { keyboard, Key } = require('@nut-tree-fork/nut-js');

async function test() {
  console.log('Pressing A...');
  keyboard.config.autoDelayMs = 0;
  await keyboard.pressKey(Key.A);
  await keyboard.releaseKey(Key.A);
  console.log('Done!');
}

test().catch(console.error);
