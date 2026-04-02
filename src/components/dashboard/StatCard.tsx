
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
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-destructive/10 text-destructive',
    info: 'bg-primary/10 text-primary',
    pncp: 'bg-estruturante-pncp/10 text-estruturante-pncp',
    pen: 'bg-estruturante-pen/10 text-estruturante-pen',
  };

  const bgColor = colorMap[color] || colorMap.primary;

  return (
    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="flex items-start gap-4 p-5">
        <div className={`p-2.5 rounded-xl ${bgColor} shrink-0`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
          <p className="text-2xl font-bold mt-0.5">{value}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
