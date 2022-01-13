import i2c from 'i2c-bus';
import { delay } from './utils';

const VL53L0X_REG_IDENTIFICATION_MODEL_ID         = 0xc0;
const VL53L0X_REG_IDENTIFICATION_REVISION_ID      = 0xc2;
const VL53L0X_REG_PRE_RANGE_CONFIG_VCSEL_PERIOD   = 0x50;
const VL53L0X_REG_FINAL_RANGE_CONFIG_VCSEL_PERIOD = 0x70;
const VL53L0X_REG_SYSRANGE_START                  = 0x00;
const VL53L0X_REG_RESULT_INTERRUPT_STATUS         = 0x13;
const VL53L0X_REG_RESULT_RANGE_STATUS             = 0x14;
const VL53L0X_ADDRESS                             = 0x29;
const VL53L0X_RESULT_SIZE = 12;

let bus: i2c.PromisifiedBus;

export async function init() {
  bus = await i2c.openPromisified(1);
}

export async function readDistance() {
  await bus.writeByte(VL53L0X_ADDRESS, VL53L0X_REG_SYSRANGE_START, 0x01);
  let attempt = 200;
  while(--attempt > 0) {
    const status = await bus.readByte(VL53L0X_ADDRESS, VL53L0X_REG_RESULT_RANGE_STATUS)
    if (status & 0x01) {
      break;
    }
    await delay(10);
  }
  if (attempt === 0) { throw new Error('Measuring failed') }

  const buffer = Buffer.alloc(VL53L0X_RESULT_SIZE);
  await bus.readI2cBlock(VL53L0X_ADDRESS, VL53L0X_REG_RESULT_RANGE_STATUS, VL53L0X_RESULT_SIZE, buffer);

  const distance = buffer.readUInt16BE(10);
  return distance;
}


export async function range(sampleCount: number) {
  const samples: number[] = [];
  for (let i = 0; i < sampleCount; i++) {
    samples.push(await readDistance());
  }
  samples.sort();
  if (sampleCount % 2 === 0) {
    return (samples[sampleCount / 2] + samples[sampleCount / 2 + 1]) / 2;
  } else {
    return samples[Math.floor(sampleCount / 2)];
  }
}
