import { useState, type FormEvent } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { Logo } from '../components/layout/Logo';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Controls';
import { useAuth } from '../state/AuthProvider';
import './login.css';

/** Entrada do criador. O TokArena nunca pede a senha do TikTok: esta senha é só da conta do TokArena. */
export default function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'in' | 'up' | null>(null);
  const [message, setMessage] = useState<{ tone: 'erro' | 'info'; text: string } | null>(null);

  const valid = /^\S+@\S+\.\S+$/.test(email) && password.length >= 6;

  const run = async (mode: 'in' | 'up', event?: FormEvent) => {
    event?.preventDefault();
    if (!valid || busy) return;
    setBusy(mode);
    setMessage(null);
    const result = mode === 'in' ? await auth.signIn(email.trim(), password) : await auth.signUp(email.trim(), password);
    setBusy(null);
    if (result) setMessage({ tone: mode === 'up' && result.startsWith('Conta criada') ? 'info' : 'erro', text: result });
  };

  return (
    <main className="login">
      <form className="login__card panel" onSubmit={(e) => run('in', e)} aria-labelledby="login-title">
        <div className="login__brand">
          <Logo />
        </div>
        <h1 className="login__title" id="login-title">
          Entrar no TokArena
        </h1>
        <p className="login__lead">Use o e-mail da sua conta do TokArena. Nunca pedimos a senha do TikTok.</p>
        <TextField label="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Senha" type="password" autoComplete="current-password" hint="Mínimo de 6 caracteres." value={password} onChange={(e) => setPassword(e.target.value)} />
        {message ? (
          <p className={`login__msg login__msg--${message.tone}`} role={message.tone === 'erro' ? 'alert' : 'status'}>
            {message.text}
          </p>
        ) : null}
        <div className="login__actions">
          <Button type="submit" variant="primary" icon={LogIn} loading={busy === 'in'} disabled={!valid || busy !== null}>
            Entrar
          </Button>
          <Button icon={UserPlus} loading={busy === 'up'} disabled={!valid || busy !== null} onClick={() => run('up')}>
            Criar conta
          </Button>
        </div>
        <button type="button" className="login__demo" onClick={auth.useDemo}>
          Continuar na demonstração, sem conta
        </button>
      </form>
    </main>
  );
}
