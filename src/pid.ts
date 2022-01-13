import moment from 'moment';
import { delay, pn } from './utils';
import * as temperature from './temperature';
import * as move from './move';

const TARGET_DAY = (22.0);
const TARGET_NIGHT = (20.5);
const PID_POS_MIN = (0);
const PID_POS_MAX = (320);
const ANTI_WIND_UP = ((PID_POS_MAX - PID_POS_MIN) / 2);
const PID_P = (20.0);
const PID_I = (4.0);
const INTERVAL = 60 * 1000;
const MIN_MOVE = 10;

let iAccum = -ANTI_WIND_UP / PID_I;
let lastPosition = PID_POS_MAX;
let lastEncoderPosition = 0;

export async function init() {

}

function getTarget() {
  const now = moment();
  const hour = now.hour();
  if (hour >= 5 && hour < 21) {
    return TARGET_DAY;
  } else {
    return TARGET_NIGHT;
  }
}

export async function process() {
  while (true) {
    const current = await temperature.read();
    const error = current - getTarget();

    iAccum += error;
    if (iAccum * PID_I > ANTI_WIND_UP) {
      iAccum = ANTI_WIND_UP / PID_I;
    } else if (iAccum * PID_I < -ANTI_WIND_UP) {
      iAccum = -ANTI_WIND_UP / PID_I;
    }

    let position = PID_P * error + PID_I * iAccum;
    position = position + (PID_POS_MAX + PID_POS_MIN) / 2;

    const shouldMove = Math.abs(lastPosition - position) >= MIN_MOVE;

    if (position > PID_POS_MAX) {
      position = PID_POS_MAX;
    } else if (position < PID_POS_MIN) {
      position = PID_POS_MIN;
    }

    if (shouldMove && position !== lastPosition) {
      lastPosition = position;
      const finalPosition = await move.move(position);
      lastEncoderPosition = finalPosition.encoder;
    }

    console.log([
      current,
      error,
      PID_P * error,
      PID_I * iAccum,
      position,
      lastPosition,
      lastEncoderPosition,
    ].map(pn).join(' '));

    await delay(INTERVAL);
  }
}
