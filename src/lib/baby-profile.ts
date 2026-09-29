import type { BabyProfile } from '@/types/auth';

type BabyFields = {
  babyName: string | null;
  babyBirthDate: Date | null;
  babyWeight: number | null;
  babyHeight: number | null;
  babyGender: string | null;
  recommendedSize: string | null;
};

export function toBabyProfile(user: BabyFields): BabyProfile | null {
  if (!user.babyName) return null;
  return {
    name: user.babyName,
    birthDate: user.babyBirthDate?.toISOString().slice(0, 10),
    weight: user.babyWeight ?? 0,
    height: user.babyHeight ?? 0,
    gender: user.babyGender === 'be-gai' ? 'be-gai' : undefined,
    recommendedSize: user.recommendedSize ?? '',
  };
}
