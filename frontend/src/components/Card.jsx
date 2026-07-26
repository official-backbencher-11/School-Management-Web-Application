import React from 'react';

const Card = ({ title, value, icon, subtitle, color = 'primary' }) => {
  return (
    <div className={`stats-card glass-panel border-${color}`}>
      <div className="card-content">
        <span className="card-title">{title}</span>
        <h3 className="card-value">{value}</h3>
        {subtitle && <span className="card-subtitle">{subtitle}</span>}
      </div>
      <div className={`card-icon-wrapper bg-${color}`}>
        {icon}
      </div>
    </div>
  );
};

export default Card;
