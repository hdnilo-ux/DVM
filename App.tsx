
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  UserPlus, 
  Trash2, 
  Sparkles,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  X,
  MapPin,
  CalendarDays,
  Settings,
  Maximize2,
  Minimize2,
  FileText,
  Edit2,
  Save,
  Users,
  Eye,
  ArrowRight,
  Printer,
  Image as ImageIcon,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Menu as MenuIcon,
  Cloud,
  CloudOff
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Technician, Trip, GroupedTrip } from './types';
import { getMonthData, isDateInTrip, calculateTripDuration } from './utils/dateUtils';
import { parseTravelRequest } from './services/geminiService';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  setDoc,
  getDocs
} from 'firebase/firestore';

// Firebase Configuration (Using a fallback or placeholders)
const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: "logistica-tecnicos.firebaseapp.com",
  projectId: "logistica-tecnicos",
  storageBucket: "logistica-tecnicos.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase if config is valid (Placeholder check for the environment)
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const BRANDING_KEY = 'logistica_branding_v12_db';

const VIBRANT_COLORS = [
  '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
  '#2dd4bf', '#fb7185', '#a78bfa', '#fbbf24', '#4ade80',
  '#3b82f6', '#f43f5e', '#8b5cf6', '#14b8a6', '#f97316'
];

const getRandomColor = () => VIBRANT_COLORS[Math.floor(Math.random() * VIBRANT_COLORS.length)];

