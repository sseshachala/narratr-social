import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOrThrow } from '@/lib/http/validation';
import { z } from 'zod';

const rangeSchema = z.object({ range: z.enum(['7d', '30d']).default('7d') });

test('defaults range to 7d', () => {
  const value = parseOrThrow(rangeSchema, {});
  assert.equal(value.range, '7d');
});

test('accepts 30d range', () => {
  const value = parseOrThrow(rangeSchema, { range: '30d' });
  assert.equal(value.range, '30d');
});
