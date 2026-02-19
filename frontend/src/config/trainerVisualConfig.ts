export interface TrainerVisualItem {
  id: string;
  displayName: string;
  styleLabelRu: string;
  intensity: number;
  hint: string;
  imagePath: string;
}

export interface TrainerSelectionState {
  trainerId: string;
}

const STORAGE_TRAINER_ID_KEY = 'selectedTrainerId';
const LEGACY_STORAGE_TRAINER_GENDER_KEY = 'selectedTrainerGender';

const makePublicImgPath = (filename: string): string => {
  const base = process.env.PUBLIC_URL || '';
  return `${base}/IMG/${filename}`;
};

export const trainerVisualCatalog: TrainerVisualItem[] = [
  {
    id: 'gentle_female',
    displayName: 'Riley Calm',
    styleLabelRu: 'Лайтовый',
    intensity: 42,
    hint: 'Когда важно держать ритм без давления.',
    imagePath: makePublicImgPath('gentle_female.png'),
  },
  {
    id: 'gentle_male',
    displayName: 'Noah Pace',
    styleLabelRu: 'Лайтовый',
    intensity: 48,
    hint: 'Когда нужен комфортный вход в режим.',
    imagePath: makePublicImgPath('gentle_male.png'),
  },
  {
    id: 'normal_female',
    displayName: 'Avery Balance',
    styleLabelRu: 'Нормальный',
    intensity: 68,
    hint: 'Когда нужен рабочий ритм без крайностей.',
    imagePath: makePublicImgPath('normal_female.png'),
  },
  {
    id: 'normal_male',
    displayName: 'Sam Focus',
    styleLabelRu: 'Нормальный',
    intensity: 72,
    hint: 'Когда важна предсказуемая продуктивность.',
    imagePath: makePublicImgPath('normal_male.png'),
  },
  {
    id: 'strict_female',
    displayName: 'Jordan Sharp',
    styleLabelRu: 'Жёсткий',
    intensity: 88,
    hint: 'Когда требуется максимальная концентрация.',
    imagePath: makePublicImgPath('strict_female.png'),
  },
  {
    id: 'strict_male',
    displayName: 'Alex Core',
    styleLabelRu: 'Жёсткий',
    intensity: 93,
    hint: 'Когда цель требует напора и дисциплины.',
    imagePath: makePublicImgPath('strict_male.png'),
  },
];

const DEFAULT_TRAINER_ID = trainerVisualCatalog[2]?.id || trainerVisualCatalog[0].id;

const isLegacyGender = (value: string | null): value is 'male' | 'female' => {
  return value === 'male' || value === 'female';
};

const isKnownTrainerId = (trainerId: string | null): trainerId is string => {
  if (!trainerId) return false;
  return trainerVisualCatalog.some((trainer) => trainer.id === trainerId);
};

const migrateLegacySelection = (legacyTrainerId: string | null, legacyGender: string | null): string | null => {
  if (!legacyTrainerId || !isLegacyGender(legacyGender)) {
    return null;
  }

  const compoundId = `${legacyTrainerId}_${legacyGender}`;
  return isKnownTrainerId(compoundId) ? compoundId : null;
};

export const loadActiveTrainerSelection = (): TrainerSelectionState => {
  if (typeof window === 'undefined') {
    return {
      trainerId: DEFAULT_TRAINER_ID,
    };
  }

  const storedTrainerId = localStorage.getItem(STORAGE_TRAINER_ID_KEY);
  const storedTrainerGender = localStorage.getItem(LEGACY_STORAGE_TRAINER_GENDER_KEY);

  if (isKnownTrainerId(storedTrainerId)) {
    // Existing compound ID is already valid in the new catalog model.
    localStorage.removeItem(LEGACY_STORAGE_TRAINER_GENDER_KEY);
    return { trainerId: storedTrainerId };
  }

  const migratedTrainerId = migrateLegacySelection(storedTrainerId, storedTrainerGender);
  if (migratedTrainerId) {
    localStorage.setItem(STORAGE_TRAINER_ID_KEY, migratedTrainerId);
    localStorage.removeItem(LEGACY_STORAGE_TRAINER_GENDER_KEY);
    return { trainerId: migratedTrainerId };
  }

  localStorage.setItem(STORAGE_TRAINER_ID_KEY, DEFAULT_TRAINER_ID);
  localStorage.removeItem(LEGACY_STORAGE_TRAINER_GENDER_KEY);
  return { trainerId: DEFAULT_TRAINER_ID };
};

export const getTrainerById = (trainerId: string): TrainerVisualItem => {
  const fallbackTrainer = trainerVisualCatalog.find((trainer) => trainer.id === DEFAULT_TRAINER_ID)
    || trainerVisualCatalog[0];
  return trainerVisualCatalog.find((item) => item.id === trainerId) || fallbackTrainer;
};

export const getTrainerImage = (trainerId: string): string => {
  return getTrainerById(trainerId).imagePath;
};

export const toTrainerLoadScale = (intensity: number): number => {
  return Math.max(1, Math.min(10, Math.round(intensity / 10)));
};

export const saveActiveTrainerSelection = (trainerId: string): void => {
  if (typeof window === 'undefined') return;

  if (!isKnownTrainerId(trainerId)) {
    return;
  }

  localStorage.setItem(STORAGE_TRAINER_ID_KEY, trainerId);
  localStorage.removeItem(LEGACY_STORAGE_TRAINER_GENDER_KEY);
};