const App: React.FC = () => {
  const [year, setYear] = useState(2026);
  const [currentMonthIdx, setCurrentMonthIdx] = useState(new Date().getMonth());
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isOnline, setIsOnline] = useState(false);

  const [headerTitle, setHeaderTitle] = useState(() => localStorage.getItem(BRANDING_KEY + '_title') || 'Gestor de Viagens de Técnicos 2026');
  const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem(BRANDING_KEY + '_logo') || '');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [isPdfReportModalOpen, setIsPdfReportModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  
  const [editingTechId, setEditingTechId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newTechInput, setNewTechInput] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const [reportYear, setReportYear] = useState(2026);
  const [reportMonthIdx, setReportMonthIdx] = useState(new Date().getMonth());

  const [formData, setFormData] = useState({
    selectedTechIds: [] as string[],
    newTechName: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    destination: ''
  });

  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Real-time Sync with Firebase
  useEffect(() => {
    const q = query(collection(db, "technicians"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const techs: Technician[] = [];
      querySnapshot.forEach((doc) => {
        techs.push({ id: doc.id, ...doc.data() } as Technician);
      });
      setTechnicians(techs);
      setIsOnline(true);
    }, (error) => {
      console.error("Firebase connection error:", error);
      setIsOnline(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem(BRANDING_KEY + '_title', headerTitle);
    localStorage.setItem(BRANDING_KEY + '_logo', logoUrl);
  }, [headerTitle, logoUrl]);

  const monthData = useMemo(() => getMonthData(year, currentMonthIdx), [year, currentMonthIdx]);

  const groupedTrips = useMemo(() => {
    const groups: Record<string, GroupedTrip> = {};
    technicians.forEach(tech => {
      tech.trips.forEach(trip => {
        if (!groups[trip.groupId]) {
          groups[trip.groupId] = {
            groupId: trip.groupId,
            startDate: trip.startDate,
            endDate: trip.endDate,
            destination: trip.destination || 'Sem destino',
            color: trip.color,
            technicians: []
          };
        }
        groups[trip.groupId].technicians.push({ id: tech.id, name: tech.name });
      });
    });
    return Object.values(groups).sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [technicians]);

  const currentMonthTripsForReport = useMemo(() => {
    const monthStr = (reportMonthIdx + 1).toString().padStart(2, '0');
    return groupedTrips.filter(t => 
      (t.startDate.includes(`-${monthStr}-`) && t.startDate.includes(`${reportYear}`)) || 
      (t.endDate.includes(`-${monthStr}-`) && t.endDate.includes(`${reportYear}`))
    );
  }, [groupedTrips, reportMonthIdx, reportYear]);

  const handleNextMonth = () => setCurrentMonthIdx(prev => (prev + 1) % 12);
  const handlePrevMonth = () => setCurrentMonthIdx(prev => (prev - 1 + 12) % 12);
  const handleNextYear = () => setYear(prev => Math.min(prev + 1, 2027));
  const handlePrevYear = () => setYear(prev => Math.max(prev - 1, 2025));
  
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAddNewTechnician = async () => {
    if (!newTechInput.trim()) return;
    try {
      const techRef = collection(db, "technicians");
      await addDoc(techRef, { name: newTechInput.trim(), trips: [] });
      setNewTechInput('');
    } catch (e) {
      console.error("Error adding technician:", e);
    }
  };

  const removeTechnicianRecord = async (id: string) => {
    if (confirm("Deseja realmente excluir este técnico da nuvem?")) {
      try {
        await deleteDoc(doc(db, "technicians", id));
      } catch (e) {
        console.error("Error deleting technician:", e);
      }
    }
  };

  const updateTechnicianName = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      await updateDoc(doc(db, "technicians", id), { name: editingName.trim() });
      setEditingTechId(null);
      setEditingName('');
    } catch (e) {
      console.error("Error updating technician name:", e);
    }
  };

  const removeEntireTripGroup = async (groupId: string) => {
    if (confirm("Apagar esta operação globalmente?")) {
      try {
        const batch = technicians.map(async (tech) => {
          const updatedTrips = tech.trips.filter(trip => trip.groupId !== groupId);
          await updateDoc(doc(db, "technicians", tech.id), { trips: updatedTrips });
        });
        await Promise.all(batch);
      } catch (e) {
        console.error("Error removing trip group:", e);
      }
    }
  };

  const startEditTrip = (group: GroupedTrip) => {
    setEditingGroupId(group.groupId);
    setFormData({
      selectedTechIds: group.technicians.map(t => t.id),
      newTechName: '',
      startDate: group.startDate,
      endDate: group.endDate,
      destination: group.destination
    });
    setIsConsultModalOpen(false);
    setIsModalOpen(true);
  };

  const toggleTechSelection = (id: string) => {
    setFormData(prev => ({
      ...prev,
      selectedTechIds: prev.selectedTechIds.includes(id)
        ? prev.selectedTechIds.filter(tid => tid !== id)
        : [...prev.selectedTechIds, id]
    }));
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { selectedTechIds, startDate, endDate, destination } = formData;
    if (selectedTechIds.length === 0) return;

    const tripColor = getRandomColor();
    const gId = editingGroupId || crypto.randomUUID();

    try {
      const batch = technicians.map(async (tech) => {
        let updatedTrips = tech.trips;
        if (editingGroupId) {
          updatedTrips = updatedTrips.filter(t => t.groupId !== editingGroupId);
        }
        
        if (selectedTechIds.includes(tech.id)) {
          updatedTrips = [...updatedTrips, { 
            id: crypto.randomUUID(), 
            groupId: gId, 
            startDate, 
            endDate, 
            destination, 
            color: tripColor 
          }];
        }
        
        await updateDoc(doc(db, "technicians", tech.id), { trips: updatedTrips });
      });
      await Promise.all(batch);
      
      setIsModalOpen(false);
      setEditingGroupId(null);
      setFormData({ selectedTechIds: [], newTechName: '', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd'), destination: '' });
    } catch (e) {
      console.error("Error saving trip:", e);
    }
  };

  const handlePrintWindow = () => {
    const reportContent = document.getElementById('pdf-report-content-body')?.innerHTML;
    if (!reportContent) return;

    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório - ${headerTitle}</title>
          <style>
            body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; color: #0f172a; }
            .header { display: flex; justify-content: space-between; border-bottom: 4px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { width: 50px; height: 50px; object-fit: contain; }
            .title-main { font-size: 22px; font-weight: 900; text-transform: uppercase; margin: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
            th { background: #f8fafc; font-weight: 900; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div style="display: flex; align-items: center; gap: 15px;">
              ${logoUrl ? `<img src="${logoUrl}" class="logo" />` : ''}
              <div>
                <h1 class="title-main">${headerTitle}</h1>
                <p style="font-size: 11px; font-weight: 900; color: #4f46e5; margin: 0">RELATÓRIO DE CRONOGRAMAS</p>
              </div>
            </div>
            <div style="text-align: right">
              <p style="font-size: 18px; font-weight: 900; margin: 0">${getMonthData(reportYear, reportMonthIdx).name} / ${reportYear}</p>
            </div>
          </div>
          <table>
            <thead><tr><th>Técnico(s)</th><th>Destino</th><th>Saída</th><th>Retorno</th><th>Dias</th></tr></thead>
            <tbody>${reportContent}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleAiProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    setIsAiLoading(true);
    try {
      const result = await parseTravelRequest(aiInput);
      if (result) {
        const { technicianName, startDate, endDate, destination } = result;
        const tripColor = getRandomColor();
        const groupId = crypto.randomUUID();

        // Check if technician exists, or add them
        let tech = technicians.find(t => t.name.toLowerCase().includes(technicianName.toLowerCase()));
        
        if (!tech) {
          const techRef = collection(db, "technicians");
          const newDoc = await addDoc(techRef, { name: technicianName, trips: [] });
          const newTrip = { id: crypto.randomUUID(), groupId, startDate, endDate, destination, color: tripColor };
          await updateDoc(doc(db, "technicians", newDoc.id), { trips: [newTrip] });
        } else {
          const newTrip = { id: crypto.randomUUID(), groupId, startDate, endDate, destination, color: tripColor };
          await updateDoc(doc(db, "technicians", tech.id), { trips: [...tech.trips, newTrip] });
        }

        setAiInput('');
        setFeedback({ type: 'success', message: 'IA: Dados Sincronizados!' });
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro na IA.' });
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col bg-slate-100 transition-all ${isFullscreen ? 'fixed inset-0 z-50 overflow-auto bg-white' : ''}`}>
      
      {/* Header com Status do Firebase e Menu Sobreposto */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-[150] px-6 py-4 shadow-sm no-print">
        <div className="max-w-[2000px] mx-auto flex justify-between items-center gap-6">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setIsBrandingModalOpen(true)}>
            <div className="relative">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded-lg border border-slate-100 shadow-sm" />
              ) : (
                <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg"><CalendarIcon size={20} /></div>
              )}
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} title={isOnline ? 'Conectado à Nuvem' : 'Modo Offline'}></div>
            </div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">{headerTitle}</h1>
          </div>

          <div className="hidden lg:flex items-center gap-3 bg-slate-100 rounded-full p-1 border border-slate-200 shadow-inner">
            <button onClick={handlePrevYear} className="p-2 hover:bg-white rounded-full transition-all text-slate-500"><ChevronsLeft size={16} /></button>
            <span className="px-4 text-xs font-black text-indigo-600">{year}</span>
            <button onClick={handleNextYear} className="p-2 hover:bg-white rounded-full transition-all text-slate-500"><ChevronsRight size={16} /></button>
            <div className="w-px h-4 bg-slate-300 mx-1"></div>
            <button onClick={handlePrevMonth} className="p-2 hover:bg-white rounded-full transition-all text-slate-600"><ChevronLeft size={18} /></button>
            <span className="px-4 text-sm font-black text-slate-800 capitalize min-w-[120px] text-center">{monthData.name}</span>
            <button onClick={handleNextMonth} className="p-2 hover:bg-white rounded-full transition-all text-slate-600"><ChevronRight size={18} /></button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => { setEditingGroupId(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider hover:bg-indigo-700 shadow-md transition-all active:scale-95">
              <Plus size={16} /> <span className="hidden sm:inline">Lançar Viagem</span>
            </button>
            
            <div className="relative">
              <button onClick={() => setIsHamburgerOpen(!isHamburgerOpen)} className="p-2.5 bg-slate-100 rounded-xl text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all">
                <MenuIcon size={20} />
              </button>
              
              {isHamburgerOpen && (
                <>
                  <div className="fixed inset-0 z-[151]" onClick={() => setIsHamburgerOpen(false)}></div>
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-[2rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] border border-slate-100 py-4 z-[152] animate-in fade-in slide-in-from-top-4 duration-300">
                    <button onClick={() => { setIsHamburgerOpen(false); setIsConsultModalOpen(true); }} className="w-full flex items-center gap-4 px-6 py-4 hover:bg-indigo-50 transition-all text-slate-700 group">
                      <Eye size={18} className="text-indigo-500" /> <span className="text-xs font-black uppercase tracking-widest">Consultar</span>
                    </button>
                    <button onClick={() => { setIsHamburgerOpen(false); setIsManageModalOpen(true); }} className="w-full flex items-center gap-4 px-6 py-4 hover:bg-indigo-50 transition-all text-slate-700 group">
                      <Users size={18} className="text-emerald-500" /> <span className="text-xs font-black uppercase tracking-widest">Técnicos</span>
                    </button>
                    <button onClick={() => { setIsHamburgerOpen(false); setIsPdfReportModalOpen(true); }} className="w-full flex items-center gap-4 px-6 py-4 hover:bg-indigo-50 transition-all text-slate-700 group">
                      <FileText size={18} className="text-slate-900" /> <span className="text-xs font-black uppercase tracking-widest">Relatório PDF</span>
                    </button>
                    <div className="h-px bg-slate-100 my-2"></div>
                    <button onClick={() => { setIsHamburgerOpen(false); setIsFullscreen(!isFullscreen); }} className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-all text-slate-400">
                      {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />} <span className="text-[10px] font-black uppercase">Tela Cheia</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className={`flex-1 p-6 max-w-[2000px] mx-auto w-full space-y-6 transition-all ${isFullscreen ? 'max-w-none' : ''}`}>
        
        {!isFullscreen && (
          <section className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden no-print">
            <div className="bg-indigo-600 px-8 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <Sparkles size={14} className="animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.3em]">IA Sincronizadora de Viagens</span>
              </div>
              {feedback && <div className="text-[8px] font-black uppercase px-4 py-1 rounded-full bg-white text-indigo-600 animate-bounce">{feedback.message}</div>}
            </div>
            <form onSubmit={handleAiProcess} className="p-4 flex gap-3">
              <input 
                type="text" value={aiInput} onChange={(e) => setAiInput(e.target.value)} 
                placeholder="Ex: João e Maria viajam para Manaus do dia 15 ao 25 de Dezembro" 
                className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-400 font-bold text-sm shadow-inner transition-all"
                disabled={isAiLoading} 
              />
              <button type="submit" disabled={isAiLoading || !aiInput} className="bg-slate-900 text-white px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 shadow-lg active:scale-95 transition-all">
                {isAiLoading ? 'Processando...' : 'Processar IA'}
              </button>
            </form>
          </section>
        )}

        {/* Calendar View */}
        <div className={`bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col transition-all ${isFullscreen ? 'rounded-none border-0 h-full' : ''}`}>
          <div className="overflow-x-auto custom-scrollbar spreadsheet-container h-full">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-40">
                <tr className="bg-slate-50/95 backdrop-blur-md">
                  <th className="p-6 text-left font-black text-slate-400 uppercase tracking-widest text-[9px] sticky left-0 z-50 border-r-2 border-slate-200 w-[180px] bg-slate-50 shadow-xl shadow-black/5">Técnico</th>
                  {monthData.weeks.map((week, wIdx) => (
                    <React.Fragment key={wIdx}>
                      {week.days.map((day, dIdx) => (
                        <th key={`${wIdx}-${dIdx}`} className={`p-3 text-center transition-all border-r border-slate-100 min-w-[50px] ${day.isSunday ? 'bg-rose-50 text-rose-600 font-black' : 'text-slate-500'} ${dIdx === 0 ? 'border-l-2 border-l-slate-200' : ''}`}>
                          <div className="text-[8px] font-black uppercase opacity-40 mb-1">{format(day.date, 'EEE', { locale: ptBR })}</div>
                          <div className={`text-xs w-9 h-9 font-black rounded-xl mx-auto flex items-center justify-center transition-all ${day.isToday ? 'bg-indigo-600 text-white shadow-xl scale-110' : 'bg-white border border-slate-100 shadow-sm'}`}>
                            {day.dayNumber}
                          </div>
                        </th>
                      ))}
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {technicians.length === 0 ? (
                  <tr><td colSpan={100} className="p-20 text-center text-slate-300 font-black uppercase tracking-[1em] text-[10px]">Carregando Nuvem...</td></tr>
                ) : technicians.map((tech) => (
                  <tr key={tech.id} className="hover:bg-slate-50/50 group transition-all h-16">
                    <td className="p-4 sticky left-0 z-30 bg-white group-hover:bg-slate-50 transition-colors border-r-2 border-slate-200 shadow-xl shadow-black/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-black shadow-md">{tech.name.charAt(0)}</div>
                        <span className="font-black text-slate-900 text-xs tracking-tight truncate max-w-[120px]">{tech.name}</span>
                      </div>
                    </td>
                    {monthData.weeks.map((week, wIdx) => (
                      <React.Fragment key={wIdx}>
                        {week.days.map((day, dIdx) => {
                          const activeTrip = tech.trips.find(trip => isDateInTrip(day.date, trip.startDate, trip.endDate));
                          const isStart = activeTrip && (new Date(activeTrip.startDate + 'T00:00:00').getDate() === day.date.getDate());
                          const isEnd = activeTrip && (new Date(activeTrip.endDate + 'T00:00:00').getDate() === day.date.getDate());

                          return (
                            <td key={`${wIdx}-${dIdx}`} className={`p-0 relative transition-colors border-r border-slate-50 ${day.isSunday ? 'bg-rose-50/10' : ''} ${dIdx === 0 ? 'border-l-2 border-l-slate-200' : ''}`}>
                              {activeTrip && (
                                <div className={`absolute inset-0 flex items-center py-2 ${isStart ? 'pl-1' : ''} ${isEnd ? 'pr-1' : ''}`}>
                                  <div className={`h-full w-full shadow-lg flex items-center justify-center transition-all hover:brightness-110 active:scale-95 cursor-pointer ${isStart ? 'rounded-l-lg' : ''} ${isEnd ? 'rounded-r-lg' : ''} border-y border-white/20`} style={{ backgroundColor: activeTrip.color }}>
                                    {(isStart || (dIdx === 0 && !isEnd)) && <span className="text-[7px] text-white font-black uppercase tracking-widest truncate px-2 drop-shadow-sm">{activeTrip.destination || 'Viagem'}</span>}
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Legend com Retângulo Arredondado 'Viagem' e 'Domingo' */}
          <div className="bg-slate-50 px-10 py-6 border-t border-slate-200 flex flex-wrap justify-between items-center gap-6 no-print shrink-0">
             <div className="flex items-center gap-12">
                <div className="flex items-center gap-4 group">
                  <div className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl border-2 border-white transform group-hover:-translate-y-1 transition-transform">
                    Viagem
                  </div>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Atividade Operacional</span>
                </div>
                
                <div className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-[1.5rem] bg-rose-50 border-2 border-rose-200 shadow-inner flex items-center justify-center transform group-hover:scale-110 transition-transform">
                    <div className="w-3 h-3 rounded-full bg-rose-400 shadow-sm"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-none mb-1">Domingo</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Repouso Semanal</span>
                  </div>
                </div>
             </div>
             
             <div className="flex items-center gap-4 bg-white px-8 py-4 rounded-[2.5rem] shadow-xl border border-slate-100">
               {isOnline ? <Cloud className="text-emerald-500" size={20} /> : <CloudOff className="text-rose-500" size={20} />}
               <div className="flex flex-col">
                  <p className="text-[10px] font-black uppercase text-slate-900 leading-none mb-1">Status da Nuvem</p>
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em]">{isOnline ? 'Sincronizado via Firebase Firestore' : 'Conexão Pendente'}</p>
               </div>
             </div>
          </div>
        </div>
      </main>

      {/* Modais (Simplified versions with Firebase hooks) */}
      {isPdfReportModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md no-print">
          <div className="bg-white rounded-[4rem] shadow-3xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
            <div className="bg-slate-900 p-10 text-white flex justify-between items-center">
              <div className="flex items-center gap-6">
                 <div className="p-4 bg-indigo-600 rounded-[2rem] shadow-2xl"><FileText size={32} /></div>
                 <h2 className="text-2xl font-black uppercase tracking-widest">Emissão de Relatório</h2>
              </div>
              <button onClick={() => setIsPdfReportModalOpen(false)} className="p-3 hover:bg-slate-800 rounded-full transition-all active:scale-90"><X size={32} /></button>
            </div>
            
            <div className="p-10 bg-slate-50 border-b border-slate-200 flex gap-6">
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Filtrar por Ano</label>
                <select value={reportYear} onChange={e => setReportYear(Number(e.target.value))} className="w-full bg-white border-2 border-slate-200 rounded-3xl px-8 py-4 font-black text-sm">
                  {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Filtrar por Mês</label>
                <select value={reportMonthIdx} onChange={e => setReportMonthIdx(Number(e.target.value))} className="w-full bg-white border-2 border-slate-200 rounded-3xl px-8 py-4 font-black text-sm capitalize">
                  {Array.from({length: 12}).map((_, i) => <option key={i} value={i}>{format(new Date(2026, i, 1), 'MMMM', { locale: ptBR })}</option>)}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 bg-slate-200 custom-scrollbar flex justify-center">
              <div className="bg-white shadow-3xl p-16 w-[210mm] min-h-[297mm] flex flex-col border border-slate-100">
                <div className="flex justify-between items-start border-b-4 border-indigo-600 pb-12 mb-10">
                   <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {logoUrl ? <img src={logoUrl} style={{ width: '50px', height: '50px', objectFit: 'contain' }} /> : <div style={{ width: '50px', height: '50px', background: '#f8fafc', borderRadius: '12px' }}></div>}
                    <div>
                      <h3 style={{ fontSize: '28px', fontWeight: '900', margin: 0, textTransform: 'uppercase', letterSpacing: '-1px' }}>{headerTitle}</h3>
                      <p style={{ fontSize: '11px', color: '#4f46e5', fontWeight: '900', letterSpacing: '4px', margin: 0, opacity: 0.8 }}>GESTÃO DE LOGÍSTICA</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '22px', fontWeight: '900', margin: 0, textTransform: 'capitalize' }}>{getMonthData(reportYear, reportMonthIdx).name} / {reportYear}</p>
                  </div>
                </div>
                <div className="flex-1">
                  <table className="w-full text-[11px] border-collapse">
                    <thead><tr><th className="bg-slate-50 p-4 border-2">Técnico(s)</th><th className="bg-slate-50 p-4 border-2">Cidade Destino</th><th className="bg-slate-50 p-4 border-2">Saída</th><th className="bg-slate-50 p-4 border-2">Retorno</th><th className="bg-slate-50 p-4 border-2 text-center">Dias</th></tr></thead>
                    <tbody id="pdf-report-content-body">
                      {currentMonthTripsForReport.map(trip => (
                        <tr key={trip.groupId}>
                          <td className="p-4 border font-bold text-slate-800">{trip.technicians.map(t => t.name).join(', ')}</td>
                          <td className="p-4 border font-black uppercase text-[10px] text-slate-900">{trip.destination}</td>
                          <td className="p-4 border font-bold text-slate-600">{format(new Date(trip.startDate + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                          <td className="p-4 border font-bold text-slate-600">{format(new Date(trip.endDate + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                          <td className="p-4 border font-black text-indigo-600 text-center text-base">{calculateTripDuration(trip.startDate, trip.endDate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="p-10 bg-slate-50 border-t flex gap-6">
              <button onClick={handlePrintWindow} className="flex-1 bg-indigo-600 text-white py-6 rounded-[3rem] font-black uppercase text-sm tracking-widest shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-95">
                <Printer size={28} /> Exportar Documento PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consultar / Editar / Excluir Viagens */}
      {isConsultModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-[4rem] shadow-3xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-10 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-6">
                  <div className="p-5 bg-white/20 rounded-[2rem] shadow-inner backdrop-blur-xl"><Eye size={36} /></div>
                  <h2 className="text-3xl font-black uppercase tracking-widest">Painel Operacional</h2>
               </div>
              <button onClick={() => setIsConsultModalOpen(false)} className="p-3 hover:bg-indigo-500 rounded-full transition-all"><X size={36} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-12 space-y-6 bg-slate-50/50 custom-scrollbar">
              {groupedTrips.map(group => (
                <div key={group.groupId} className="bg-white border-2 border-slate-100 rounded-[3.5rem] p-10 flex items-center gap-10 group hover:border-indigo-100 transition-all shadow-xl hover:shadow-indigo-50/50">
                  <div className="w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-white shrink-0 shadow-2xl" style={{ backgroundColor: group.color }}><MapPin size={40} /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-900 uppercase text-xl truncate tracking-tight mb-2">{group.destination}</h3>
                    <div className="flex items-center gap-6">
                       <p className="text-[12px] font-bold text-slate-500 flex items-center gap-2">
                        <CalendarDays size={18} className="text-indigo-400" /> {format(new Date(group.startDate + 'T00:00:00'), 'dd/MM/yyyy')} → {format(new Date(group.endDate + 'T00:00:00'), 'dd/MM/yyyy')} 
                       </p>
                       <span className="bg-indigo-600 text-white px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-lg">{calculateTripDuration(group.startDate, group.endDate)} DIAS</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-5">{group.technicians.map(t => <span key={t.id} className="text-[10px] font-black bg-slate-50 px-5 py-2.5 rounded-2xl border border-slate-100 text-slate-500 shadow-sm">{t.name}</span>)}</div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => startEditTrip(group)} className="p-6 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-[2.5rem] transition-all shadow-sm border border-transparent hover:border-indigo-100"><Edit2 size={28} /></button>
                    <button onClick={() => removeEntireTripGroup(group.groupId)} className="p-6 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-[2.5rem] transition-all shadow-sm border border-transparent hover:border-rose-100"><Trash2 size={28} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gerenciar Técnicos */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-[4rem] shadow-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-8 duration-300">
            <div className="bg-slate-900 p-10 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-indigo-600 rounded-[2rem] shadow-xl"><Users size={32} /></div>
                <h2 className="text-2xl font-black uppercase tracking-widest">Base de Dados</h2>
              </div>
              <button onClick={() => setIsManageModalOpen(false)} className="p-3 hover:bg-slate-800 rounded-full transition-all"><X size={32} /></button>
            </div>
            <div className="p-12 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <UserPlus className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                  <input className="w-full bg-white border-2 border-slate-200 rounded-[2.5rem] px-16 py-5 font-black text-base outline-none focus:border-indigo-500 transition-all shadow-inner" placeholder="Nome do novo técnico..." value={newTechInput} onChange={e => setNewTechInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddNewTechnician()} />
                </div>
                <button onClick={handleAddNewTechnician} className="bg-indigo-600 text-white px-12 rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">Cadastrar</button>
              </div>
            </div>
            <div className="p-12 flex-1 overflow-y-auto custom-scrollbar space-y-4 bg-white">
              {technicians.map(tech => (
                <div key={tech.id} className="flex items-center justify-between p-8 bg-white border border-slate-100 rounded-[3rem] hover:border-indigo-100 group transition-all shadow-sm">
                  <div className="flex items-center gap-8 flex-1">
                    <div className="w-16 h-16 rounded-[2rem] bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shadow-inner text-2xl">{tech.name.charAt(0)}</div>
                    {editingTechId === tech.id ? (
                      <div className="flex items-center gap-3 flex-1 animate-in fade-in duration-200">
                        <input autoFocus className="flex-1 bg-slate-50 border-2 border-indigo-500 rounded-3xl px-8 py-4 font-black text-lg" value={editingName} onChange={e => setEditingName(e.target.value)} onKeyDown={e => e.key === 'Enter' && updateTechnicianName(tech.id)} />
                        <button onClick={() => updateTechnicianName(tech.id)} className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg transition-all active:scale-90"><Save size={24} /></button>
                        <button onClick={() => setEditingTechId(null)} className="p-4 bg-slate-200 text-slate-500 rounded-2xl shadow-sm transition-all active:scale-90"><X size={24} /></button>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 text-xl tracking-tight mb-1 leading-none">{tech.name}</span>
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{tech.trips.length} Atividades Registradas</span>
                      </div>
                    )}
                  </div>
                  {!editingTechId && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                      <button onClick={() => { setEditingTechId(tech.id); setEditingName(tech.name); }} className="p-6 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-[2rem] transition-all"><Edit2 size={28} /></button>
                      <button onClick={() => removeTechnicianRecord(tech.id)} className="p-6 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-[2rem] transition-all"><Trash2 size={28} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lançamento / Edição de Viagem */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md no-print">
          <div className="bg-white rounded-[4rem] shadow-3xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-12 text-white flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="p-5 bg-white/20 rounded-[2.5rem] shadow-inner backdrop-blur-xl"><Plus size={40} /></div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">{editingGroupId ? 'Editar Missão' : 'Nova Missão'}</h2>
              </div>
              <button onClick={() => { setIsModalOpen(false); setEditingGroupId(null); }} className="p-4 hover:bg-indigo-500 rounded-full transition-all active:scale-90"><X size={40} /></button>
            </div>
            <form onSubmit={handleManualSubmit} className="p-16 space-y-12 bg-white">
              <div className="space-y-4">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.4em] ml-2">Equipe Designada</label>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-6 bg-slate-50 rounded-[3rem] border-2 border-slate-100 custom-scrollbar shadow-inner">
                  {technicians.map(t => (
                    <button key={t.id} type="button" onClick={() => toggleTechSelection(t.id)} className={`px-5 py-4 rounded-3xl border-2 font-black text-[10px] uppercase transition-all flex items-center justify-center gap-3 ${formData.selectedTechIds.includes(t.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-[1.03]' : 'bg-white border-slate-100 text-slate-500'}`}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400 ml-2">Cidade de Destino</label>
                <div className="relative">
                  <MapPin className="absolute left-8 top-1/2 -translate-y-1/2 text-indigo-400" size={32} />
                  <input required className="w-full bg-slate-50 border-2 border-slate-100 rounded-[3rem] px-20 py-6 font-black text-xl outline-none focus:border-indigo-400 shadow-inner" placeholder="Ex: São Paulo - SP" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-2">Data Saída</label>
                  <input required type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[3rem] px-10 py-6 font-black text-base focus:border-indigo-400 shadow-inner" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-2">Data Retorno</label>
                  <input required type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[3rem] px-10 py-6 font-black text-base focus:border-indigo-400 shadow-inner" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-8 rounded-[4rem] font-black uppercase text-sm tracking-[0.5em] shadow-3xl active:scale-95 transition-all hover:bg-slate-800">Sincronizar Cronograma</button>
            </form>
          </div>
        </div>
      )}

      {isBrandingModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-[4rem] shadow-3xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-10 text-white flex justify-between items-center">
              <h2 className="text-xl font-black uppercase tracking-widest">Ajustes Visuais</h2>
              <button onClick={() => setIsBrandingModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-all"><X size={28} /></button>
            </div>
            <div className="p-12 space-y-10 bg-white">
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Título do Sistema</label>
                <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl px-8 py-5 font-black text-base outline-none focus:border-indigo-500 shadow-inner transition-all" value={headerTitle} onChange={e => setHeaderTitle(e.target.value)} />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-2">Logotipo Personalizado (50x50)</label>
                <div className="flex items-center gap-8 p-8 border-2 border-dashed border-slate-200 rounded-[3rem] bg-slate-50">
                  {logoUrl ? <img src={logoUrl} className="h-12 w-12 object-contain rounded-xl shadow-sm" /> : <ImageIcon size={40} className="text-slate-300" />}
                  <div className="flex-1 space-y-3">
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-input-firebase" />
                    <label htmlFor="logo-input-firebase" className="block text-center bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-[9px] cursor-pointer hover:bg-indigo-700 shadow-lg transition-all active:scale-95">Mudar Imagem</label>
                    <button onClick={() => setLogoUrl('')} className="block w-full text-[9px] font-black text-rose-500 hover:underline">Remover</button>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsBrandingModalOpen(false)} className="w-full bg-slate-900 text-white py-6 rounded-[3rem] font-black uppercase text-xs tracking-widest shadow-2xl transition-all active:scale-95 hover:bg-slate-800">Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}

      <footer className="py-16 text-center text-slate-300 text-[9px] font-black uppercase tracking-[2em] no-print opacity-20 pointer-events-none">Logística Master v12.0 • Gold Edition Cloud • 2026</footer>
    </div>
  );
};

export default App;
