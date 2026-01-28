
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
  Menu as MenuIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Technician, Trip, GroupedTrip } from './types';
import { getMonthData, isDateInTrip, calculateTripDuration } from './utils/dateUtils';
import { parseTravelRequest } from './services/geminiService';

const DB_KEY = 'logistica_cloud_v11_db';
const BRANDING_KEY = 'logistica_branding_v11_db';

const INITIAL_TECHNICIANS: Technician[] = [
  { id: '1', name: 'João Silva', trips: [] },
  { id: '2', name: 'Maria Santos', trips: [] },
  { id: '3', name: 'Ricardo Oliveira', trips: [] },
];

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
  const [technicians, setTechnicians] = useState<Technician[]>(() => {
    const saved = localStorage.getItem(DB_KEY);
    return saved ? JSON.parse(saved) : INITIAL_TECHNICIANS;
  });

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

  useEffect(() => {
    localStorage.setItem(DB_KEY, JSON.stringify(technicians));
  }, [technicians]);

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

  const handleAddNewTechnician = () => {
    if (!newTechInput.trim()) return;
    setTechnicians(prev => [...prev, { id: crypto.randomUUID(), name: newTechInput.trim(), trips: [] }]);
    setNewTechInput('');
  };

  const removeTechnicianRecord = (id: string) => {
    if (confirm("Deseja realmente excluir este técnico e todos os seus registros?")) {
      setTechnicians(prev => prev.filter(t => t.id !== id));
    }
  };

  const updateTechnicianName = (id: string) => {
    if (!editingName.trim()) return;
    setTechnicians(prev => prev.map(t => t.id === id ? { ...t, name: editingName.trim() } : t));
    setEditingTechId(null);
    setEditingName('');
  };

  const removeEntireTripGroup = (groupId: string) => {
    if (confirm("Deseja apagar esta viagem de todos os cronogramas?")) {
      setTechnicians(prev => prev.map(tech => ({
        ...tech,
        trips: tech.trips.filter(trip => trip.groupId !== groupId)
      })));
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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { selectedTechIds, startDate, endDate, destination } = formData;
    if (selectedTechIds.length === 0) return;

    // Geramos UMA cor aleatória para a viagem. Ela será a mesma para todos os técnicos desse grupo.
    const tripColor = getRandomColor();

    if (editingGroupId) {
      setTechnicians(prev => {
        const cleaned = prev.map(tech => ({
          ...tech,
          trips: tech.trips.filter(trip => trip.groupId !== editingGroupId)
        }));
        return cleaned.map(tech => selectedTechIds.includes(tech.id) ? {
          ...tech, trips: [...tech.trips, { id: crypto.randomUUID(), groupId: editingGroupId, startDate, endDate, destination, color: tripColor }]
        } : tech);
      });
      setEditingGroupId(null);
    } else {
      const groupId = crypto.randomUUID();
      setTechnicians(prev => {
        return prev.map(tech => selectedTechIds.includes(tech.id) ? {
          ...tech, trips: [...tech.trips, { id: crypto.randomUUID(), groupId, startDate, endDate, destination, color: tripColor }]
        } : tech);
      });
    }

    setIsModalOpen(false);
    setFormData({ selectedTechIds: [], newTechName: '', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd'), destination: '' });
  };

  const handlePrintWindow = () => {
    const reportContent = document.getElementById('pdf-report-content-body')?.innerHTML;
    if (!reportContent) return;

    const printWindow = window.open('', '_blank', 'width=900,height=1000');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório Operacional</title>
          <style>
            body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; color: #0f172a; }
            .header { display: flex; justify-content: space-between; border-bottom: 4px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
            .logo { width: 50px; height: 50px; object-fit: contain; }
            .title-main { font-size: 24px; font-weight: 900; text-transform: uppercase; margin: 0; }
            .subtitle { font-size: 14px; color: #4f46e5; font-weight: 900; letter-spacing: 2px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
            th { background: #f8fafc; font-weight: 900; color: #64748b; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div style="display: flex; align-items: center; gap: 15px;">
              ${logoUrl ? `<img src="${logoUrl}" class="logo" />` : ''}
              <div>
                <h1 class="title-main">${headerTitle}</h1>
                <p class="subtitle">RELATÓRIO DE VIAGENS</p>
              </div>
            </div>
            <div style="text-align: right">
              <p style="font-size: 18px; font-weight: 900; margin: 0">${getMonthData(reportYear, reportMonthIdx).name} / ${reportYear}</p>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>Técnico(s)</th><th>Destino</th><th>Saída</th><th>Retorno</th><th style="text-align: center">Dias</th></tr>
            </thead>
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
        setTechnicians(prev => {
          let updated = [...prev];
          let techIdx = updated.findIndex(t => t.name.toLowerCase().includes(technicianName.toLowerCase()));
          const newTrip = { id: crypto.randomUUID(), groupId, startDate, endDate, destination, color: tripColor };
          if (techIdx === -1) {
            updated.push({ id: crypto.randomUUID(), name: technicianName, trips: [newTrip] });
          } else {
            updated[techIdx] = { ...updated[techIdx], trips: [...updated[techIdx].trips, newTrip] };
          }
          return updated;
        });
        setAiInput('');
        setFeedback({ type: 'success', message: 'Dados Processados!' });
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
      
      {/* Header com Menu de 3 Linhas Sobreposto */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-[100] px-6 py-4 shadow-sm no-print">
        <div className="max-w-[2000px] mx-auto flex justify-between items-center gap-6">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setIsBrandingModalOpen(true)}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded-lg border border-slate-100" />
            ) : (
              <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><CalendarIcon size={20} /></div>
            )}
            <h1 className="text-lg font-black text-slate-900 leading-none tracking-tight">{headerTitle}</h1>
          </div>

          <div className="hidden lg:flex items-center gap-3 bg-slate-200/50 rounded-full p-1 border border-slate-200 shadow-inner">
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
                  <div className="fixed inset-0 z-[101]" onClick={() => setIsHamburgerOpen(false)}></div>
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 py-3 z-[102] animate-in fade-in slide-in-from-top-4 duration-300 ring-4 ring-indigo-50/50">
                    <button onClick={() => { setIsHamburgerOpen(false); setIsConsultModalOpen(true); }} className="w-full flex items-center gap-4 px-6 py-4 hover:bg-indigo-50 transition-all text-slate-700 group">
                      <Eye size={18} className="text-indigo-500 group-hover:scale-110 transition-transform" /> <span className="text-xs font-black uppercase tracking-widest">Consultar</span>
                    </button>
                    <button onClick={() => { setIsHamburgerOpen(false); setIsManageModalOpen(true); }} className="w-full flex items-center gap-4 px-6 py-4 hover:bg-indigo-50 transition-all text-slate-700 group">
                      <Users size={18} className="text-emerald-500 group-hover:scale-110 transition-transform" /> <span className="text-xs font-black uppercase tracking-widest">Técnicos</span>
                    </button>
                    <button onClick={() => { setIsHamburgerOpen(false); setIsPdfReportModalOpen(true); }} className="w-full flex items-center gap-4 px-6 py-4 hover:bg-indigo-50 transition-all text-slate-700 group">
                      <FileText size={18} className="text-slate-900 group-hover:scale-110 transition-transform" /> <span className="text-xs font-black uppercase tracking-widest">Relatório PDF</span>
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
          <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden no-print">
            <form onSubmit={handleAiProcess} className="p-4 flex gap-3">
              <div className="bg-indigo-50 p-4 rounded-xl flex items-center gap-2 shadow-inner"><Sparkles size={20} className="text-indigo-600 animate-pulse" /></div>
              <input 
                type="text" value={aiInput} onChange={(e) => setAiInput(e.target.value)} 
                placeholder="Ex: João e Maria viajam para Fortaleza de 10 a 20 de Junho" 
                className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-indigo-400 font-bold text-sm shadow-inner transition-all"
                disabled={isAiLoading} 
              />
              <button type="submit" disabled={isAiLoading || !aiInput} className="bg-slate-900 text-white px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 shadow-lg active:scale-95 transition-all">
                {isAiLoading ? 'Agendando...' : 'Agendar via IA'}
              </button>
            </form>
          </section>
        )}

        {/* Calendar View */}
        <div className={`bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col transition-all ${isFullscreen ? 'rounded-none border-0 h-full' : ''}`}>
          <div className="overflow-x-auto custom-scrollbar spreadsheet-container h-full">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-40">
                <tr className="bg-slate-50/95 backdrop-blur-md">
                  <th className="p-6 text-left font-black text-slate-400 uppercase tracking-widest text-[9px] sticky left-0 z-50 border-r-2 border-slate-200 w-[180px] bg-slate-50 shadow-xl shadow-black/5">Equipe Técnica</th>
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
                {technicians.map((tech) => (
                  <tr key={tech.id} className="hover:bg-slate-50/50 group transition-all h-16">
                    <td className="p-4 sticky left-0 z-30 bg-white group-hover:bg-slate-50 transition-colors border-r-2 border-slate-200 shadow-xl shadow-black/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-black shadow-md group-hover:bg-indigo-600 transition-all">{tech.name.charAt(0)}</div>
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
                                    {(isStart || (dIdx === 0 && !isEnd)) && <span className="text-[7px] text-white font-black uppercase tracking-widest truncate px-2 leading-none drop-shadow-sm">{activeTrip.destination || 'Viagem'}</span>}
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
          
          {/* Legenda do Rodapé Atualizada */}
          <div className="bg-slate-50 px-10 py-6 border-t border-slate-200 flex flex-wrap justify-between items-center gap-6 no-print shrink-0">
             <div className="flex items-center gap-10">
                {/* Legenda de Viagem Unificada conforme solicitado */}
                <div className="flex items-center gap-4 group">
                  <div className="px-6 py-2.5 bg-indigo-600 text-white rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl border-2 border-white transform group-hover:-translate-y-1 transition-transform">
                    Viagem
                  </div>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Atividade Operacional</span>
                </div>
                
                {/* Legenda de Domingo mantida */}
                <div className="flex items-center gap-4 group">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 border-2 border-rose-200 shadow-inner flex items-center justify-center transform group-hover:scale-110 transition-transform">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-sm animate-pulse"></div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-none mb-1">Domingo</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Descanso</span>
                  </div>
                </div>
             </div>
             
             <div className="flex items-center gap-3 bg-white px-8 py-3 rounded-[2rem] shadow-xl border border-slate-100">
               <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500 shadow-inner"><Clock size={16} /></div>
               <div>
                  <p className="text-[9px] font-black uppercase text-slate-900 tracking-widest leading-none">Logística Master v11.0</p>
                  <p className="text-[7px] font-black uppercase text-slate-400 tracking-[0.2em]">Gold Edition • 2026</p>
               </div>
             </div>
          </div>
        </div>
      </main>

      {/* Modais com Alta Prioridade de Visualização */}
      {isPdfReportModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md no-print">
          <div className="bg-white rounded-[3.5rem] shadow-3xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-10 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-indigo-600 rounded-[2rem] shadow-2xl"><FileText size={28} /></div>
                <div>
                   <h2 className="text-2xl font-black uppercase tracking-widest">Painel de Relatório</h2>
                   <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Selecione o período de exportação</p>
                </div>
              </div>
              <button onClick={() => setIsPdfReportModalOpen(false)} className="p-3 hover:bg-slate-800 rounded-full transition-all active:scale-90"><X size={32} /></button>
            </div>
            
            <div className="p-8 bg-slate-50 border-b border-slate-200 flex gap-6">
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Filtrar Ano</label>
                <select value={reportYear} onChange={e => setReportYear(Number(e.target.value))} className="w-full bg-white border-2 border-slate-200 rounded-2xl px-6 py-3 font-bold text-sm shadow-sm">
                  {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Filtrar Mês</label>
                <select value={reportMonthIdx} onChange={e => setReportMonthIdx(Number(e.target.value))} className="w-full bg-white border-2 border-slate-200 rounded-2xl px-6 py-3 font-bold text-sm capitalize shadow-sm">
                  {Array.from({length: 12}).map((_, i) => <option key={i} value={i}>{format(new Date(2026, i, 1), 'MMMM', { locale: ptBR })}</option>)}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 bg-slate-200 custom-scrollbar flex justify-center">
              <div className="bg-white shadow-3xl p-16 w-[210mm] min-h-[297mm] flex flex-col border border-slate-100">
                <div className="flex justify-between items-start border-b-4 border-indigo-600 pb-12 mb-10">
                   <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {logoUrl ? <img src={logoUrl} style={{ width: '50px', height: '50px', objectFit: 'contain' }} /> : <div style={{ width: '50px', height: '50px', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}></div>}
                    <div>
                      <h3 style={{ fontSize: '28px', fontWeight: '900', margin: 0, textTransform: 'uppercase', letterSpacing: '-1px' }}>{headerTitle}</h3>
                      <p style={{ fontSize: '11px', color: '#4f46e5', fontWeight: '900', letterSpacing: '4px', margin: 0, opacity: 0.8 }}>CONTROLE DE OPERAÇÕES</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', margin: '0 0 5px 0', textTransform: 'uppercase' }}>REFERÊNCIA</p>
                    <p style={{ fontSize: '22px', fontWeight: '900', margin: 0, textTransform: 'capitalize' }}>{getMonthData(reportYear, reportMonthIdx).name}</p>
                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#4f46e5', margin: 0 }}>{reportYear}</p>
                  </div>
                </div>
                <div className="flex-1">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr><th className="bg-slate-50 p-4 font-black uppercase text-slate-500 border-2">Técnico(s)</th><th className="bg-slate-50 p-4 font-black uppercase text-slate-500 border-2">Destino</th><th className="bg-slate-50 p-4 font-black uppercase text-slate-500 border-2">Saída</th><th className="bg-slate-50 p-4 font-black uppercase text-slate-500 border-2">Retorno</th><th className="bg-slate-50 p-4 font-black uppercase text-slate-500 border-2 text-center">Dias</th></tr>
                    </thead>
                    <tbody id="pdf-report-content-body">
                      {currentMonthTripsForReport.length > 0 ? currentMonthTripsForReport.map(trip => (
                        <tr key={trip.groupId} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 border font-bold text-slate-800">{trip.technicians.map(t => t.name).join(', ')}</td>
                          <td className="p-4 border font-black uppercase text-[10px] text-slate-900">{trip.destination}</td>
                          <td className="p-4 border font-bold text-slate-600">{format(new Date(trip.startDate + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                          <td className="p-4 border font-bold text-slate-600">{format(new Date(trip.endDate + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                          <td className="p-4 border font-black text-indigo-600 text-center text-base">{calculateTripDuration(trip.startDate, trip.endDate)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className="p-20 text-center text-slate-300 font-bold italic">Nenhum registro para este período</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="p-10 bg-slate-50 border-t flex gap-6">
              <button onClick={handlePrintWindow} className="flex-1 bg-indigo-600 text-white py-5 rounded-[3rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-indigo-100 flex items-center justify-center gap-4 active:scale-95 transition-all">
                <Printer size={24} /> Imprimir / Abrir Nova Janela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consultar / Editar / Excluir Viagens */}
      {isConsultModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md no-print">
          <div className="bg-white rounded-[3.5rem] shadow-3xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-10 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-6">
                  <div className="p-4 bg-white/20 rounded-[2rem] shadow-inner backdrop-blur-xl"><Eye size={32} /></div>
                  <h2 className="text-2xl font-black uppercase tracking-widest">Controle de Cronogramas</h2>
               </div>
              <button onClick={() => setIsConsultModalOpen(false)} className="p-2 hover:bg-indigo-500 rounded-full transition-all"><X size={36} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-12 space-y-6 bg-slate-50/50 custom-scrollbar">
              {groupedTrips.length > 0 ? groupedTrips.map(group => (
                <div key={group.groupId} className="bg-white border-2 border-slate-100 rounded-[3rem] p-8 flex items-center gap-8 group hover:border-indigo-100 transition-all shadow-xl hover:shadow-indigo-50/50">
                  <div className="w-20 h-20 rounded-[2rem] flex items-center justify-center text-white shrink-0 shadow-2xl" style={{ backgroundColor: group.color }}><MapPin size={32} /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-900 uppercase text-lg truncate tracking-tight mb-2">{group.destination}</h3>
                    <div className="flex items-center gap-6">
                       <p className="text-[11px] font-bold text-slate-500 flex items-center gap-2">
                        <CalendarDays size={16} className="text-indigo-400" /> {format(new Date(group.startDate + 'T00:00:00'), 'dd/MM/yyyy')} → {format(new Date(group.endDate + 'T00:00:00'), 'dd/MM/yyyy')} 
                       </p>
                       <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-full font-black text-[9px] uppercase tracking-widest shadow-lg">{calculateTripDuration(group.startDate, group.endDate)} DIAS</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">{group.technicians.map(t => <span key={t.id} className="text-[9px] font-black bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 text-slate-500 shadow-sm">{t.name}</span>)}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => startEditTrip(group)} className="p-5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-[1.8rem] transition-all shadow-sm border border-transparent hover:border-indigo-100" title="Editar Viagem"><Edit2 size={24} /></button>
                    <button onClick={() => removeEntireTripGroup(group.groupId)} className="p-5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-[1.8rem] transition-all shadow-sm border border-transparent hover:border-rose-100" title="Excluir Viagem"><Trash2 size={24} /></button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-20 bg-white border-2 border-dashed rounded-[3rem] border-slate-200">
                   <p className="text-slate-300 font-black uppercase text-lg tracking-widest">Nenhuma Viagem Ativa</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lançamento / Edição de Viagem */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md no-print">
          <div className="bg-white rounded-[4rem] shadow-3xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-12 text-white flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-white/20 rounded-[2rem] shadow-inner backdrop-blur-xl"><Plus size={36} /></div>
                <h2 className="text-3xl font-black uppercase tracking-tighter">{editingGroupId ? 'Editar Sincronismo' : 'Novo Sincronismo'}</h2>
              </div>
              <button onClick={() => { setIsModalOpen(false); setEditingGroupId(null); }} className="p-4 hover:bg-indigo-500 rounded-full transition-all active:scale-90"><X size={36} /></button>
            </div>
            <form onSubmit={handleManualSubmit} className="p-16 space-y-12 bg-white">
              <div className="space-y-4">
                <label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.4em] ml-2">Equipe em Missão</label>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-6 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 custom-scrollbar shadow-inner">
                  {technicians.map(t => (
                    <button key={t.id} type="button" onClick={() => toggleTechSelection(t.id)} className={`px-5 py-4 rounded-2xl border-2 font-black text-[10px] uppercase transition-all flex items-center justify-center gap-3 ${formData.selectedTechIds.includes(t.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-[1.03]' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'}`}>
                      {formData.selectedTechIds.includes(t.id) && <CheckCircle2 size={16} />}
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-slate-400 ml-2">Cidade de Destino</label>
                <div className="relative">
                  <MapPin className="absolute left-7 top-1/2 -translate-y-1/2 text-indigo-400" size={28} />
                  <input required className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] px-16 py-5 font-black text-lg outline-none focus:border-indigo-400 transition-all shadow-inner" placeholder="Ex: Rio de Janeiro - RJ" value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-2">Data de Saída</label>
                  <input required type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] px-8 py-5 font-black text-sm focus:border-indigo-400 transition-all shadow-inner" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-400 ml-2">Data de Retorno</label>
                  <input required type="date" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] px-8 py-5 font-black text-sm focus:border-indigo-400 transition-all shadow-inner" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[3.5rem] font-black uppercase text-sm tracking-[0.5em] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] active:scale-95 transition-all hover:bg-slate-800 mt-4">Sincronizar Cronograma</button>
            </form>
          </div>
        </div>
      )}

      {/* Gerenciar Técnicos com Opção de Excluir */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-[3rem] shadow-3xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-8 duration-300">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl"><Users size={24} /></div>
                <h2 className="text-xl font-black uppercase tracking-widest">Base de Dados Técnica</h2>
              </div>
              <button onClick={() => setIsManageModalOpen(false)} className="p-3 hover:bg-slate-800 rounded-full transition-all"><X size={28} /></button>
            </div>
            <div className="p-10 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <UserPlus className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input className="w-full bg-white border-2 border-slate-200 rounded-[2rem] px-16 py-4 font-bold text-sm outline-none focus:border-indigo-500 transition-all shadow-inner" placeholder="Nome do novo técnico..." value={newTechInput} onChange={e => setNewTechInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddNewTechnician()} />
                </div>
                <button onClick={handleAddNewTechnician} className="bg-indigo-600 text-white px-10 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">Cadastrar</button>
              </div>
            </div>
            <div className="p-10 flex-1 overflow-y-auto custom-scrollbar space-y-4 bg-white">
              {technicians.map(tech => (
                <div key={tech.id} className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-[2.5rem] hover:border-indigo-100 group transition-all shadow-sm">
                  <div className="flex items-center gap-6 flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shadow-inner text-xl">{tech.name.charAt(0)}</div>
                    {editingTechId === tech.id ? (
                      <div className="flex items-center gap-3 flex-1 animate-in fade-in duration-200">
                        <input autoFocus className="flex-1 bg-slate-50 border-2 border-indigo-500 rounded-2xl px-6 py-3 font-bold text-base" value={editingName} onChange={e => setEditingName(e.target.value)} onKeyDown={e => e.key === 'Enter' && updateTechnicianName(tech.id)} />
                        <button onClick={() => updateTechnicianName(tech.id)} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg"><Save size={20} /></button>
                        <button onClick={() => setEditingTechId(null)} className="p-3 bg-slate-200 text-slate-500 rounded-xl shadow-sm"><X size={20} /></button>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 text-lg tracking-tight mb-1 leading-none">{tech.name}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tech.trips.length} Operações Registradas</span>
                      </div>
                    )}
                  </div>
                  {!editingTechId && (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                      <button onClick={() => { setEditingTechId(tech.id); setEditingName(tech.name); }} className="p-4 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all shadow-sm border border-transparent hover:border-indigo-100" title="Editar Técnico"><Edit2 size={22} /></button>
                      <button onClick={() => removeTechnicianRecord(tech.id)} className="p-4 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all shadow-sm border border-transparent hover:border-rose-100" title="Excluir Técnico"><Trash2 size={22} /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Personalização */}
      {isBrandingModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-[3rem] shadow-3xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
              <h2 className="text-xl font-black uppercase tracking-widest">Identidade Visual</h2>
              <button onClick={() => setIsBrandingModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full transition-all"><X size={24} /></button>
            </div>
            <div className="p-10 space-y-8 bg-white">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Título Principal</label>
                <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:border-indigo-500 transition-all shadow-inner" value={headerTitle} onChange={e => setHeaderTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Logo do Sistema (Max 50px)</label>
                <div className="flex items-center gap-6 p-6 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50">
                  {logoUrl ? <img src={logoUrl} className="h-10 w-10 object-contain rounded-lg shadow-sm" /> : <ImageIcon size={30} className="text-slate-300" />}
                  <div className="flex-1">
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-in-final-2" />
                    <label htmlFor="logo-in-final-2" className="block text-center bg-indigo-600 text-white py-3 rounded-xl font-black uppercase text-[8px] cursor-pointer hover:bg-indigo-700 shadow-lg transition-all active:scale-95">Mudar Logotipo</label>
                    <button onClick={() => setLogoUrl('')} className="block w-full text-[9px] font-black text-rose-500 mt-3 hover:underline">Remover Atual</button>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsBrandingModalOpen(false)} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl transition-all active:scale-95 hover:bg-slate-800">Salvar Ajustes</button>
            </div>
          </div>
        </div>
      )}

      <footer className="py-12 text-center text-slate-300 text-[9px] font-black uppercase tracking-[1.5em] no-print opacity-20 pointer-events-none">Master Sinc v11.0 Gold Edition • 2026</footer>
    </div>
  );
};

export default App;
