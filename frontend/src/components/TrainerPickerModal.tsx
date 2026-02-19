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

  const getSubTitle = (styleLabelRu: string): string => {
    if (styleLabelRu === 'Лайтовый') return 'поддерживающий друг';
    if (styleLabelRu === 'Нормальный') return 'разумный наставник';
    return 'фокус и дисциплина';
  };

  return (
    <div className="trainer-picker-overlay" onClick={onClose} role="presentation">
      <div
        className="trainer-picker-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={'\u041c\u043e\u0434\u0430\u043b\u044c\u043d\u043e\u0435 \u043e\u043a\u043d\u043e \u0432\u044b\u0431\u043e\u0440\u0430 \u0442\u0440\u0435\u043d\u0435\u0440\u0430'}
      >
        <button
          type="button"
          className="trainer-close-btn"
          onClick={onClose}
          aria-label={'\u0417\u0430\u043a\u0440\u044b\u0442\u044c'}
        >
          {'\u2715'}
        </button>

        <header className="trainer-title-block">
          <h2>{'\u0412\u044b\u0431\u0435\u0440\u0438 \u0441\u0432\u043e\u0439 \u0441\u0442\u0438\u043b\u044c'}</h2>
          <p>{'\u041a\u0442\u043e \u0431\u0443\u0434\u0435\u0442 \u043c\u043e\u0442\u0438\u0432\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0442\u0435\u0431\u044f?'}</p>
        </header>

        <div className="trainer-carousel-shell">
          <div className="trainer-picker-carousel" ref={carouselRef} onScroll={handleCarouselScroll}>
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
                  aria-label={`\u0422\u0440\u0435\u043d\u0435\u0440 ${trainer.displayName}`}
                >
                  <div className="trainer-card-head" />
                  <div className="trainer-avatar-wrap">
                    <img className="trainer-avatar" src={getTrainerImage(trainer.id)} alt={trainer.displayName} />
                  </div>
                  <div className="trainer-card-main">
                    <h3 className="trainer-card-name">{trainer.displayName}</h3>
                    <p className="trainer-card-sub">{getSubTitle(trainer.styleLabelRu)}</p>
                    <p className="trainer-card-hint">{trainer.hint}</p>
                    <div className="trainer-meter">
                      <div className="trainer-meter-labels">
                        <span>{'\u043c\u044f\u0433\u043a\u043e'}</span>
                        <span>{'\u0441\u0442\u0440\u043e\u0433\u043e'}</span>
                      </div>
                      <div className="trainer-meter-track">
                        <div className="trainer-meter-fill" style={{ width: `${toTrainerLoadScale(trainer.intensity) * 10}%` }} />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="trainer-edge-fade" aria-hidden="true" />
        </div>

        <div className="trainer-dots" aria-label={'\u041f\u0430\u0433\u0438\u043d\u0430\u0446\u0438\u044f'}>
          {cards.map((trainer, index) => (
            <button
              key={`${trainer.id}-dot`}
              type="button"
              className={`trainer-dot ${index === currentIndex ? 'active' : ''}`}
              onClick={() => handleCardClick(index)}
              aria-label={`\u041f\u0435\u0440\u0435\u0439\u0442\u0438 \u043a \u0442\u0440\u0435\u043d\u0435\u0440\u0443 ${trainer.displayName}`}
            />
          ))}
        </div>

        <footer className="trainer-picker-actions">
          <button
            type="button"
            className="trainer-btn primary"
            onClick={handleConfirm}
            aria-label={'\u0412\u044b\u0431\u0440\u0430\u0442\u044c'}
          >
            {'\u0412\u044b\u0431\u0440\u0430\u0442\u044c'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default TrainerPickerModal;
