import {
    Activity,
    AlertTriangle,
    Eye,
    LayoutDashboard,
    MapPin,
    Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const HUB_URL = import.meta.env.VITE_HUB_URL || 'http://localhost:3001';
const socket = io(HUB_URL);

export default function AdminDashboard() {
    const [enumerators, setEnumerators] = useState<any>([]);
    const [activeSession, setActiveSession] = useState<any>(null);
    const [alerts, setAlerts] = useState<any>([]);
    const [telemetryLogs, setTelemetryLogs] = useState<any>([]);
    const [currentView, setCurrentView] = useState('god-view');

    useEffect(() => {
        socket.emit('join', { enumeratorId: 'admin_1', projectId: 'proj_beta', role: 'supervisor' });

        socket.on('enumerator_online', (data) => {
            setEnumerators((prev: any) => {
                if (prev.find((e: any) => e.enumeratorId === data.enumeratorId)) return prev;
                return [...prev, { ...data, status: 'active', lastUpdate: Date.now(), startTime: Date.now(), captures: 0 }];
            });
            addLog(`Enumerator ${data.enumeratorId} joined project.`);
        });

        socket.on('live_update', (data) => {
            setEnumerators((prev: any) =>
                prev.map((e: any) => e.enumeratorId === data.enumeratorId ? {
                    ...e,
                    lastData: data.data,
                    lastUpdate: Date.now(),
                    captures: (e.captures || 0) + 1
                } : e)
            );
            if (activeSession?.enumeratorId === data.enumeratorId) {
                setActiveSession((prev: any) => ({ ...prev, lastData: data.data }));
            }
            addLog(`[Input] ${data.enumeratorId}: ${data.data.value.substring(0, 30)}...`);
        });

        socket.on('location_update', (data) => {
            setEnumerators((prev: any) =>
                prev.map((e: any) => e.enumeratorId === data.enumeratorId ? { ...e, location: data.location } : e)
            );
            addLog(`[GPS] ${data.enumeratorId}: Location updated.`);
        });

        socket.on('enumerator_offline', (data) => {
            setEnumerators((prev: any) => prev.map((e: any) => e.enumeratorId === data.enumeratorId ? { ...e, status: 'offline' } : e));
            addLog(`Enumerator ${data.enumeratorId} went offline.`);
        });

        return () => {
            socket.off('enumerator_online');
            socket.off('live_update');
            socket.off('location_update');
            socket.off('enumerator_offline');
        };
    }, [activeSession]);

    const addLog = (message: string) => {
        setTelemetryLogs((prev: any) => [{
            id: Date.now(),
            time: new Date().toLocaleTimeString(),
            message
        }, ...prev].slice(0, 50));
    };

    const renderContent = () => {
        switch (currentView) {
            case 'god-view':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Enumerator List */}
                        <div className="lg:col-span-2 space-y-6">
                            <section className="bg-card border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                                <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-white">Active Sessions</h3>
                                    <span className="bg-emerald-500/10 text-emerald-500 text-xs px-2 py-1 rounded-full border border-emerald-500/20 font-bold uppercase tracking-wider">Live</span>
                                </div>
                                <div className="divide-y divide-slate-800">
                                    {enumerators.filter((e: any) => e.status !== 'offline').length > 0 ?
                                        enumerators.filter((e: any) => e.status !== 'offline').map((e: any) => (
                                            <EnumeratorItem
                                                key={e.enumeratorId}
                                                e={e}
                                                onWatch={() => setActiveSession(e)}
                                            />
                                        )) : (
                                            <div className="p-16 text-center">
                                                <Users size={40} className="text-slate-800 mx-auto mb-4" />
                                                <p className="text-slate-500 font-medium italic">No active enumerators found in this project.</p>
                                            </div>
                                        )}
                                </div>
                            </section>
                        </div>

                        {/* Mirror View / Analytics */}
                        <div className="space-y-6">
                            {activeSession ? (
                                <section className="bg-card border border-accent/40 rounded-3xl p-6 shadow-2xl shadow-accent/10 transition-all duration-500 ring-1 ring-accent/20">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                                                <Eye className="text-accent" size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-white text-lg tracking-tight">Live Mirroring</h3>
                                                <p className="text-xs text-slate-500 font-mono italic">ID: {activeSession.enumeratorId}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setActiveSession(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest text-white">Current Input Stream</p>
                                            <div className="min-h-[80px] flex items-center justify-center text-center">
                                                <p className="text-xl font-medium text-emerald-400 leading-relaxed">
                                                    {activeSession.lastData?.value || <span className="text-slate-700 animate-pulse italic">Awaiting telemetry...</span>}
                                                </p>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-slate-900 flex justify-between">
                                                <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">Field ID</span>
                                                <span className="text-[10px] text-slate-400 font-mono">{activeSession.lastData?.id || 'N/A'}</span>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest text-white">GPS Breadcrumbs</p>
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-accent/10 rounded-lg">
                                                    <MapPin size={18} className="text-accent" />
                                                </div>
                                                <span className="font-mono text-slate-300">
                                                    {activeSession.location ? `${activeSession.location.lat.toFixed(5)}°N, ${activeSession.location.lng.toFixed(5)}°E` : <span className="text-slate-700 animate-pulse">Scanning GPS...</span>}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            ) : (
                                <section className="bg-card border border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center text-center opacity-30 cursor-not-allowed">
                                    <div className="p-5 bg-slate-950 rounded-full mb-4 ring-1 ring-slate-800">
                                        <Activity size={40} className="text-slate-800" />
                                    </div>
                                    <p className="text-slate-500 font-bold text-sm leading-tight max-w-[180px]">Select any online agent to initiate high-speed mirroring</p>
                                </section>
                            )}
                        </div>
                    </div>
                );
            case 'field-map':
                return (
                    <div className="bg-card border border-slate-800 rounded-3xl p-12 text-center shadow-2xl relative overflow-hidden min-h-[500px] flex flex-col justify-center">
                        <div className="absolute inset-0 opacity-10 pointer-events-none">
                            <div className="w-full h-full bg-[radial-gradient(circle_at_center,_#38bdf8_1px,_transparent_1px)] bg-[size:40px_40px]" />
                        </div>
                        <MapPin size={64} className="text-accent mx-auto mb-6" />
                        <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Global Operations Map</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">Real-time GPS heatmap and cluster visualization for all active deployments.</p>

                        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                            {enumerators.map((e: any) => (
                                <div key={e.enumeratorId} className={`p-4 rounded-2xl border transition-all ${e.status === 'offline' ? 'bg-slate-900/20 border-slate-900 opacity-50' : 'bg-slate-900 border-slate-800 animate-in fade-in zoom-in duration-500'}`}>
                                    <div className="flex justify-between items-start mb-3">
                                        <p className="text-sm font-bold text-accent font-mono">{e.enumeratorId}</p>
                                        <div className={`w-2 h-2 rounded-full ${e.status === 'offline' ? 'bg-slate-700' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`} />
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <MapPin size={12} />
                                        <span className="text-xs font-mono">
                                            {e.location ? `${e.location.lat.toFixed(4)}, ${e.location.lng.toFixed(4)}` : 'N/A'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] mt-2 text-slate-600 font-bold uppercase tracking-widest">{e.status === 'offline' ? 'DISCONNECTED' : 'LAST KNOWN FIX'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'enumerators':
                return (
                    <div className="space-y-8 animate-in fade-in duration-700">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <StatBlock label="Total Staff" value={enumerators.length} sub="Lifetime" />
                            <StatBlock label="Online" value={enumerators.filter((e: any) => e.status !== 'offline').length} sub="Active Now" />
                            <StatBlock label="Avg Efficiency" value="94%" sub="Completion Rate" />
                            <StatBlock label="Performance" value="A+" sub="Top Quartile" />
                        </div>

                        <div className="bg-card border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-900/50 border-b border-slate-800">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Enumerator ID</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Captures</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Session Time</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {enumerators.map((e: any) => (
                                        <tr key={e.enumeratorId} className="hover:bg-slate-800/20 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-slate-400 group-hover:bg-accent group-hover:text-white transition-all">
                                                        {e.enumeratorId.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-white tracking-tight">{e.enumeratorId}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${e.status === 'offline' ? 'bg-slate-500/10 text-slate-500 border-slate-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                    }`}>
                                                    <div className={`w-1 h-1 rounded-full ${e.status === 'offline' ? 'bg-slate-500' : 'bg-emerald-500'}`} />
                                                    {e.status || 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-slate-300 font-mono font-bold">{e.captures || 0}</td>
                                            <td className="px-6 py-5 text-slate-400 font-mono text-xs">
                                                {e.startTime ? `${Math.floor((Date.now() - e.startTime) / 60000)}m ago` : 'N/A'}
                                            </td>
                                            <td className="px-6 py-5 text-slate-300 font-mono font-bold">
                                                <button
                                                    onClick={() => { setCurrentView('god-view'); setActiveSession(e); }}
                                                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-accent transition-colors"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'live-telemetry':
                return (
                    <div className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
                        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Activity size={18} className="text-accent" />
                                <h3 className="font-bold text-lg text-white">System Activity Log</h3>
                            </div>
                            <div className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-md">
                                <span className="text-[10px] font-bold text-red-500 animate-pulse">LIVE STREAM</span>
                            </div>
                        </div>
                        <div className="p-4 font-mono text-sm space-y-2 max-h-[600px] overflow-auto">
                            {telemetryLogs.map((log: any) => (
                                <div key={log.id} className="flex gap-4 p-2 border-b border-slate-900 hover:bg-slate-900/20 transition-colors">
                                    <span className="text-slate-600 font-bold shrink-0">[{log.time}]</span>
                                    <span className="text-slate-300 break-all">{log.message}</span>
                                </div>
                            ))}
                            {telemetryLogs.length === 0 && (
                                <div className="p-20 text-center opacity-20">
                                    <Activity size={64} className="mx-auto mb-4" />
                                    <p>Initializing high-speed audit relay...</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="p-20 text-center">
                        <Activity size={48} className="text-slate-800 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">{currentView.replace('-', ' ').toUpperCase()}</h3>
                        <p className="text-slate-500">This module is coming soon in the next telemetry patch.</p>
                    </div>
                );
        }
    };

    return (
        <div className="flex h-screen bg-background font-sans text-slate-300">
            {/* Sidebar */}
            <div className="w-64 border-r border-slate-800 bg-card p-6 flex flex-col shadow-2xl z-20">
                <div className="flex items-center gap-4 mb-12">
                    <div className="p-2.5 bg-accent/20 rounded-2xl ring-1 ring-accent/30 shadow-lg shadow-accent/10">
                        <Activity className="text-accent" size={26} />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tighter text-white">REMT-X</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest pl-0.5">God Mode Activated</p>
                    </div>
                </div>

                <nav className="space-y-3 flex-1">
                    <NavItem icon={LayoutDashboard} label="God View" active={currentView === 'god-view'} onClick={() => setCurrentView('god-view')} />
                    <NavItem icon={Users} label="Enumerators" active={currentView === 'enumerators'} onClick={() => setCurrentView('enumerators')} />
                    <NavItem icon={MapPin} label="Field Map" active={currentView === 'field-map'} onClick={() => setCurrentView('field-map')} />
                    <NavItem icon={Activity} label="Live Telemetry" active={currentView === 'live-telemetry'} onClick={() => setCurrentView('live-telemetry')} />
                </nav>

                <div className="mt-auto p-5 bg-slate-950 rounded-3xl border border-slate-800/50 shadow-inner group cursor-help transition-all hover:bg-slate-900">
                    <p className="text-[10px] font-black text-slate-600 uppercase mb-3 tracking-[0.2em]">Operational Health</p>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-40" />
                        </div>
                        <span className="text-xs font-bold text-slate-300 tracking-tight">Hub Relay Online</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-10 bg-[linear-gradient(to_bottom_right,_#020617,_#0f172a)]">
                <header className="flex justify-between items-start mb-12 animate-in slide-in-from-top-4 duration-500">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-4xl font-black text-white tracking-tighter italic">
                                {currentView === 'god-view' ? 'LIVE MONITOR' : currentView.replace('-', ' ').toUpperCase()}
                            </h2>
                        </div>
                        <p className="text-slate-500 font-medium tracking-tight">Project: <span className="text-accent font-bold">ALPHA_REPLY_FIELD_BETA</span></p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-card/50 backdrop-blur-xl border border-slate-800 px-6 py-4 rounded-3xl flex items-center gap-4 shadow-2xl">
                            <div className="p-2 bg-amber-500/10 rounded-xl">
                                <AlertTriangle className="text-amber-500" size={20} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-white leading-none">{alerts.length}</p>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Alerts</p>
                            </div>
                        </div>
                    </div>
                </header>

                {renderContent()}
            </div>
        </div>
    );
}

function NavItem({ icon: Icon, label, active = false, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${active
                ? 'bg-accent/10 text-accent border border-accent/20 shadow-lg shadow-accent/5'
                : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/40'
                }`}>
            <div className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-accent/10' : 'group-hover:bg-slate-700/30'}`}>
                <Icon size={20} />
            </div>
            <span className="font-extrabold text-sm tracking-tight">{label}</span>
        </button>
    );
}

function StatBlock({ label, value, sub }: any) {
    return (
        <div className="bg-card border border-slate-800 p-6 rounded-3xl shadow-xl hover:border-slate-700 transition-colors">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</p>
            <p className="text-4xl font-black text-white tracking-tighter mb-1">{value}</p>
            <p className="text-xs font-medium text-slate-600 tracking-tight">{sub}</p>
        </div>
    );
}

function EnumeratorItem({ e, onWatch }: any) {
    return (
        <div className="flex items-center justify-between px-6 py-5 hover:bg-slate-800/20 transition-colors">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center font-bold text-slate-400 group-hover:bg-accent group-hover:text-white transition-all">
                    {e.enumeratorId.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h4 className="font-bold text-white text-base mb-1">{e.enumeratorId}</h4>
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${e.status === 'offline' ? 'bg-slate-700' : 'bg-accent shadow-[0_0_4px_rgba(56,189,248,0.5)]'}`} />
                        <span className="text-xs font-medium text-slate-500 tracking-wide">
                            {e.status === 'offline' ? 'Connection Lost' : 'Syncing Live Data'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="text-right">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Activity</p>
                    <p className="text-sm font-bold text-slate-200">{e.captures || 0} Captures</p>
                </div>
                <button
                    onClick={onWatch}
                    disabled={e.status === 'offline'}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border ${e.status === 'offline'
                        ? 'opacity-20 cursor-not-allowed border-slate-800 text-slate-600'
                        : 'bg-slate-800 border-slate-700 hover:border-accent text-slate-300 hover:text-white'
                        }`}
                >
                    <Eye size={16} />
                    Watch
                </button>
            </div>
        </div>
    );
}

function X({ size }: { size: number }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
}

