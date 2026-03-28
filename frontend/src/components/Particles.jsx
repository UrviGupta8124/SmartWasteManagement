import React from 'react';

const Particles = () => {
  // Generate random particles for the background
  const particles = Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    size: Math.random() * 6 + 2,
    left: Math.random() * 100,
    top: Math.random() * 100,
    animationDuration: Math.random() * 10 + 10,
    animationDelay: Math.random() * 5
  }));

  return (
    <div className="particles-container">
      {particles.map(p => (
        <div 
          key={p.id} 
          className="particle"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            left: `${p.left}%`,
            top: `${p.top}%`,
            animationDuration: `${p.animationDuration}s`,
            animationDelay: `${p.animationDelay}s`
          }}
        />
      ))}
    </div>
  );
};

export default Particles;
