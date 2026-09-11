import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthChange, logoutUser, signInGuest } from '@/firebase/auth';
import AuthModal from '@/components/auth/AuthModal';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState({ id: 'deeproom_indigenous', public_settings: {} });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    // Listen to Firebase/local auth changes
    const unsubscribe = onAuthChange((currentUser) => {
      if (currentUser) {
        sessionStorage.removeItem('deeproom_signed_out');
        setUser(currentUser);
        setIsAuthenticated(true);
        setAuthError(null);
        setIsLoadingAuth(false);
      } else {
        const isExplicitSignedOut = sessionStorage.getItem('deeproom_signed_out') === 'true';
        if (!isExplicitSignedOut) {
          // If first visit and never explicitly signed out, allow frictionless guest access
          signInGuest()
            .then((guest) => {
              setUser(guest);
              setIsAuthenticated(true);
              setIsLoadingAuth(false);
            })
            .catch(() => {
              setUser(null);
              setIsAuthenticated(false);
              setIsLoadingAuth(false);
            });
        } else {
          // User explicitly signed out - keep unauthenticated and open login modal
          setUser(null);
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
        }
      }
    });

    // Custom event listener for components invoking login
    const handleOpenAuth = () => {
      setIsAuthModalOpen(true);
    };
    window.addEventListener('deeproom:open-auth-modal', handleOpenAuth);

    return () => {
      unsubscribe?.();
      window.removeEventListener('deeproom:open-auth-modal', handleOpenAuth);
    };
  }, []);

  const logout = async () => {
    sessionStorage.setItem('deeproom_signed_out', 'true');
    await logoutUser();
    setUser(null);
    setIsAuthenticated(false);
    setIsAuthModalOpen(true);
  };

  const navigateToLogin = () => {
    setIsAuthModalOpen(true);
  };

  const checkAppState = async () => {
    setIsLoadingAuth(false);
    setIsLoadingPublicSettings(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        logout,
        navigateToLogin,
        openAuthModal: navigateToLogin,
        checkAppState,
      }}
    >
      {children}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(newUser) => {
          sessionStorage.removeItem('deeproom_signed_out');
          setUser(newUser);
          setIsAuthenticated(true);
        }}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
