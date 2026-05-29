'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

interface Address {
  id: string;
  label: string;
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postal: string;
  country: string;
  isDefault: boolean;
}

interface ProfileData {
  fullName: string;
  phone: string;
  alternatePhone: string;
  gender: string;
  email: string;
  addresses: Address[];
}

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

const STORAGE_KEY = 'layo_profile';

function loadProfile(email: string): ProfileData {
  if (typeof window === 'undefined') return { fullName: '', phone: '', alternatePhone: '', gender: '', email, addresses: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { fullName: '', phone: '', alternatePhone: '', gender: '', email, addresses: [] };
    return JSON.parse(raw);
  } catch { return { fullName: '', phone: '', alternatePhone: '', gender: '', email, addresses: [] }; }
}

function saveProfile(p: ProfileData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<ProfileData>>({});
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState<Partial<Address>>({});
  const [editAddressId, setEditAddressId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      const p = loadProfile(user.email ?? '');
      if (!p.fullName) p.fullName = user.user_metadata?.full_name ?? '';
      if (!p.email) p.email = user.email ?? '';
      setProfile(p);
    }
  }, [user]);

  if (loading || !user || !profile) {
    return <div className="min-h-screen bg-[#131313] flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const startEdit = () => { setDraft({ ...profile }); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setDraft({}); };
  const saveEdit = () => {
    const updated = { ...profile, ...draft };
    setProfile(updated);
    saveProfile(updated);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const openAddAddress = (addr?: Address) => {
    if (addr) { setAddressDraft({ ...addr }); setEditAddressId(addr.id); }
    else { setAddressDraft({}); setEditAddressId(null); }
    setShowAddAddress(true);
  };

  const saveAddress = () => {
    if (!addressDraft.line1 || !addressDraft.city || !addressDraft.postal) return;
    const addr: Address = {
      id: editAddressId ?? Date.now().toString(),
      label: addressDraft.label || 'Home',
      line1: addressDraft.line1 ?? '',
      line2: addressDraft.line2,
      city: addressDraft.city ?? '',
      province: addressDraft.province ?? '',
      postal: addressDraft.postal ?? '',
      country: addressDraft.country || 'Canada',
      isDefault: addressDraft.isDefault ?? profile.addresses.length === 0,
    };
    let addresses: Address[];
    if (editAddressId) {
      addresses = profile.addresses.map(a => a.id === editAddressId ? addr : a);
    } else {
      addresses = [...profile.addresses, addr];
    }
    if (addr.isDefault) addresses = addresses.map(a => ({ ...a, isDefault: a.id === addr.id }));
    const updated = { ...profile, addresses };
    setProfile(updated);
    saveProfile(updated);
    setShowAddAddress(false);
    setAddressDraft({});
    setEditAddressId(null);
  };

  const removeAddress = (id: string) => {
    const addresses = profile.addresses.filter(a => a.id !== id);
    const updated = { ...profile, addresses };
    setProfile(updated);
    saveProfile(updated);
  };

  const setDefault = (id: string) => {
    const addresses = profile.addresses.map(a => ({ ...a, isDefault: a.id === id }));
    const updated = { ...profile, addresses };
    setProfile(updated);
    saveProfile(updated);
  };

  return (
    <div className="bg-[#131313] min-h-screen text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#131313]/95 backdrop-blur-md border-b border-white/10 flex items-center gap-3 px-5 h-[10vh]">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:text-white transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <Link href="/"><Logo showTagline={false} /></Link>
        <div className="flex-1" />
        {saved && <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Saved!</span>}
        {editing ? (
          <div className="flex gap-2">
            <button onClick={cancelEdit} className="text-xs text-on-surface-variant font-bold hover:text-white px-3 py-1.5 rounded-lg border border-white/10">Cancel</button>
            <button onClick={saveEdit} className="text-xs text-primary font-bold hover:brightness-110 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30">Save</button>
          </div>
        ) : (
          <button onClick={startEdit} className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-sm leading-none">edit</span> Edit
          </button>
        )}
      </header>

      <main className="flex-grow px-5 py-6 max-w-lg mx-auto w-full space-y-6">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-2 pt-2 pb-4">
          <div className="w-20 h-20 rounded-full border-2 border-primary/40 bg-surface-container flex items-center justify-center text-primary font-black text-3xl">
            {(profile.fullName || user.email || 'U').charAt(0).toUpperCase()}
          </div>
          <p className="text-white font-bold text-lg">{profile.fullName || user.email?.split('@')[0]}</p>
          <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Platinum Member</p>
        </div>

        {/* Basic Info */}
        <section className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary border-l-4 border-primary pl-3">Basic Info</h2>
          <div className="space-y-2">
            {[
              { label: 'Full Name', field: 'fullName' as const, type: 'text', placeholder: 'Enter your full name' },
              { label: 'Email', field: 'email' as const, type: 'email', placeholder: 'your@email.com', readOnly: true },
              { label: 'Phone Number', field: 'phone' as const, type: 'tel', placeholder: '+1 (555) 000-0000' },
              { label: 'Alternate Phone', field: 'alternatePhone' as const, type: 'tel', placeholder: '+1 (555) 000-0001' },
            ].map(({ label, field, type, placeholder, readOnly }) => (
              <div key={field} className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3">
                <p className="text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">{label}</p>
                {editing && !readOnly ? (
                  <input
                    type={type}
                    value={(draft as any)[field] ?? profile[field]}
                    onChange={e => setDraft(prev => ({ ...prev, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-transparent text-sm text-white outline-none placeholder:text-on-surface-variant/40"
                  />
                ) : (
                  <p className={`text-sm ${(profile[field] || readOnly) ? 'text-white' : 'text-on-surface-variant/40 italic'}`}>
                    {profile[field] || placeholder}
                  </p>
                )}
              </div>
            ))}

            {/* Gender */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3">
              <p className="text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-2">Gender</p>
              {editing ? (
                <div className="flex flex-wrap gap-2">
                  {GENDERS.map(g => (
                    <button
                      key={g}
                      onClick={() => setDraft(prev => ({ ...prev, gender: g }))}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                        (draft.gender ?? profile.gender) === g
                          ? 'bg-primary text-background border-primary'
                          : 'border-white/10 text-on-surface-variant hover:border-white/20'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              ) : (
                <p className={`text-sm ${profile.gender ? 'text-white' : 'text-on-surface-variant/40 italic'}`}>
                  {profile.gender || 'Not set'}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Addresses */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary border-l-4 border-primary pl-3">Delivery Addresses</h2>
            <button
              onClick={() => openAddAddress()}
              className="text-xs text-primary font-bold flex items-center gap-1 hover:underline"
            >
              <span className="material-symbols-outlined text-sm leading-none">add</span> Add
            </button>
          </div>

          {profile.addresses.length === 0 ? (
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-6 text-center">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant opacity-30">location_on</span>
              <p className="text-xs text-on-surface-variant mt-2">No addresses saved yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {profile.addresses.map(addr => (
                <div key={addr.id} className={`bg-[#1a1a1a] border rounded-xl px-4 py-3 transition-all ${addr.isDefault ? 'border-primary/30' : 'border-white/10'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white">{addr.label}</span>
                        {addr.isDefault && <span className="text-[8px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-bold">Default</span>}
                      </div>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
                        {addr.city}, {addr.province} {addr.postal}<br />
                        {addr.country}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {!addr.isDefault && (
                        <button onClick={() => setDefault(addr.id)} className="text-[9px] text-primary font-bold hover:underline px-2">Set Default</button>
                      )}
                      <button onClick={() => openAddAddress(addr)} className="w-7 h-7 flex items-center justify-center text-on-surface-variant hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button onClick={() => removeAddress(addr.id)} className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sign out */}
        <button
          onClick={() => { supabase.auth.signOut(); router.push('/'); }}
          className="w-full py-3 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-red-500/5 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Sign Out
        </button>
      </main>

      {/* Add / Edit Address Sheet */}
      {showAddAddress && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-end justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">{editAddressId ? 'Edit Address' : 'Add Address'}</h3>
              <button onClick={() => setShowAddAddress(false)} className="text-on-surface-variant hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Label (Home / Work)', key: 'label', placeholder: 'Home' },
                { label: 'Address Line 1', key: 'line1', placeholder: '123 Main St' },
                { label: 'Address Line 2 (optional)', key: 'line2', placeholder: 'Apt 4B' },
                { label: 'City', key: 'city', placeholder: 'Toronto' },
                { label: 'Province', key: 'province', placeholder: 'ON' },
                { label: 'Postal Code', key: 'postal', placeholder: 'M5V 2T6' },
                { label: 'Country', key: 'country', placeholder: 'Canada' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-[9px] uppercase tracking-widest font-bold text-on-surface-variant block mb-1">{label}</label>
                  <input
                    type="text"
                    value={(addressDraft as any)[key] ?? ''}
                    onChange={e => setAddressDraft(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none placeholder:text-on-surface-variant/40 focus:border-primary/40"
                  />
                </div>
              ))}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addressDraft.isDefault ?? false}
                  onChange={e => setAddressDraft(prev => ({ ...prev, isDefault: e.target.checked }))}
                  className="accent-[#f2ca50]"
                />
                <span className="text-xs text-on-surface-variant font-semibold">Set as default address</span>
              </label>
            </div>

            <button
              onClick={saveAddress}
              disabled={!addressDraft.line1 || !addressDraft.city || !addressDraft.postal}
              className="w-full py-3 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 transition-all disabled:opacity-40"
            >
              Save Address
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
