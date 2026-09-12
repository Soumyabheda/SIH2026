import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Filter,
  Globe,
  Handshake,
  Leaf,
  LineChart,
  MapPin,
  Menu,
  Navigation,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Sprout,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth, type Profile } from '@/lib/auth';
import type { Crop, Listing, Market, MarketPrice, Policy } from '@/types/database';
import { languages, makeT, translatePolicy, type Lang } from '@/lib/i18n';

const fallbackCrops: Crop[] = [
  { id: 'rice', name: 'Rice (Paddy)', category: 'Cereals', unit: 'Quintal' },
  { id: 'wheat', name: 'Wheat', category: 'Cereals', unit: 'Quintal' },
  { id: 'onion', name: 'Onion', category: 'Vegetables', unit: 'Quintal' },
  { id: 'tomato', name: 'Tomato', category: 'Vegetables', unit: 'Quintal' },
  { id: 'soybean', name: 'Soybean', category: 'Oilseeds', unit: 'Quintal' },
  { id: 'cotton', name: 'Cotton', category: 'Cash Crops', unit: 'Bale' },
];

const fallbackPrices: MarketPrice[] = [
  { id: '1', crop_id: 'rice', market_id: 'azadpur', price_date: new Date().toISOString(), min_price: 2180, max_price: 2440, modal_price: 2320, arrival_qty: 1250, unit: 'Quintal', crops: fallbackCrops[0], markets: { id: 'azadpur', name: 'Azadpur Mandi', state: 'Delhi', district: 'North Delhi', market_type: 'APMC Mandi', latitude: 28.696, longitude: 77.168 } },
  { id: '2', crop_id: 'wheat', market_id: 'narela', price_date: new Date().toISOString(), min_price: 2240, max_price: 2380, modal_price: 2310, arrival_qty: 980, unit: 'Quintal', crops: fallbackCrops[1], markets: { id: 'narela', name: 'Narela Mandi', state: 'Delhi', district: 'North Delhi', market_type: 'APMC Mandi', latitude: 28.822, longitude: 77.099 } },
  { id: '3', crop_id: 'onion', market_id: 'lasalgaon', price_date: new Date().toISOString(), min_price: 1860, max_price: 2680, modal_price: 2240, arrival_qty: 2340, unit: 'Quintal', crops: fallbackCrops[2], markets: { id: 'lasalgaon', name: 'Lasalgaon Mandi', state: 'Maharashtra', district: 'Nashik', market_type: 'APMC Mandi', latitude: 20.143, longitude: 74.23 } },
  { id: '4', crop_id: 'soybean', market_id: 'indore', price_date: new Date().toISOString(), min_price: 4480, max_price: 4920, modal_price: 4760, arrival_qty: 670, unit: 'Quintal', crops: fallbackCrops[4], markets: { id: 'indore', name: 'Indore Mandi', state: 'Madhya Pradesh', district: 'Indore', market_type: 'APMC Mandi', latitude: 22.7196, longitude: 75.8577 } },
  { id: '5', crop_id: 'cotton', market_id: 'rajkot', price_date: new Date().toISOString(), min_price: 7040, max_price: 7620, modal_price: 7350, arrival_qty: 420, unit: 'Bale', crops: fallbackCrops[5], markets: { id: 'rajkot', name: 'Rajkot Market', state: 'Gujarat', district: 'Rajkot', market_type: 'APMC Mandi', latitude: 22.3039, longitude: 70.8022 } },
];

const fallbackPolicies: Policy[] = [
  { id: 'p1', title: 'PM-KISAN Samman Nidhi', category: 'Income Support', ministry: 'Ministry of Agriculture', description: 'Direct income support of ₹6,000 per year to small and marginal farmers, paid in three equal installments.', eligibility: 'Small and marginal farmers holding cultivable land up to 2 hectares.', benefits: '₹6,000 per year directly to your bank account.', application_url: 'https://pmkisan.gov.in', state: null },
  { id: 'p2', title: 'Pradhan Mantri Fasal Bima Yojana', category: 'Insurance', ministry: 'Ministry of Agriculture', description: 'Crop insurance protection against natural calamities, pests, and diseases at an affordable premium.', eligibility: 'All farmers including sharecroppers and tenant farmers growing notified crops.', benefits: 'Coverage against natural calamities, pests, diseases, and localized risks.', application_url: 'https://pmfby.gov.in', state: null },
  { id: 'p3', title: 'National Agriculture Market (eNAM)', category: 'Market Linkage', ministry: 'Ministry of Agriculture', description: 'An online trading platform connecting farmers with buyers across participating APMC mandis.', eligibility: 'Farmers, traders, and buyers registered on the eNAM platform.', benefits: 'Transparent trading, wider market access, and better price realization.', application_url: 'https://enam.gov.in', state: null },
  { id: 'p4', title: 'Kisan Credit Card', category: 'Credit', ministry: 'Ministry of Finance', description: 'Flexible short-term credit for crop production, post-harvest needs, and allied activities.', eligibility: 'Farmers, sharecroppers, tenant farmers, and oral lessees.', benefits: 'Credit up to ₹3 lakh at a subsidized interest rate.', application_url: 'https://www.myscheme.gov.in/schemes/kcc', state: null },
];

