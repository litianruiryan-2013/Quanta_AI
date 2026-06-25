import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient.js";
import AuthModal from "./components/AuthModal.jsx";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Close the modal automatically once the user is signed in.
  useEffect(() => {
    if (session) setModalOpen(false);
  }, [session]);

  const signOut   = () => supabase.auth.signOut();
  const openModal  = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  return (
    <AuthContext.Provider value={{ session, ready, signOut, openModal, closeModal }}>
      {children}
      {modalOpen && <AuthModal onClose={closeModal} />}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
