import React from 'react';
import { useRive } from 'rive-react';
import './Mascot.css';

interface MascotProps {
  mood?: 'happy' | 'sad' | 'neutral' | 'excited';
  size?: 'small' | 'medium' | 'large';
}

const Mascot: React.FC<MascotProps> = ({ 
  mood = 'neutral', 
  size = 'medium'
}) => {
  const { RiveComponent } = useRive({
    src: '/mascot.riv',
    autoplay: true,
  });

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'mascot-small';
      case 'large': return 'mascot-large';
      default: return 'mascot-medium';
    }
  };

  return (
    <div className={`mascot-rive ${getSizeClass()}`}>
      <RiveComponent />
    </div>
  );
};

export default Mascot;
