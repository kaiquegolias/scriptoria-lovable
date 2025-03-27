
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  color = 'primary',
}) => {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary text-white',
    success: 'bg-status-success text-white',
    warning: 'bg-status-warning text-white',
    error: 'bg-status-error text-white',
    info: 'bg-status-info text-white',
    pncp: 'bg-estruturante-pncp text-white',
    pen: 'bg-estruturante-pen text-white',
  };

  const bgColor = colorMap[color] || colorMap.primary;

  return (
    <div className="glass rounded-xl shadow-sm overflow-hidden hover-lift">
      <div className="flex">
        <div className={`flex items-center justify-center p-4 ${bgColor}`}>
          {icon}
        </div>
        <div className="p-4 flex-1">
          <h3 className="text-sm font-medium text-foreground/70">{title}</h3>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {description && <p className="text-xs text-foreground/60 mt-1">{description}</p>}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
