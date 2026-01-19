
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log("VITE_SUPABASE_URL ->", import.meta.env.VITE_SUPABASE_URL);
console.log(
  "VITE_SUPABASE_ANON_KEY length ->",
  (import.meta.env.VITE_SUPABASE_ANON_KEY || "").length
);

const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (anonKey) {
  const payload = JSON.parse(atob(anonKey.split('.')[1]));
  console.log("Decoded anon key payload:", payload);
  console.log("anon.ref ->", payload.ref);
  console.log("anon.role ->", payload.role);
  console.log("anon.exp  ->", payload.exp, "now ->", Math.floor(Date.now()/1000));
  console.log("anon first 15 ->", anonKey.slice(0, 15));
}


// Remove dark mode class addition
createRoot(document.getElementById("root")!).render(<App />);
