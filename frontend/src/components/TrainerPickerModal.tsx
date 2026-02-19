import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  getTrainerImage,
  TrainerGender,
  trainerVisualCatalog,
} from '../config/trainerVisualConfig';
import './TrainerPickerModal.css';

interface TrainerPickerModalProps {
  isOpen: boolean;
  activeTrainerId: string;
  activeTrainerGender: TrainerGender;
  onClose: () => void;
  onConfirm: (trainerId: string, gender: TrainerGender) => void;
}

const SWIPE_THRESHOLD_PX = 60;

const clampIndex = (value: number, max: number): number => {
  if (max < 0) return 0;
  if (value < 0) return 0;
  if (value > max) return max;
  return value;
};

const TrainerPickerModal: React.FC<TrainerPickerModalProps> = ({
  isOpen,
  activeTrainerId,
  activeTrainerGender,
  onClose,
  onConfirm,
}) => {
  const trainerCount = trainerVisualCatalog.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [workingGender, setWorkingGender] = useState<TrainerGender>(activeTrainerGender);
  const [pendingTrainerId, setPendingTrainerId] = useState(activeTrainerId);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartXRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const savedIndex = trainerVisualCatalog.findIndex((trainer) => trainer.id === activeTrainerId);
    const safeIndex = savedIndex >= 0 ? savedIndex : 0;
    setCurrentIndex(safeIndex);
    setPendingTrainerId(trainerVisualCatalog[safeIndex]?.id || activeTrainerId);
    setWorkingGender(activeTrainerGender);
    setDragX(0);
  }, [activeTrainerGender, activeTrainerId, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === 'ArrowLeft') {
        setCurrentIndex((prev) => clampIndex(prev - 1, trainerCount - 1));
      }
      if (event.key === 'ArrowRight') {
        setCurrentIndex((prev) => clampIndex(prev + 1, trainerCount - 1));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, trainerCount]);

  const centeredTrainerId = trainerVisualCatalog[currentIndex]?.id || activeTrainerId;

  useEffect(() => {
    if (!isOpen) return;
    setPendingTrainerId(centeredTrainerId);
  }, [centeredTrainerId, isOpen]);

  const cards = useMemo(() => trainerVisualCatalog, []);

  if (!isOpen) {
    return null;
  }

  const moveByStep = (step: number) => {
    setCurrentIndex((prev) => clampIndex(prev + step, trainerCount - 1));
    setDragX(0);
  };

  const startDrag = (clientX: number, pointerId?: number) => {
    setDragging(true);
    dragStartXRef.current = clientX;
    if (typeof pointerId === 'number') {
      pointerIdRef.current = pointerId;
    }
  };

  const updateDrag = (clientX: number) => {
    if (!dragging) return;
    setDragX(clientX - dragStartXRef.current);
  };

  const finishDrag = () => {
    if (!dragging) return;

    if (dragX <= -SWIPE_THRESHOLD_PX) {
      moveByStep(1);
    } else if (dragX >= SWIPE_THRESHOLD_PX) {
      moveByStep(-1);
    } else {
      setDragX(0);
    }

    setDragging(false);
    pointerIdRef.current = null;
  };

  const handleCardClick = (index: number) => {
    if (index !== currentIndex) {
      setCurrentIndex(index);
      return;
    }

    const centered = cards[index];
    if (centered) {
      setPendingTrainerId(centered.id);
    }
  };

  const handleConfirm = () => {
    const trainerId = pendingTrainerId || centeredTrainerId;
    onConfirm(trainerId, workingGender);
  };

  const getCardStyle = (index: number): React.CSSProperties => {
    const offset = index - currentIndex;
    const absOffset = Math.abs(offset);
    const influence = dragging ? dragX * 0.25 : 0;
    const translateX = offset * 170 + influence;
    const rotateY = offset * -30;
    const scale = Math.max(0.72, 1 - absOffset * 0.13);
    const opacity = Math.max(0.28, 1 - absOffset * 0.33);
    const zIndex = 200 - absOffset;

    return {
      transform: `translateX(calc(-50% + ${translateX}px)) rotateY(${rotateY}deg) scale(${scale})`,
      opacity,
      zIndex,
      pointerEvents: absOffset > 2 ? 'none' : 'auto',
    };
  };

  return (
    <div
      className="trainer-picker-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="trainer-picker-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Выбор тренера"
      >
        <div className="trainer-picker-header">
          <h2>Выбор тренера</h2>
          <div className="trainer-gender-switch" aria-label="Переключатель пола тренера">
            <button
              type="button"
              className={`trainer-gender-btn ${workingGender === 'male' ? 'active' : ''}`}
              onClick={() => setWorkingGender('male')}
              aria-label="Male"
            >
              Male
            </button>
            <button
              type="button"
              className={`trainer-gender-btn ${workingGender === 'female' ? 'active' : ''}`}
              onClick={() => setWorkingGender('female')}
              aria-label="Female"
            >
              Female
            </button>
          </div>
        </div>

        <div className="trainer-picker-carousel">
          <button
            type="button"
            className="carousel-nav carousel-prev"
            onClick={() => moveByStep(-1)}
            aria-label="Предыдущий тренер"
          >
            ‹
          </button>

          <div
            className="trainer-cards-viewport"
            onPointerDown={(event) => {
              startDrag(event.clientX, event.pointerId);
            }}
            onPointerMove={(event) => {
              if (pointerIdRef.current !== null && pointerIdRef.current !== event.pointerId) return;
              updateDrag(event.clientX);
            }}
            onPointerUp={() => {
              finishDrag();
            }}
            onPointerCancel={() => {
              finishDrag();
            }}
          >
            <div className="trainer-cards-stage">
              {cards.map((trainer, index) => {
                const isCentered = index === currentIndex;
                const isSelected = pendingTrainerId === trainer.id;
                return (
                  <button
                    type="button"
                    key={trainer.id}
                    className={`trainer-card ${isCentered ? 'centered' : ''} ${isSelected ? 'selected' : ''}`}
                    style={getCardStyle(index)}
                    onClick={() => handleCardClick(index)}
                    aria-label={`Тренер ${trainer.title}`}
                  >
                    <img
                      src={getTrainerImage(trainer.id, workingGender)}
                      alt={`${trainer.title} trainer avatar`}
                    />
                    <span className="trainer-card-title">{trainer.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="carousel-nav carousel-next"
            onClick={() => moveByStep(1)}
            aria-label="Следующий тренер"
          >
            ›
          </button>
        </div>

        <div className="trainer-picker-actions">
          <button type="button" className="trainer-btn secondary" onClick={onClose} aria-label="Close">
            Close
          </button>
          <button
            type="button"
            className="trainer-btn primary"
            onClick={handleConfirm}
            aria-label="Выбрать тренера"
          >
            Выбрать
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrainerPickerModal;
