import React from 'react';
import './Mascot.css';

interface MascotProps {
  mood: 'happy' | 'sad' | 'neutral' | 'excited';
  size?: 'small' | 'medium' | 'large';
}

const Mascot: React.FC<MascotProps> = ({ mood, size = 'medium' }) => {
  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'mascot-small';
      case 'large': return 'mascot-large';
      default: return 'mascot-medium';
    }
  };

  const getMoodClass = () => {
    return `mascot-${mood}`;
  };

  return (
    <div className={`mascot ${getSizeClass()} ${getMoodClass()}`}>
      <div className="mascot-body">
        <div className="mascot-ears">
          <div className="ear left-ear"></div>
          <div className="ear right-ear"></div>
        </div>
        <div className="mascot-face">
          <div className="mascot-eyes">
            <div className="eye left-eye"></div>
            <div className="eye right-eye"></div>
          </div>
          <div className="mascot-nose"></div>
          <div className="mascot-mouth"></div>
        </div>
      </div>
    </div>
  );
};

export default Mascot;