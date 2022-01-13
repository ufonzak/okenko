import * as encoder from './encoder';
import * as move from './move';
import * as temperature from './temperature';
import * as pid from './pid';

async function main() {
  await encoder.init();
  await move.init();
  await temperature.init();
  await pid.init();

  await pid.process();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