const navKeys = [
  { labelKey: 'nav.overview', icon: LineChart, key: 'overview' },
  { labelKey: 'nav.prices', icon: TrendingUp, key: 'prices' },
  { labelKey: 'nav.marketplace', icon: Handshake, key: 'marketplace' },
  { labelKey: 'nav.policies', icon: ShieldCheck, key: 'policies' },
  { labelKey: 'nav.nearby', icon: MapPin, key: 'nearby' },
  { labelKey: 'verification.badge', icon: ShieldCheck, key: 'verification' },
];

const formatCurrency = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`;
const formatDate = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function App() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  const [lang, setLang] = useState<Lang>('en');
  const [langOpen, setLangOpen] = useState(false);
  const t = useMemo(() => makeT(lang), [lang]);
  const [prices, setPrices] = useState<MarketPrice[]>(fallbackPrices);
  const [crops, setCrops] = useState<Crop[]>(fallbackCrops);
  const [policies, setPolicies] = useState<Policy[]>(fallbackPolicies);
  const [listings, setListings] = useState<Listing[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [showListingForm, setShowListingForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const [cropResult, priceResult, policyResult, listingResult, marketResult] = await Promise.all([
        supabase.from('crops').select('id, name, category, unit').order('name'),
        supabase.from('market_prices').select('id, crop_id, market_id, price_date, min_price, max_price, modal_price, arrival_qty, unit, crops(id, name, category, unit), markets(id, name, state, district)').eq('price_date', new Date().toISOString().slice(0, 10)).order('modal_price', { ascending: false }).limit(50),
        supabase.from('gov_policies').select('id, title, category, ministry, description, eligibility, benefits, application_url, state').order('created_at', { ascending: false }),
        supabase.from('farmer_listings').select('id, crop_name, farmer_name, quantity, unit, asking_price, state, district, contact_phone, quality_grade, description, created_at').eq('is_active', true).order('created_at', { ascending: false }).limit(20),
        supabase.from('markets').select('id, name, state, district, market_type, latitude, longitude').order('name'),
      ]);
      if (cropResult.data?.length) setCrops(cropResult.data as Crop[]);
      if (priceResult.data?.length) setPrices(priceResult.data.map((price) => ({ ...price, crops: Array.isArray(price.crops) ? price.crops[0] ?? null : price.crops, markets: Array.isArray(price.markets) ? price.markets[0] ?? null : price.markets })) as MarketPrice[]);
      if (policyResult.data?.length) setPolicies(policyResult.data as Policy[]);
      if (listingResult.data) setListings(listingResult.data as Listing[]);
      if (marketResult.data) setMarkets(marketResult.data as Market[]);
      setLoading(false);
    };
    void loadData();
  }, []);

  const navigate = (view: string) => {
    setActiveView(view);
    setIsMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3200);
  };

  const currentLang = languages.find((l) => l.code === lang)!;

  if (authLoading) return <div className="auth-loading"><Sprout size={30} /><span>CropXChange</span></div>;
  if (!user) return <AuthScreen />;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${isMobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><Sprout size={21} strokeWidth={2.4} /></div>
          <div><div className="brand-name">CropXChange</div><div className="brand-caption">MARKET INTELLIGENCE</div></div>
          <button className="mobile-close" onClick={() => setIsMobileNavOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <div className="side-label">{t('nav.workspace')}</div>
        <nav className="side-nav">
          {navKeys.map(({ labelKey, icon: Icon, key }) => (
            <button key={key} className={`nav-item ${activeView === key ? 'active' : ''}`} onClick={() => navigate(key)}>
              <Icon size={18} /><span>{t(labelKey)}</span>{key === 'prices' && <span className="nav-live">{t('nav.live')}</span>}
            </button>
          ))}
        </nav>
        <div className="side-divider" />
        <button className="nav-item alert-nav" onClick={() => notify(t('toast.alertsReady'))}><Bell size={18} /><span>{t('nav.alerts')}</span><span className="alert-dot" /></button>
        <div className="sidebar-bottom">
          <div className="trust-card"><div className="trust-icon"><ShieldCheck size={18} /></div><div><strong>{t('sidebar.trusted')}</strong><p>{t('sidebar.trustedDesc')}</p></div></div>
          <button className="profile-chip profile-button" onClick={() => navigate('verification')}><div className="avatar">{profile?.full_name?.slice(0, 2).toUpperCase() ?? 'RK'}</div><div><strong>{profile?.full_name ?? t('sidebar.farmerWorkspace')}</strong><span>{profile?.verification_status === 'verified' ? t('verification.verified') : t('verification.status')}</span></div><ChevronDown size={16} /></button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setIsMobileNavOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
          <div className="breadcrumbs"><span>CropXChange</span><ChevronRight size={14} /><strong>{t(navKeys.find((item) => item.key === activeView)?.labelKey ?? 'nav.overview')}</strong></div>
          <div className="top-actions">
            <span className="data-status"><i /> {t('topbar.refreshed')}</span>
            <div className="lang-switcher">
              <button className="lang-button" onClick={() => setLangOpen((v) => !v)}>
                <Globe size={16} /><span>{currentLang.label}</span><ChevronDown size={14} />
              </button>
              {langOpen && (
                <>
                  <div className="lang-overlay" onClick={() => setLangOpen(false)} />
                  <div className="lang-dropdown">
                    {languages.map((l) => (
                      <button key={l.code} className={`lang-option ${l.code === lang ? 'selected' : ''}`} onClick={() => { setLang(l.code); setLangOpen(false); }}>
                        <span>{l.label}</span>{l.code === lang && <Check size={15} />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button className="icon-button" onClick={() => notify(t('topbar.notifications'))} aria-label="Notifications"><Bell size={19} /></button>
            <button className="top-avatar" onClick={() => navigate('verification')} aria-label="Profile" title={profile?.full_name ?? ''}>{profile?.full_name?.slice(0, 2).toUpperCase() ?? 'RK'}</button>
          </div>
        </header>
        <div className="content-wrap">
          {activeView === 'overview' && <Overview t={t} prices={prices} policies={policies} onNavigate={navigate} userName={profile?.full_name ?? 'user'} />}
          {activeView === 'prices' && <PricesView t={t} prices={prices} crops={crops} onNotify={notify} loading={loading} />}
          {activeView === 'marketplace' && <MarketplaceView t={t} listings={listings} onAdd={() => setShowListingForm(true)} onNotify={notify} />}
          {activeView === 'policies' && <PoliciesView t={t} policies={policies} lang={lang} />}
          {activeView === 'nearby' && <NearbyMandisView t={t} markets={markets} prices={prices} crops={crops} onNotify={notify} />}
          {activeView === 'verification' && <VerificationView t={t} profile={profile} />}
        </div>
      </main>
      {showListingForm && <ListingModal t={t} crops={crops} onClose={() => setShowListingForm(false)} onCreated={(listing) => { setListings((current) => [listing, ...current]); setShowListingForm(false); notify(t('modal.published')); }} />}
      <button className="floating-signout" onClick={() => void signOut()}>{t('auth.logout')}</button>
      {toast && <div className="toast"><Check size={17} />{toast}</div>}
    </div>
  );
}

type TFunc = (key: string) => string;

function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [lang, setLang] = useState<Lang>('en');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [role, setRole] = useState<'farmer' | 'buyer'>('farmer');
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const t = makeT(lang);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    if (mode === 'login') {
      const result = await signIn(form.email.trim(), form.password);
      if (result.error) setError(result.error);
    } else {
      const result = await signUp(form.email.trim(), form.password, form.fullName, role);
      if (result.error) {
        const msg = result.error.toLowerCase();
        if (msg.includes('already')) setError('An account with this email already exists. Please sign in instead.');
        else if (msg.includes('weak') || msg.includes('pwned')) setError('That password is too common or easy to guess. Please choose a stronger password.');
        else setError(result.error);
      } else setNotice(t('auth.accountCreated'));
    }
    setSaving(false);
  };
  return <div className="auth-page"><div className="auth-visual"><div className="auth-brand"><div className="brand-mark"><Sprout size={22} /></div><span>CropXChange</span></div><div className="auth-quote"><span>MARKET INTELLIGENCE</span><h1>{t('auth.subtitle')}</h1><p>{t('verification.desc')}</p></div><div className="auth-visual-footer"><ShieldCheck size={16} /> {t('sidebar.trustedDesc')}</div></div><div className="auth-panel"><div className="auth-language"><Globe size={15} /><select value={lang} onChange={(event) => setLang(event.target.value as Lang)}>{languages.map((language) => <option key={language.code} value={language.code}>{language.label}</option>)}</select></div><div className="auth-form-wrap"><div className="auth-mobile-brand"><div className="brand-mark"><Sprout size={20} /></div><strong>CropXChange</strong></div><span className="eyebrow">{t('auth.welcome')}</span><h2>{mode === 'login' ? t('auth.login') : t('auth.signup')}</h2><p className="auth-helper">{t('auth.subtitle')}</p><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>{t('auth.login')}</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>{t('auth.signup')}</button></div><form onSubmit={submit}>{mode === 'signup' && <><label>{t('auth.fullName')}<input required value={form.fullName} onChange={(event) => update('fullName', event.target.value)} /></label><label>{t('auth.role')}<select value={role} onChange={(event) => setRole(event.target.value as 'farmer' | 'buyer')}><option value="farmer">{t('auth.farmer')}</option><option value="buyer">{t('auth.buyer')}</option></select></label></>}<label>{t('auth.email')}<input required type="email" value={form.email} onChange={(event) => update('email', event.target.value)} /></label><label>{t('auth.password')}<input required minLength={6} type="password" value={form.password} onChange={(event) => update('password', event.target.value)} />{mode === 'signup' && <small className="auth-hint">Use at least 6 characters. Avoid common passwords like "password" or "123456".</small>}</label>{error && <div className="auth-error">{error}</div>}{notice && <div className="auth-notice">{notice}</div>}<button className="auth-submit" disabled={saving}>{saving ? '…' : mode === 'login' ? t('auth.loginAction') : t('auth.signupAction')} <ArrowUpRight size={16} /></button></form><p className="auth-switch">{mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')} <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>{mode === 'login' ? t('auth.createOne') : t('auth.signInHere')}</button></p></div></div></div>;
}

function VerificationView({ t, profile }: { t: TFunc; profile: Profile | null }) {
  const { user, refreshProfile } = useAuth();
  const [docType, setDocType] = useState('aadhaar');
  const [docNumber, setDocNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const status = profile?.verification_status ?? 'unverified';
  const statusLabel = status === 'verified' ? t('verification.verified') : status === 'pending' ? t('verification.pending') : status === 'rejected' ? t('verification.rejected') : t('verification.unverified');
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!user) return; setSaving(true); const { error } = await supabase.from('profiles').update({ verification_doc_type: docType, verification_doc_number: docNumber.slice(-4), verification_status: 'pending', verification_notes: null }).eq('id', user.id); if (!error) { await refreshProfile(); setNotice(t('verification.submitted')); } setSaving(false); };
  return <><PageIntro eyebrow={t('verification.badge')} title={t('verification.title')} description={t('verification.desc')} /><div className="verification-grid"><section className="verification-card"><div className="verification-status-head"><span className={`verification-icon ${status}`}><ShieldCheck size={23} /></span><div><span>{t('verification.status')}</span><strong>{statusLabel}</strong></div></div>{status === 'unverified' && <form className="verification-form" onSubmit={submit}><label>{t('verification.documentType')}<select value={docType} onChange={(event) => setDocType(event.target.value)}><option value="aadhaar">{t('verification.aadhaar')}</option><option value="pan">{t('verification.pan')}</option><option value="land_records">{t('verification.landRecords')}</option><option value="other">{t('verification.other')}</option></select></label><label>{t('verification.documentNumber')}<input required minLength={4} maxLength={4} inputMode="numeric" value={docNumber} onChange={(event) => setDocNumber(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="1234" /></label><p className="security-note"><ShieldCheck size={14} /> {t('verification.note')}</p><button className="primary-button" disabled={saving}>{saving ? '…' : t('verification.submit')} <ArrowUpRight size={16} /></button></form>}{status === 'pending' && <p className="verification-message">{t('verification.pendingDesc')}</p>}{status === 'verified' && <p className="verification-message">{t('verification.verifiedDesc')}</p>}{status === 'rejected' && <form className="verification-form" onSubmit={submit}><p className="verification-message">{profile?.verification_notes ?? t('verification.pendingDesc')}</p><button className="primary-button">{t('verification.start')} <ArrowUpRight size={16} /></button></form>}{notice && <div className="auth-notice">{notice}</div>}</section><section className="verification-benefits"><span className="eyebrow">{profile?.role === 'buyer' ? t('verification.buyer') : t('verification.farmer')}</span><h2>{t('verification.title')}</h2><div><Check size={16} /><span>{t('verification.verifiedDesc')}</span></div><div><Check size={16} /><span>{t('payment.desc')}</span></div></section></div></>;
}

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-intro"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

function useLiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function Overview({ t, prices, policies, onNavigate, userName }: { t: TFunc; prices: MarketPrice[]; policies: Policy[]; onNavigate: (view: string) => void; userName: string }) {
  const topPrices = prices.slice(0, 4);
  const now = useLiveClock();
  const hour = now.getHours();
  const greetingKey = hour < 12 ? 'overview.greeting' : hour < 17 ? 'overview.greetingAfternoon' : 'overview.greetingEvening';
  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  return <>
    <PageIntro eyebrow={`${dateStr} · ${timeStr}`} title={`${t(greetingKey)}, ${userName}`} description={t('overview.greetingDesc')} action={<button className="primary-button" onClick={() => onNavigate('marketplace')}><Plus size={17} /> {t('overview.listProduce')}</button>} />
    <div className="stat-grid">
      <StatCard icon={CircleDollarSign} label={t('overview.avgPrice')} value={formatCurrency(3180)} suffix={t('overview.perQuintal')} trend="8.4%" direction="up" accent="green" t={t} />
      <StatCard icon={Users} label={t('overview.activeBuyers')} value="1,284" suffix={t('overview.thisWeek')} trend="12.1%" direction="up" accent="blue" t={t} />
      <StatCard icon={Package} label={t('overview.produceListed')} value="18,460" suffix={t('overview.quintals')} trend="6.2%" direction="up" accent="amber" t={t} />
      <StatCard icon={ShieldCheck} label={t('overview.schemesAvail')} value={String(policies.length || 15)} suffix={t('overview.forYou')} trend={t('overview.updated')} direction="flat" accent="slate" t={t} />
    </div>
    <div className="dashboard-grid">
      <section className="panel prices-panel"><PanelHeading title={t('overview.marketPulse')} subtitle={t('overview.marketPulseSub')} action={<button className="text-button" onClick={() => onNavigate('prices')}>{t('overview.viewAllPrices')} <ArrowUpRight size={15} /></button>} /><div className="price-table"><div className="table-head"><span>{t('prices.commodity')}</span><span>{t('prices.marketLocation')}</span><span>{t('prices.modalPrice')}</span><span>{t('overview.watchClosely')}</span></div>{topPrices.map((price, index) => <PriceRow key={price.id} price={price} index={index} />)}</div></section>

    </div>
    <div className="dashboard-grid lower-grid"><section className="panel opportunity-panel"><PanelHeading title={t('overview.sellDemand')} subtitle={t('overview.sellDemandSub')} action={<button className="text-button" onClick={() => onNavigate('marketplace')}>{t('overview.exploreBuyers')} <ArrowUpRight size={15} /></button>} /><div className="opportunity"><div className="opportunity-icon"><Handshake size={21} /></div><div className="opportunity-copy"><strong>{t('overview.wheatGradeA')}</strong><span>{t('overview.wheatBuyers')}</span></div><div className="opportunity-price">₹2,480<small>/ quintal</small></div><span className="match-pill">92% {t('overview.match')}</span></div><div className="opportunity"><div className="opportunity-icon blue"><Package size={21} /></div><div className="opportunity-copy"><strong>{t('overview.onionFresh')}</strong><span>{t('overview.onionBuyers')}</span></div><div className="opportunity-price">₹2,860<small>/ quintal</small></div><span className="match-pill">87% {t('overview.match')}</span></div></section><section className="panel policy-teaser"><PanelHeading title={t('overview.supportFarm')} subtitle={t('overview.mostViewed')} /><div className="policy-mini"><div className="policy-number">01</div><div><strong>{policies[0]?.title ?? 'PM-KISAN Samman Nidhi'}</strong><span>{t('overview.incomeSupport')}</span></div><ChevronRight size={17} /></div><div className="policy-mini"><div className="policy-number">02</div><div><strong>{policies[1]?.title ?? 'Crop insurance scheme'}</strong><span>{t('overview.insuranceProtect')}</span></div><ChevronRight size={17} /></div><button className="wide-button light" onClick={() => onNavigate('policies')}>{t('overview.browseSchemes')} <ChevronRight size={16} /></button></section></div>
  </>;
}

function StatCard({ icon: Icon, label, value, suffix, trend, direction, accent, t }: { icon: typeof Leaf; label: string; value: string; suffix: string; trend: string; direction: 'up' | 'flat'; accent: string; t: TFunc }) {
  return <div className="stat-card"><div className={`stat-icon ${accent}`}><Icon size={19} /></div><span className="stat-label">{label}</span><div className="stat-value">{value}<small>{suffix}</small></div><div className={`stat-trend ${direction}`}>{direction === 'up' ? <ArrowUpRight size={14} /> : <Clock3 size={13} />}{trend}{direction === 'up' && <span>{t('overview.vsLastWeek')}</span>}</div></div>;
}

function PanelHeading({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) { return <div className="panel-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</div>; }

function PriceRow({ price, index }: { price: MarketPrice; index: number }) { return <div className="price-row"><div className="commodity"><span className={`crop-dot crop-${index}`} /> <strong>{price.crops?.name ?? 'Crop'}</strong></div><span className="market-name">{price.markets?.name ?? 'Market'}<small>{price.markets?.state ?? 'India'}</small></span><strong className="modal-price">{formatCurrency(Number(price.modal_price))}<small>/{price.unit.toLowerCase()}</small></strong><span className="row-trend"><ArrowUpRight size={14} />{[4.2, 2.8, 6.1, 1.9][index] ?? 3.4}%</span></div>; }

function PricesView({ t, prices, crops, onNotify, loading }: { t: TFunc; prices: MarketPrice[]; crops: Crop[]; onNotify: (message: string) => void; loading: boolean }) {
  const [search, setSearch] = useState(''); const [category, setCategory] = useState('__all'); const [state, setState] = useState('__all'); const [watchCrop, setWatchCrop] = useState('');
  const rawCategories = useMemo(() => Array.from(new Set(crops.map((crop) => crop.category))), [crops]);
  const rawStates = useMemo(() => Array.from(new Set(prices.map((price) => price.markets?.state).filter(Boolean) as string[])), [prices]);
  const filtered = prices.filter((price) => { const matchesSearch = (price.crops?.name ?? '').toLowerCase().includes(search.toLowerCase()) || (price.markets?.name ?? '').toLowerCase().includes(search.toLowerCase()); const matchesCategory = category === '__all' || price.crops?.category === category; const matchesState = state === '__all' || price.markets?.state === state; return matchesSearch && matchesCategory && matchesState; });
  return <><PageIntro eyebrow={t('prices.eyebrow')} title={t('prices.title')} description={t('prices.desc')} action={<button className="outline-button" onClick={() => onNotify(t('prices.reportPrepared'))}><BookOpen size={16} /> {t('prices.downloadReport')}</button>} /><div className="price-banner"><div className="banner-mark"><TrendingUp size={23} /></div><div><strong>{t('prices.movingFavour')}</strong><p>{t('prices.movingDesc')}</p></div><div className="banner-stat"><span>{t('prices.confidence')}</span><strong>{t('prices.high')} <i /></strong></div></div><div className="filter-bar"><div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('prices.searchPlaceholder')} /></div><div className="select-wrap"><Filter size={15} /><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="__all">{t('prices.allCrops')}</option>{rawCategories.map((item) => <option key={item} value={item}>{t(item)}</option>)}</select><ChevronDown size={15} /></div><div className="select-wrap"><MapPin size={15} /><select value={state} onChange={(event) => setState(event.target.value)}><option value="__all">{t('prices.allStates')}</option>{rawStates.map((item) => <option key={item} value={item}>{t(item)}</option>)}</select><ChevronDown size={15} /></div><span className="result-count">{filtered.length} {t('prices.results')}</span></div><section className="panel full-panel"><div className="table-head full"><span>{t('prices.commodity')}</span><span>{t('prices.marketLocation')}</span><span>{t('prices.minMax')}</span><span>{t('prices.modalPrice')}</span><span>{t('prices.arrivals')}</span><span>{t('prices.updated')}</span><span /></div>{loading ? <div className="empty-state">{t('prices.loading')}</div> : filtered.map((price, index) => <div className="price-row full" key={price.id}><div className="commodity"><span className={`crop-dot crop-${index % 6}`} /><strong>{price.crops?.name ?? 'Crop'}</strong><small>{t(price.crops?.category ?? 'prices.produce')}</small></div><span className="market-name">{price.markets?.name ?? 'Market'}<small><MapPin size={12} /> {price.markets?.district ?? (t(price.markets?.state ?? '') || price.markets?.state || 'India')}</small></span><span className="range-price">{formatCurrency(Number(price.min_price))} — {formatCurrency(Number(price.max_price))}</span><strong className="modal-price">{formatCurrency(Number(price.modal_price))}<small>/{price.unit.toLowerCase()}</small></strong><span className="arrival">{Number(price.arrival_qty ?? 0).toLocaleString('en-IN')} <small>{t('prices.qtl')}</small></span><span className="updated">{t('prices.today')}<br /><small>09:30 AM</small></span><button className={`watch-button ${watchCrop === price.crop_id ? 'watched' : ''}`} onClick={() => { setWatchCrop(price.crop_id); onNotify(t('prices.alertSet')); }}><Bell size={15} /></button></div>)}{!filtered.length && <div className="empty-state">{t('prices.noMatch')}</div>}</section><div className="source-note"><ShieldCheck size={15} /> {t('prices.sourceNote')}</div></>;
}

function MarketplaceView({ t, listings, onAdd, onNotify }: { t: TFunc; listings: Listing[]; onAdd: () => void; onNotify: (message: string) => void }) { const [search, setSearch] = useState(''); const filtered = listings.filter((listing) => listing.crop_name.toLowerCase().includes(search.toLowerCase()) || listing.state.toLowerCase().includes(search.toLowerCase())); return <><PageIntro eyebrow={t('market.eyebrow')} title={t('market.title')} description={t('market.desc')} action={<button className="primary-button" onClick={onAdd}><Plus size={17} /> {t('market.listProduce')}</button>} /><div className="linkage-stats"><div><Handshake size={19} /><strong>2,840</strong><span>{t('market.verifiedBuyers')}</span></div><div><MapPin size={19} /><strong>20+</strong><span>{t('market.marketsConnected')}</span></div><div><ShieldCheck size={19} /><strong>₹1.8Cr</strong><span>{t('market.tradedMonth')}</span></div></div><div className="marketplace-toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('market.searchPlaceholder')} /></div><button className="outline-button" onClick={() => onNotify(t('market.buyerReqsSoon'))}>{t('market.viewBuyerReqs')} <ArrowUpRight size={16} /></button></div><section className="listing-grid">{filtered.length ? filtered.map((listing) => <ListingCard key={listing.id} listing={listing} onNotify={onNotify} t={t} />) : <div className="empty-state">{t('market.noListings')}</div>}</section></>; }

function ListingCard({ listing, onNotify, t }: { listing: Listing; onNotify: (message: string) => void; t: TFunc }) { return <article className="listing-card"><div className="listing-top"><span className="quality-badge">{t('market.grade')} {listing.quality_grade ?? 'A'}</span><span className="listing-date">{formatDate(listing.created_at)}</span></div><h3>{listing.crop_name}</h3><div className="listing-details"><span><Package size={15} /> {Number(listing.quantity).toLocaleString('en-IN')} {listing.unit}</span><span><MapPin size={15} /> {listing.district ? `${listing.district}, ` : ''}{listing.state}</span></div><div className="listing-price"><div><strong>{formatCurrency(Number(listing.asking_price))}</strong><small> / {listing.unit.toLowerCase()}</small></div><span>{t('market.askingPrice')}</span></div><div className="listing-footer"><div className="farmer-mini"><div className="avatar small">{listing.farmer_name.slice(0, 2).toUpperCase()}</div><span>{listing.farmer_name}</span></div><button className="connect-button" onClick={() => onNotify(`${t('market.contactFarmer')} ${listing.farmer_name} ${listing.contact_phone}`)}>{t('market.connect')} <ArrowUpRight size={14} /></button></div></article>; }

function PoliciesView({ t, policies, lang }: { t: TFunc; policies: Policy[]; lang: Lang }) { const [category, setCategory] = useState('__all'); const allSchemes = t('policies.allSchemes'); const categories = ['__all', ...Array.from(new Set(policies.map((policy) => policy.category)))]; const filtered = policies.filter((policy) => category === '__all' || policy.category === category); const catLabel = (cat: string) => cat === '__all' ? allSchemes : translatePolicy(lang, 'title', cat); return <><PageIntro eyebrow={t('policies.eyebrow')} title={t('policies.title')} description={t('policies.desc')} action={<div className="policy-search"><Search size={16} /><input placeholder={t('policies.searchPlaceholder')} /></div>} /><div className="category-pills">{categories.slice(0, 7).map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}>{catLabel(item)}</button>)}</div><section className="policy-grid">{filtered.map((policy, index) => <article className="policy-card" key={policy.id}><div className="policy-card-top"><span className={`policy-icon p-${index % 4}`}><ShieldCheck size={20} /></span><span className="scheme-tag">{translatePolicy(lang, 'title', policy.category)}</span></div><h3>{translatePolicy(lang, 'title', policy.title)}</h3><p>{translatePolicy(lang, 'description', policy.description)}</p><div className="policy-benefit"><span>{t('policies.whatYouGet')}</span><strong>{translatePolicy(lang, 'benefits', policy.benefits ?? t('policies.defaultBenefits'))}</strong></div><div className="policy-card-footer"><span><Check size={14} /> {t('policies.eligibilityExplained')}</span>{policy.application_url && <a href={policy.application_url} target="_blank" rel="noreferrer">{t('policies.applyMore')} <ArrowUpRight size={14} /></a>}</div></article>)}</section></>; }

function ListingModal({ t, crops, onClose, onCreated }: { t: TFunc; crops: Crop[]; onClose: () => void; onCreated: (listing: Listing) => void }) { const { user } = useAuth(); const [form, setForm] = useState({ crop_name: crops[0]?.name ?? '', farmer_name: '', quantity: '', asking_price: '', state: '', district: '', contact_phone: '', quality_grade: 'A', description: '' }); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(''); const payload = { ...form, quantity: Number(form.quantity), asking_price: Number(form.asking_price), unit: crops.find((crop) => crop.name === form.crop_name)?.unit ?? 'Quintal', user_id: user?.id }; const { data, error: insertError } = await supabase.from('farmer_listings').insert(payload).select('id, crop_name, farmer_name, quantity, unit, asking_price, state, district, contact_phone, quality_grade, description, created_at').maybeSingle(); if (insertError || !data) { setError(t('modal.error')); setSaving(false); return; } onCreated(data as Listing); }; const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value })); return <div className="modal-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><div className="modal"><div className="modal-head"><div><span className="eyebrow">{t('modal.newListing')}</span><h2>{t('modal.title')}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div><form onSubmit={submit}><div className="form-grid"><label>{t('modal.produce')}<select value={form.crop_name} onChange={(event) => update('crop_name', event.target.value)}>{crops.filter((crop) => crop.category !== 'Seeds').map((crop) => <option key={crop.id}>{crop.name}</option>)}</select></label><label>{t('modal.qualityGrade')}<select value={form.quality_grade} onChange={(event) => update('quality_grade', event.target.value)}><option>A</option><option>B</option><option>Premium</option></select></label><label>{t('modal.quantity')}<input required type="number" min="1" value={form.quantity} onChange={(event) => update('quantity', event.target.value)} placeholder={t('modal.qtyPlaceholder')} /></label><label>{t('modal.askingPerUnit')}<input required type="number" min="1" value={form.asking_price} onChange={(event) => update('asking_price', event.target.value)} placeholder={t('modal.pricePlaceholder')} /></label><label>{t('modal.farmerName')}<input required value={form.farmer_name} onChange={(event) => update('farmer_name', event.target.value)} placeholder={t('modal.namePlaceholder')} /></label><label>{t('modal.contactPhone')}<input required type="tel" value={form.contact_phone} onChange={(event) => update('contact_phone', event.target.value)} placeholder={t('modal.phonePlaceholder')} /></label><label>{t('modal.state')}<input required value={form.state} onChange={(event) => update('state', event.target.value)} placeholder={t('modal.statePlaceholder')} /></label><label>{t('modal.district')}<input value={form.district} onChange={(event) => update('district', event.target.value)} placeholder={t('modal.districtPlaceholder')} /></label></div><label className="full-label">{t('modal.description')}<textarea value={form.description} onChange={(event) => update('description', event.target.value)} placeholder={t('modal.descPlaceholder')} rows={3} /></label>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="outline-button" onClick={onClose}>{t('modal.cancel')}</button><button className="primary-button" disabled={saving}>{saving ? t('modal.publishing') : t('modal.publish')} <ArrowUpRight size={16} /></button></div></form></div></div>; }

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

type NearbyMarket = Market & { distance: number; bestPrice: MarketPrice | null; cropCount: number };

function NearbyMandisView({ t, markets, prices, crops, onNotify }: { t: TFunc; markets: Market[]; prices: MarketPrice[]; crops: Crop[]; onNotify: (message: string) => void }) {
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');
  const [stateFilter, setStateFilter] = useState('__all');
  const [cropFilter, setCropFilter] = useState('__all');
  const [sortBy, setSortBy] = useState<'distance' | 'price'>('distance');
  const [radius, setRadius] = useState(500);
  const [error, setError] = useState('');

  const states = useMemo(() => Array.from(new Set(markets.map((m) => m.state))).sort(), [markets]);

  const detectLocation = () => {
    setDetecting(true); setError('');
    if (!navigator.geolocation) { setError(t('nearby.permission')); setDetecting(false); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setDetecting(false);
        const nearby = markets.find((m) => haversine(pos.coords.latitude, pos.coords.longitude, m.latitude ?? 0, m.longitude ?? 0) < 50);
        setLocationLabel(nearby ? `${nearby.district ?? nearby.state}, ${nearby.state}` : `${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)}`);
      },
      () => { setError(t('nearby.permission')); setDetecting(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const enriched: NearbyMarket[] = useMemo(() => {
    return markets
      .filter((m) => m.latitude != null && m.longitude != null)
      .map((m) => {
        const distance = userCoords ? haversine(userCoords.lat, userCoords.lon, m.latitude!, m.longitude!) : 0;
        const marketPrices = prices.filter((p) => p.market_id === m.id);
        const cropFiltered = cropFilter === '__all' ? marketPrices : marketPrices.filter((p) => p.crop_id === cropFilter);
        const bestPrice = cropFiltered.length ? cropFiltered.reduce((best, p) => Number(p.modal_price) > Number(best.modal_price) ? p : best, cropFiltered[0]) : null;
        return { ...m, distance, bestPrice, cropCount: new Set(marketPrices.map((p) => p.crop_id)).size };
      })
      .filter((m) => stateFilter === '__all' || m.state === stateFilter)
      .filter((m) => !userCoords || m.distance <= radius)
      .sort((a, b) => {
        if (sortBy === 'distance' && userCoords) return a.distance - b.distance;
        const aPrice = a.bestPrice ? Number(a.bestPrice.modal_price) : 0;
        const bPrice = b.bestPrice ? Number(b.bestPrice.modal_price) : 0;
        return bPrice - aPrice;
      });
  }, [markets, prices, userCoords, stateFilter, cropFilter, sortBy, radius]);

  return <>
    <PageIntro eyebrow={t('nearby.eyebrow')} title={t('nearby.title')} description={t('nearby.desc')} />
    <div className="location-banner">
      <div className="location-detect-area">
        <div className={`location-orb ${userCoords ? 'detected' : ''}`}><MapPin size={22} /></div>
        <div className="location-info">
          {userCoords ? (
            <><strong>{t('nearby.youAre')}</strong><span>{locationLabel}</span></>
          ) : (
            <><strong>{t('nearby.detect')}</strong><span>{t('nearby.permission')}</span></>
          )}
        </div>
        <button className="primary-button" onClick={detectLocation} disabled={detecting}>
          {detecting ? <><Clock3 size={16} /> {t('nearby.detecting')}</> : <><MapPin size={16} /> {t('nearby.detect')}</>}
        </button>
      </div>
      {error && <p className="location-error">{error}</p>}
    </div>
    <div className="nearby-filters">
      <div className="select-wrap"><MapPin size={15} /><select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}><option value="__all">{t('nearby.allStates')}</option>{states.map((s) => <option key={s} value={s}>{t(s)}</option>)}</select><ChevronDown size={15} /></div>
      <div className="select-wrap"><Filter size={15} /><select value={cropFilter} onChange={(e) => setCropFilter(e.target.value)}><option value="__all">{t('nearby.allCrops')}</option>{crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><ChevronDown size={15} /></div>
      <div className="select-wrap"><Search size={15} /><select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'distance' | 'price')}><option value="distance">{t('nearby.sortDistance')}</option><option value="price">{t('nearby.sortPrice')}</option></select><ChevronDown size={15} /></div>
      {userCoords && <div className="select-wrap"><Navigation size={15} /><select value={radius} onChange={(e) => setRadius(Number(e.target.value))}><option value={50}>50 {t('nearby.radius')}</option><option value={100}>100 {t('nearby.radius')}</option><option value={250}>250 {t('nearby.radius')}</option><option value={500}>500 {t('nearby.radius')}</option></select><ChevronDown size={15} /></div>}
      <span className="result-count">{enriched.length} {t('nearby.mandiCount')}</span>
    </div>
    <div className="mandi-grid">
      {enriched.length ? enriched.map((market) => <article className="mandi-card" key={market.id}>
        <div className="mandi-card-top">
          <div className="mandi-icon"><MapPin size={20} /></div>
          <div className="mandi-card-head">
            <h3>{market.name}</h3>
            <span className="mandi-type">{market.market_type ?? 'Mandi'}</span>
          </div>
          {userCoords && <span className="mandi-distance-badge">{market.distance} {t('nearby.distance')}</span>}
        </div>
        <div className="mandi-location"><MapPin size={13} /> {market.district ? `${market.district}, ` : ''}{t(market.state)}</div>
        <div className="mandi-stats">
          <div className="mandi-stat"><span>{t('nearby.bestPrice')}</span>{market.bestPrice ? <strong>{formatCurrency(Number(market.bestPrice.modal_price))}<small>/{market.bestPrice.unit.toLowerCase()}</small></strong> : <span className="no-price">{t('nearby.noPrice')}</span>}</div>
          <div className="mandi-stat"><span>{t('nearby.cropsTraded')}</span><strong>{market.cropCount}</strong></div>
        </div>
        {market.bestPrice && <div className="mandi-crop-tag"><span className="crop-dot" /> {market.bestPrice.crops?.name ?? 'Crop'} · {formatCurrency(Number(market.bestPrice.min_price))}–{formatCurrency(Number(market.bestPrice.max_price))}</div>}
        <div className="mandi-actions">
          <button className="primary-button" onClick={() => onNotify(`${t('nearby.sellHere')} · ${market.name}`)}><Handshake size={15} /> {t('nearby.sellHere')}</button>
          {market.latitude && market.longitude && <a className="outline-button" href={`https://www.google.com/maps/dir/?api=1&destination=${market.latitude},${market.longitude}`} target="_blank" rel="noreferrer"><Navigation size={15} /> {t('nearby.getDirections')}</a>}
        </div>
      </article>) : <div className="empty-state">{t('nearby.noMarkets')}</div>}
    </div>
  </>;
}

export default App;
