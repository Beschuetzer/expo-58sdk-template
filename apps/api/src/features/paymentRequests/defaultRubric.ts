import type { RubricQuestion } from '@expo-50sdk-template/shared-types';

export const DEFAULT_RUBRIC_QUESTIONS: RubricQuestion[] = [
  {
    id: 'necessary',
    label: 'Is this purchase necessary?',
    answerType: 'boolean',
    weight: 1,
    required: true,
  },
  {
    id: 'beneficiary',
    label: 'Who benefits from this purchase?',
    answerType: 'single_choice',
    options: ['both', 'creator', 'other_members'],
    weight: 1,
    required: true,
  },
];
