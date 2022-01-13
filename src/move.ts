import { ascii, Length, Tools, Velocity } from '@zaber/motion';
import moment from 'moment';
import * as encoder from './encoder';
import { isCloseTo } from './utils';

const MIN_POSITION = 80;
const HOMING_POSITION = 50;
const SPEED = 7; // mm/s
const ACCEPTABLE_ERROR = 10;

let connection: ascii.Connection;
let device: ascii.Device;
let axis: ascii.Axis;

let lastHoming = moment();
let needsHoming = true;

export async function init() {
  const { ZABER_PORT } = process.env;
  if (!ZABER_PORT) {
    throw new Error('ZABER_PORT not specified');
  }

  connection = await ascii.Connection.openSerialPortDirectly(ZABER_PORT);
  device = (await connection.detectDevices())[0];
  axis = device.getAxis(1);

  const speed = await axis.settings.get('maxspeed', Velocity['mm/s']);
  if (!isCloseTo(speed, SPEED)) {
    console.log(`Setting speed ${speed} -> ${SPEED}`);
    await axis.settings.set('maxspeed', SPEED, Velocity['mm/s']);
  }
}

async function getEncoderPos(readings: number = 5) {
  return (await encoder.range(readings)) - MIN_POSITION;
}

export async function home() {
  const position = await getEncoderPos(10);
  await axis.settings.set('pos', position, Length.mm);

  await axis.moveAbsolute(HOMING_POSITION, Length.mm);
  const precisePosition = await getEncoderPos(10);
  await axis.settings.set('pos', precisePosition, Length.mm);
}

interface Position {
  position: number;
  encoder: number;
}

async function verifyPosition(): Promise<Position> {
  const encoderReading = await getEncoderPos();
  const position = await axis.getPosition(Length.mm);
  if (Math.abs(encoderReading - position) > ACCEPTABLE_ERROR) {
    console.warn(`Final position mismatch ${encoderReading} != ${position}`);
    // needsHoming = true;
  }
  return { position, encoder: encoderReading };
}

export async function move(position: number): Promise<Position> {
  await device.genericCommand('tools parking unpark');

  const now = moment();
  const noReference = (await axis.warnings.getFlags()).has('WR');
  const scheduledHoming = now.diff(lastHoming, 'h') > 12 && now.hour() >= 10;
  if (noReference || scheduledHoming || needsHoming) {
    lastHoming = now;
    needsHoming = false;
    await home();
  }

  await verifyPosition();
  await axis.moveAbsolute(position, Length.mm);
  const finalPosition = await verifyPosition();
  await device.genericCommand('tools parking park');
  return finalPosition;
}
