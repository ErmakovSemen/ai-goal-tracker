export type TrainerGender = 'male' | 'female';

export interface TrainerVisualItem {
  id: string;
  title: string;
  images: Record<TrainerGender, string>;
}

export interface TrainerSelectionState {
  trainerId: string;
  gender: TrainerGender;
}

const STORAGE_TRAINER_ID_KEY = 'selectedTrainerId';
const STORAGE_TRAINER_GENDER_KEY = 'selectedTrainerGender';

const makePublicImgPath = (filename: string): string => {
  const base = process.env.PUBLIC_URL || '';
  return `${base}/IMG/${filename}`;
};

export const trainerVisualCatalog: TrainerVisualItem[] = [
  {
    id: 'strict',
    title: 'Strict',
    images: {
      male: makePublicImgPath('strict_male.png'),
      female: makePublicImgPath('strict_female.png'),
    },
  },
  {
    id: 'normal',
    title: 'Normal',
    images: {
      male: makePublicImgPath('normal_male.png'),
      female: makePublicImgPath('normal_female.png'),
    },
  },
  {
    id: 'gentle',
    title: 'Gentle',
    images: {
      male: makePublicImgPath('gentle_male.png'),
      female: makePublicImgPath('gentle_female.png'),
    },
  },
];

const DEFAULT_TRAINER_ID = trainerVisualCatalog[1]?.id || trainerVisualCatalog[0].id;
const DEFAULT_TRAINER_GENDER: TrainerGender = 'male';

const isValidTrainerGender = (value: string | null): value is TrainerGender => {
  return value === 'male' || value === 'female';
};

const isKnownTrainerId = (trainerId: string | null): trainerId is string => {
  if (!trainerId) return false;
  return trainerVisualCatalog.some((trainer) => trainer.id === trainerId);
};

export const loadActiveTrainerSelection = (): TrainerSelectionState => {
  if (typeof window === 'undefined') {
    return {
      trainerId: DEFAULT_TRAINER_ID,
      gender: DEFAULT_TRAINER_GENDER,
    };
  }

  const storedTrainerId = localStorage.getItem(STORAGE_TRAINER_ID_KEY);
  const storedTrainerGender = localStorage.getItem(STORAGE_TRAINER_GENDER_KEY);

  return {
    trainerId: isKnownTrainerId(storedTrainerId) ? storedTrainerId : DEFAULT_TRAINER_ID,
    gender: isValidTrainerGender(storedTrainerGender) ? storedTrainerGender : DEFAULT_TRAINER_GENDER,
  };
};

const initialSelection = loadActiveTrainerSelection();

export const activeTrainerId = initialSelection.trainerId;
export const activeTrainerGender = initialSelection.gender;

export const getTrainerImage = (trainerId: string, gender: TrainerGender): string => {
  const fallbackTrainer = trainerVisualCatalog.find((trainer) => trainer.id === DEFAULT_TRAINER_ID)
    || trainerVisualCatalog[0];
  const trainer = trainerVisualCatalog.find((item) => item.id === trainerId) || fallbackTrainer;
  return trainer.images[gender] || fallbackTrainer.images[DEFAULT_TRAINER_GENDER];
};

export const saveActiveTrainerSelection = (trainerId: string, gender: TrainerGender): void => {
  if (typeof window === 'undefined') return;

  if (!isKnownTrainerId(trainerId) || !isValidTrainerGender(gender)) {
    return;
  }

  localStorage.setItem(STORAGE_TRAINER_ID_KEY, trainerId);
  localStorage.setItem(STORAGE_TRAINER_GENDER_KEY, gender);
};
