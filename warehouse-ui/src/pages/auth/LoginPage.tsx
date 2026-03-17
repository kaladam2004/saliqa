import React, { useState } from 'react';
import { Dropdown } from 'antd';
import { GlobalOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';

const LANGUAGES = [
  { key: 'en', label: 'English' },
  { key: 'ru', label: 'Русский' },
  { key: 'tg', label: 'Тоҷикӣ' },
];

/* Animated glossy sphere */
const Sphere: React.FC<{
  size: number; top?: string; left?: string; right?: string; bottom?: string;
  delay?: number; color: string;
}> = ({ size, top, left, right, bottom, delay = 0, color }) => (
  <div style={{
    position: 'absolute',
    width: size, height: size,
    borderRadius: '50%',
    background: color,
    boxShadow: `0 0 ${size * 0.4}px ${size * 0.15}px rgba(200, 100, 220, 0.35)`,
    top, left, right, bottom,
    animation: `float ${3 + delay * 0.7}s ease-in-out infinite alternate`,
    animationDelay: `${delay * 0.5}s`,
    pointerEvents: 'none',
    filter: 'blur(0.5px)',
  }} />
);

const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const auth = await login({ username: username.trim(), password });
      setAuth(auth);
      navigate(auth.role === 'USER' ? '/user' : '/admin');
    } catch {
      setError(t('auth.invalid_credentials'));
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 18px',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 12,
    color: '#fff',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    backdropFilter: 'blur(4px)',
    transition: 'border-color 0.2s, background 0.2s',
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'radial-gradient(ellipse at 30% 40%, #2d1b4e 0%, #1a0e2e 40%, #0d0b1a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Floating spheres */}
      <Sphere size={90}  top="12%" left="28%"  color="radial-gradient(circle at 35% 30%, #f472f5, #9b2bcb)" delay={0} />
      <Sphere size={130} top="8%"  right="25%" color="radial-gradient(circle at 35% 30%, #f472f5, #be3ae8)" delay={1} />
      <Sphere size={75}  top="35%" left="20%"  color="radial-gradient(circle at 35% 30%, #c84cf5, #7b1bb5)" delay={2} />
      <Sphere size={170} top="28%" right="18%" color="radial-gradient(circle at 35% 30%, #f472f5, #b530e0)" delay={0.5} />
      <Sphere size={110} bottom="15%" left="26%"  color="radial-gradient(circle at 35% 30%, #e85ef5, #9b2bcb)" delay={1.5} />
      <Sphere size={150} bottom="10%" right="22%" color="radial-gradient(circle at 35% 30%, #f472f5, #c040e0)" delay={2.5} />

      {/* Language switcher */}
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 20 }}>
        <Dropdown menu={{
          items: LANGUAGES.map(l => ({ key: l.key, label: l.label, onClick: () => changeLanguage(l.key) })),
          selectedKeys: [i18n.language],
        }}>
          <button style={{
            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 20, padding: '6px 14px', color: '#fff', cursor: 'pointer',
            fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
            backdropFilter: 'blur(8px)',
          }}>
            <GlobalOutlined />
            {LANGUAGES.find(l => l.key === i18n.language)?.label ?? 'EN'}
          </button>
        </Dropdown>
      </div>

      {/* Glass circle panel */}
      <div style={{
        position: 'relative', zIndex: 10,
        width: 'min(400px, 90vw)',
        aspectRatio: '1',
        borderRadius: '50%',
        background: 'rgba(180,150,210,0.15)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 8px 60px rgba(100,50,180,0.3), inset 0 1px 0 rgba(255,255,255,0.25)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px',
      }}>
        {/* Title */}
        <div style={{
          color: '#fff', fontWeight: 600, fontSize: 18,
          marginBottom: 28, textAlign: 'center',
          textShadow: '0 1px 8px rgba(0,0,0,0.4)',
        }}>
          {t('auth.subtitle')}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {error && (
            <div style={{
              background: 'rgba(255, 80, 80, 0.2)',
              border: '1px solid rgba(255,100,100,0.4)',
              borderRadius: 10, padding: '8px 14px',
              color: '#ffb3b3', fontSize: 12, textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <input
            type="text"
            placeholder={t('common.username')}
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = 'rgba(200,100,240,0.7)'; e.target.style.background = 'rgba(255,255,255,0.16)'; }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.2)'; e.target.style.background = 'rgba(255,255,255,0.12)'; }}
          />

          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={t('common.password')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{ ...inputStyle, paddingRight: 44 }}
              onFocus={e => { e.target.style.borderColor = 'rgba(200,100,240,0.7)'; e.target.style.background = 'rgba(255,255,255,0.16)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.2)'; e.target.style.background = 'rgba(255,255,255,0.12)'; }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)',
                cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
              }}
            >
              {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            style={{
              width: '100%',
              padding: '13px 0',
              background: loading
                ? 'rgba(160,100,200,0.4)'
                : 'rgba(180,120,220,0.45)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 12,
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              backdropFilter: 'blur(4px)',
              transition: 'background 0.2s, transform 0.1s',
              marginTop: 4,
              letterSpacing: 0.3,
            }}
            onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.background = 'rgba(190,130,230,0.6)'; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'rgba(180,120,220,0.45)'; }}
          >
            {loading ? '...' : t('auth.sign_in')}
          </button>
        </form>

        {/* WMS branding */}
        <div style={{
          marginTop: 20, color: 'rgba(255,255,255,0.35)', fontSize: 11,
          letterSpacing: 2, textTransform: 'uppercase',
        }}>
          WMS · Warehouse Management
        </div>
      </div>

      {/* Float animation */}
      <style>{`
        @keyframes float {
          from { transform: translateY(0px) scale(1); }
          to   { transform: translateY(-18px) scale(1.04); }
        }
        input::placeholder { color: rgba(255,255,255,0.45); }
      `}</style>
    </div>
  );
};

export default LoginPage;
