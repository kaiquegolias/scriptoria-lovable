
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, register } = useAuth();
  
  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    // Limpar os campos ao trocar o modo
    setName('');
    setEmail('');
    setPassword('');
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (isLogin) {
        const success = await login(email, password);
        if (!success) {
          toast.error('Credenciais inválidas. Tente novamente.');
        }
      } else {
        if (!name) {
          toast.error('O nome é obrigatório');
          setIsLoading(false);
          return;
        }
        
        const success = await register(name, email, password);
        if (!success) {
          toast.error('Falha no registro. Verifique os dados e tente novamente.');
        }
      }
    } catch (error) {
      toast.error('Ocorreu um erro. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="glass p-8 rounded-2xl w-full max-w-md mx-auto shadow-lg animate-fade-in">
      <h2 className="text-2xl font-bold text-center mb-6">
        {isLogin ? 'Entrar na sua conta' : 'Criar uma nova conta'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        {!isLogin && (
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium">
              Nome
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
              placeholder="Seu nome"
              disabled={isLoading}
              required
            />
          </div>
        )}
        
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
            placeholder="seu.email@exemplo.com"
            disabled={isLoading}
            required
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">
            Senha
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
            placeholder="••••••••"
            disabled={isLoading}
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary text-white rounded-lg py-3 font-medium hover:bg-primary/90 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processando...
            </span>
          ) : (
            isLogin ? 'Entrar' : 'Registrar'
          )}
        </button>
      </form>
      
      <div className="mt-6 text-center">
        <button
          onClick={toggleAuthMode}
          className="text-sm text-foreground/70 hover:text-primary transition-colors"
        >
          {isLogin
            ? 'Não tem uma conta? Registre-se'
            : 'Já possui uma conta? Faça login'}
        </button>
      </div>
    </div>
  );
};

export default AuthForm;
