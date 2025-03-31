
import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { Switch } from '@/components/ui/switch';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="flex items-center gap-2">
      <Sun 
        size={16} 
        className={`transition-colors ${theme === 'light' ? 'text-yellow-500' : 'text-gray-400'}`} 
      />
      <Switch 
        checked={theme === 'dark'} 
        onCheckedChange={toggleTheme} 
        aria-label="Alternar modo escuro"
      />
      <Moon 
        size={16} 
        className={`transition-colors ${theme === 'dark' ? 'text-blue-400' : 'text-gray-400'}`} 
      />
    </div>
  );
};

export default ThemeToggle;
