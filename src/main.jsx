import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  supabase, configured
} from "./supabase";
import {
  ShoppingBag, LayoutDashboard, Utensils, Image as ImageIcon, Users,
  ClipboardList, LogOut, Plus, Minus, Trash2, RefreshCw, Search,
  ChefHat, Waves, CheckCircle2, Clock3, X, Menu, Upload, ShieldCheck, Pencil, Award, Gift, PackageCheck, UserPlus
} from "lucide-react";
import "./style.css";

const money = (n) => `₹${Number(n || 0).toFixed(2)}`;
const statusList = ["pending", "preparing", "ready", "completed", "cancelled"];

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState("menu");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) setProfile(null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setProfile(null); return; }
    supabase.from("profiles").select("*").eq("id", session.user.id).single()
      .then(({ data, error: e }) => {
        if (e) setError(e.message);
        else if (!data?.is_active) {
          setError("This account is disabled. Please contact the café administrator.");
          supabase.auth.signOut();
        } else setProfile(data);
      });
  }, [session]);

  useEffect(() => {
    if (profile?.role === "customer" && view === "login") setView("account");
    if (profile?.role === "customer" && view === "signup") setView("account");
  }, [profile, view]);

  useEffect(() => {
    if (notice) { const t = setTimeout(() => setNotice(""), 3500); return () => clearTimeout(t); }
  }, [notice]);

  if (!configured) return <SetupScreen />;
  if (loading || (session && !profile && !error)) return <div className="center-screen"><div className="spinner"/>Loading SnapEats…</div>;

  const isAdmin = profile?.role === "super_admin";
  const isStaff = profile?.role === "staff";
  const isCustomer = profile?.role === "customer";
  const logout = async () => { await supabase.auth.signOut(); setView("menu"); setError(""); };

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" onClick={e => {e.preventDefault(); setView("menu");}}>
        <span className="brand-mark"><Waves size={22}/></span>
        <span><b>SnapEats</b><small>UNNIYAL BEACH</small></span>
      </a>
      <div className="top-actions">
        <span className="location-pill">☀ Beachside café</span>
        {profile ? <>
          <span className="user-pill">{profile.full_name || session.user.email} · {isAdmin ? "Admin" : isStaff ? "Staff" : "Customer"}</span>
          {isCustomer && <button className="btn btn-outline btn-small" onClick={() => setView("account")}>My account</button>}
          <button className="icon-btn" onClick={logout} title="Log out"><LogOut size={18}/></button>
        </> : <>
          <button className="btn btn-outline btn-small" onClick={() => setView("login")}>Customer / Staff login</button>
          <button className="btn btn-dark btn-small" onClick={() => setView("signup")}>Create account</button>
        </>}
      </div>
    </header>

    {notice && <div className="toast"><CheckCircle2 size={17}/>{notice}</div>}
    {error && <div className="alert"><span>{error}</span><button onClick={() => setError("")}><X size={16}/></button></div>}

    {(!profile || isCustomer) && view !== "login" && view !== "signup" && view !== "account" && <PublicMenu profile={isCustomer ? profile : null} onLogin={() => setView("login")} onAccount={() => setView("account")} setNotice={setNotice}/>}
    {!profile && view === "login" && <Login onBack={() => setView("menu")} onSignup={() => setView("signup")} setError={setError}/>}
    {!profile && view === "signup" && <CustomerSignup onBack={() => setView("menu")} onLogin={() => setView("login")} setError={setError} setNotice={setNotice}/>}
    {isCustomer && view === "account" && <CustomerPortal profile={profile} setNotice={setNotice} setError={setError} onMenu={() => setView("menu")}/>}
    {isStaff && <StaffPortal profile={profile} setNotice={setNotice} setError={setError}/>}
    {isAdmin && <AdminPortal profile={profile} setNotice={setNotice} setError={setError}/>}
    <footer className="footer">© {new Date().getFullYear()} SnapEats · Unniyal Beach</footer>
  </div>;
}