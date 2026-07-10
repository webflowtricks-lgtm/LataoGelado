import { useState, useEffect, ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, Loader2, Lock } from 'lucide-react';
import MenuPage from './components/MenuPage';
import AdminPage from './components/AdminPage';
import { subscribeProducts, subscribeSettings, subscribeOrders } from './dbService';
import { Product, StoreSettings, Order } from './types';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [path, setPath] = useState(window.location.pathname);
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('latao_remember') === 'true';
  });

  const isPainel = path.startsWith('/painel');

  // Reset authentication when leaving /painel, unless remember device is active
  useEffect(() => {
    if (!isPainel) {
      const isRemembered = localStorage.getItem('latao_remember') === 'true';
      if (!isRemembered) {
        setIsAuthenticated(false);
        setPassword('');
      }
    }
  }, [isPainel]);

  // Hook to capture navigation history changes programmatically
  useEffect(() => {
    const handleLocationChange = () => {
      setPath(window.location.pathname);
    };

    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      window.dispatchEvent(new Event('popstate'));
      return result;
    };

    const originalReplaceState = window.history.replaceState;
    window.history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      window.dispatchEvent(new Event('popstate'));
      return result;
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  // Listen to Firestore changes (Seeding happens inside these subscriptions if empty)
  useEffect(() => {
    let unsubProducts = () => {};
    let unsubSettings = () => {};
    let unsubOrders = () => {};

    // 1. Subscribe to settings
    unsubSettings = subscribeSettings((updatedSettings) => {
      setSettings(updatedSettings);
    });

    // 2. Subscribe to products
    unsubProducts = subscribeProducts((updatedProducts) => {
      setProducts(updatedProducts);
    });

    // 3. Subscribe to orders
    unsubOrders = subscribeOrders((updatedOrders) => {
      setOrders(updatedOrders);
      // Once both products and settings are loaded, stop loading indicator
      setLoading(false);
    });

    return () => {
      unsubProducts();
      unsubSettings();
      unsubOrders();
    };
  }, []);

  const navigateTo = (to: string) => {
    window.history.pushState({}, '', to);
  };

  // Render elegant loading splash
  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center flex flex-col items-center max-w-sm"
        >
          <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
            <motion.img 
              src="https://i.ibb.co/2wtGGnh/logo2.png" 
              alt="Logo" 
              className="w-20 h-20 object-contain"
              animate={{ 
                scale: [1, 1.08, 1],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              referrerPolicy="no-referrer"
            />
          </div>
          
          <h2 className="text-xl font-display font-extrabold text-white tracking-tight">
            Carregando cardápio...
          </h2>
          
          <p className="text-zinc-400 text-xs mt-2 flex items-center justify-center gap-1.5 font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-400" />
            <span>Carregando...</span>
          </p>
        </motion.div>
      </div>
    );
  }

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    if (val === 'latao@26@') {
      setIsAuthenticated(true);
      if (rememberDevice) {
        localStorage.setItem('latao_remember', 'true');
      } else {
        localStorage.removeItem('latao_remember');
      }
    }
  };

  const handlePasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password === 'latao@26@') {
      setIsAuthenticated(true);
      if (rememberDevice) {
        localStorage.setItem('latao_remember', 'true');
      } else {
        localStorage.removeItem('latao_remember');
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Allow form submission or handle directly
      if (password === 'latao@26@') {
        setIsAuthenticated(true);
        if (rememberDevice) {
          localStorage.setItem('latao_remember', 'true');
        } else {
          localStorage.removeItem('latao_remember');
        }
      }
    }
  };

  if (isPainel && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-6 select-none">
        <form onSubmit={handlePasswordSubmit} className="w-full max-w-xs text-center space-y-4">
          <input
            type="password"
            value={password}
            onChange={handlePasswordChange}
            onKeyDown={handleKeyDown}
            placeholder="Digite a senha"
            autoFocus
            className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl px-5 py-3.5 text-center text-yellow-400 placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-yellow-400/30 transition-all text-lg tracking-widest font-bold"
          />
          
          <div className="flex items-center justify-center space-x-2 py-1 select-none">
            <input
              type="checkbox"
              id="remember"
              checked={rememberDevice}
              onChange={(e) => {
                const checked = e.target.checked;
                setRememberDevice(checked);
                if (!checked) {
                  localStorage.removeItem('latao_remember');
                }
              }}
              className="w-4 h-4 bg-neutral-900 border-neutral-800 rounded text-yellow-400 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-yellow-400"
            />
            <label htmlFor="remember" className="text-xs text-zinc-400 font-medium cursor-pointer">
              Lembrar este dispositivo
            </label>
          </div>

          {/* Styled to be visually hidden but natively active for Enter-key submit */}
          <button 
            type="submit" 
            style={{ position: 'absolute', width: '1px', height: '1px', margin: '-1px', padding: '0', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: '0' }}
            aria-hidden="true" 
          />

          <button 
            type="button"
            onClick={() => navigateTo('/')}
            className="text-[10px] text-zinc-500 hover:text-zinc-400 transition-colors font-bold uppercase tracking-wider block mx-auto cursor-pointer pt-2"
          >
            Voltar ao Cardápio
          </button>
        </form>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {isPainel ? (
        <motion.div
          key="admin-page"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <AdminPage 
            products={products}
            settings={settings}
            orders={orders}
            onNavigateToMenu={() => navigateTo('/')}
            onLogout={() => {
              localStorage.removeItem('latao_remember');
              setIsAuthenticated(false);
              navigateTo('/');
            }}
          />
        </motion.div>
      ) : (
        <motion.div
          key="menu-page"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <MenuPage 
            products={products}
            settings={settings}
            onNavigateToAdmin={() => navigateTo('/painel')}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
