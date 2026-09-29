import test from 'node:test';
import assert from 'node:assert/strict';
import { toBabyProfile } from '../src/lib/baby-profile.ts';

test('saved baby data returns to the authenticated session without invented measurements', () => {
  assert.deepEqual(toBabyProfile({ babyName: 'Bé An', babyBirthDate: new Date('2024-01-02T00:00:00Z'), babyWeight: 0, babyHeight: 0, babyGender: 'be-gai', recommendedSize: null }), {
    name: 'Bé An', birthDate: '2024-01-02', weight: 0, height: 0, gender: 'be-gai', recommendedSize: '',
  });
  assert.equal(toBabyProfile({ babyName: null, babyBirthDate: null, babyWeight: null, babyHeight: null, babyGender: null, recommendedSize: null }), null);
});
