import { Tools } from '@zaber/motion';
import SerialPort from 'serialport';
import { lastValueFrom, Subject, take, timeout } from 'rxjs';
import { delay } from './utils';

let port: SerialPort;
const lines = new Subject<string>();

export async function init() {
  const { TEMP_PORT } = process.env;
  if (!TEMP_PORT) {
    throw new Error('TEMP_PORT not specified');
  }

  const readline = new SerialPort.parsers.Readline({ delimiter: '\n' });
  port = new SerialPort(TEMP_PORT);
  port.on('error', err => lines.error(err));
  readline.on('data', line => lines.next(line.trim()));
  port.pipe(readline);

  await delay(5000);
}

export async function read() {
  const promise = lastValueFrom(lines.pipe(take(1), timeout(1000)));
  port.write('/\n');
  const value = +(await promise) / 100;
  if (!Number.isFinite(value)) {
    throw new Error('Temperature N/A');
  }
  return value;
}
