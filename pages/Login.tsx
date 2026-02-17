import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";
  
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);
    
    try {
        await login(email, pass);
        navigate(from, { replace: true });
    } catch (err: any) {
        console.error("Login error:", err);
        setError("Falha ao fazer login. Verifique seu e-mail e senha.");
    } finally {
        setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light px-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
            <div className="flex flex-col items-center mb-8">
                <div className="size-14 bg-primary rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-primary/30">
                     <span className="material-symbols-outlined text-4xl">local_shipping</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">LogiFlow</h1>
                <p className="text-slate-500 text-sm">Entre para acessar o painel</p>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">error</span>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">E-mail</label>
                    <input 
                        type="email" 
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                        placeholder="admin@logiflow.com"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Senha</label>
                    <input 
                        type="password" 
                        required
                        value={pass}
                        onChange={(e) => setPass(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm" 
                        placeholder="••••••••"
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={isLoggingIn}
                    className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-lg font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-2"
                >
                    {isLoggingIn ? 'Entrando...' : 'Acessar Sistema'}
                    {!isLoggingIn && <span className="material-symbols-outlined text-sm">arrow_forward</span>}
                </button>
            </form>
            
            <div className="mt-6 text-center">
                 <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                    <span className="size-2 rounded-full bg-emerald-500"></span>
                    Sistema Conectado (Firebase Auth)
                 </p>
            </div>
        </div>
    </div>
  );
};