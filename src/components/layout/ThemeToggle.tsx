
import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Switch } from '@/components/ui/switch';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="flex items-center gap-2">
      <Sun size={16} className="text-yellow-500" />
      <Switch 
        checked={theme === 'dark'} 
        onCheckedChange={toggleTheme} 
        aria-label="Alternar modo escuro"
      />
      <Moon size={16} className="text-blue-700 dark:text-blue-400" />
    </div>
  );
};

export default ThemeToggle;
