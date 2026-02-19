import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getTrainerImage,
  toTrainerLoadScale,
  trainerVisualCatalog,
} from '../config/trainerVisualConfig';
import './TrainerPickerModal.css';

interface TrainerPickerModalProps {
  isOpen: boolean;
  activeTrainerId: string;
  onClose: () => void;
  onConfirm: (trainerId: string) => void;
}

const TrainerPickerModal: React.FC<TrainerPickerModalProps> = ({
  isOpen,
  activeTrainerId,
  onClose,
  onConfirm,
}) => {
  const cards = trainerVisualCatalog;
  const [currentIndex, setCurrentIndex] = useState(() => {
    const found = cards.findIndex((item) => item.id === activeTrainerId);
    return found >= 0 ? found : 2;
  });

  const carouselRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollRafRef = useRef<number | null>(null);

  const activateByIndex = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const centerCardByIndex = useCallback((index: number, behavior: ScrollBehavior) => {
    const card = cardRefs.current[index];
    if (!card) return;
    card.scrollIntoView({ behavior, inline: 'center', block: 'nearest' });
  }, []);

  const updateEdgePadding = useCallback(() => {
    const carousel = carouselRef.current;
    const firstCard = cardRefs.current[0];
    if (!carousel || !firstCard) return;

    const cardWidth = firstCard.getBoundingClientRect().width;
    const viewportWidth = carousel.clientWidth;
    if (!cardWidth || !viewportWidth) return;

    const sidePadding = Math.max(10, (viewportWidth - cardWidth) / 2);
    carousel.style.setProperty('--edge-pad', `${sidePadding}px`);
  }, []);

  const activateNearestByCenter = useCallback(() => {
    const carousel = carouselRef.current;
    if (!carousel || !cardRefs.current.length) return;

    const carouselRect = carousel.getBoundingClientRect();
    const centerX = carouselRect.left + carouselRect.width / 2;

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const distance = Math.abs(centerX - cardCenterX);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    if (nearestIndex !== currentIndex) {
      activateByIndex(nearestIndex);
    }
  }, [activateByIndex, currentIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const savedIndex = cards.findIndex((trainer) => trainer.id === activeTrainerId);
    const initialIndex = savedIndex >= 0 ? savedIndex : 2;

    const frame = window.requestAnimationFrame(() => {
      updateEdgePadding();
      centerCardByIndex(initialIndex, 'auto');
      activateByIndex(initialIndex);
    });

    const onResize = () => {
      updateEdgePadding();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [activeTrainerId, activateByIndex, cards, centerCardByIndex, isOpen, onClose, updateEdgePadding]);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current) {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  const handleCarouselScroll = () => {
    if (scrollRafRef.current) {
      window.cancelAnimationFrame(scrollRafRef.current);
    }
    scrollRafRef.current = window.requestAnimationFrame(() => {
      activateNearestByCenter();
    });
  };

  const handleCardClick = (index: number) => {
    centerCardByIndex(index, 'smooth');
    activateByIndex(index);
  };

  const handleConfirm = () => {
    const trainer = cards[currentIndex];
    if (!trainer) return;
    onConfirm(trainer.id);
  };

  return (
    <div className="trainer-picker-overlay" onClick={onClose} role="presentation">
      <div
        className="trainer-picker-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Trainer selection"
      >
        <div className="trainer-picker-header">
          <h2>Choose your style</h2>
          <p>Who should motivate you?</p>
          <button type="button" className="trainer-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="trainer-carousel-shell">
          <div
            className="trainer-picker-carousel"
            ref={carouselRef}
            onScroll={handleCarouselScroll}
          >
            {cards.map((trainer, index) => {
              const isActive = index === currentIndex;
              return (
                <button
                  type="button"
                  key={trainer.id}
                  ref={(el) => {
                    cardRefs.current[index] = el;
                  }}
                  className={`trainer-card ${isActive ? 'active' : ''}`}
                  onClick={() => handleCardClick(index)}
                  aria-label={`Trainer ${trainer.displayName}`}
                >
                  <div className="trainer-card-topbar">
                    <span>Style: {trainer.styleLabelRu}</span>
                    <span className="trainer-load">Load: {toTrainerLoadScale(trainer.intensity)} / 10</span>
                  </div>
                  <img src={getTrainerImage(trainer.id)} alt={trainer.displayName} />
                  <div className="trainer-card-name">{trainer.displayName}</div>
                  <div className="trainer-card-hint">{trainer.hint}</div>
                </button>
              );
            })}
          </div>
          <div className="trainer-edge-fade" aria-hidden="true" />
        </div>

        <div className="trainer-dots">
          {cards.map((trainer, index) => (
            <button
              key={`${trainer.id}-dot`}
              type="button"
              className={`trainer-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => handleCardClick(index)}
              aria-label={`Go to trainer ${trainer.displayName}`}
            />
          ))}
        </div>

        <div className="trainer-picker-actions">
          <button
            type="button"
            className="trainer-btn primary"
            onClick={handleConfirm}
            aria-label="Select trainer"
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrainerPickerModal;
