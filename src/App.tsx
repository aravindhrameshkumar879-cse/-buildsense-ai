import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, BarChart3, Bot, Building2, CheckCircle2, 
  ChevronRight, Cpu, Fan, LayoutDashboard, Lightbulb, 
  MessageSquare, Play, Settings, 
  Thermometer, TrendingUp, User, Wifi, Zap, Square
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- UTILITIES & TYPES ---

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Status = 'healthy' | 'warning' | 'critical';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface SensorData {
  temperature: number;
  vibration: number;
  current: number;
  humidity: number;
}

interface Equipment {
  id: string;
  name: string;
  building: string;
  floor: string;
  type: 'HVAC' | 'Generator' | 'Pump' | 'Motor' | 'Electrical';
  sensors: SensorData;
  healthScore: number;
  failureRisk: number;
  status: Status;
  lastMaintenance: string;
  history: Array<{ time: string; temp: number; vib: number; risk: number }>;
  issue?: string;
  action?: string;
}

interface MaintenanceTask {
  id: string;
  equipmentId: string;
  title: string;
  priority: Priority;
  status: 'Critical' | 'In Progress' | 'Scheduled' | 'Completed';
  createdAt: string;
  recommendation: string;
}

interface Alert {
  id: string;
  equipmentId: string;
  message: string;
  severity: Status;
  timestamp: string;
  acknowledged: boolean;
}

// --- MOCK DATA ENGINE ---

const INITIAL_EQUIPMENT: Equipment[] = [
  { id: 'EQ-001', name: 'HVAC-01', building: 'Academic Block', floor: 'Floor 1', type: 'HVAC', sensors: { temperature: 45, vibration: 2.1, current: 8.2, humidity: 45 }, healthScore: 98, failureRisk: 4, status: 'healthy', lastMaintenance: '2026-07-15', history: [] },
  { id: 'EQ-002', name: 'Generator-01', building: 'Admin Block', floor: 'Basement', type: 'Generator', sensors: { temperature: 52, vibration: 3.4, current: 15.1, humidity: 30 }, healthScore: 92, failureRisk: 12, status: 'healthy', lastMaintenance: '2026-06-20', history: [] },
  { id: 'EQ-003', name: 'Pump-01', building: 'Hostel', floor: 'Ground', type: 'Pump', sensors: { temperature: 38, vibration: 1.8, current: 6.5, humidity: 60 }, healthScore: 95, failureRisk: 8, status: 'healthy', lastMaintenance: '2026-08-01', history: [] },
  { id: 'EQ-004', name: 'HVAC-02', building: 'Library', floor: 'Floor 2', type: 'HVAC', sensors: { temperature: 48, vibration: 2.5, current: 9.1, humidity: 42 }, healthScore: 88, failureRisk: 18, status: 'healthy', lastMaintenance: '2026-05-10', history: [] },
  { id: 'EQ-005', name: 'Motor-01', building: 'Lab Block', floor: 'Floor 1', type: 'Motor', sensors: { temperature: 65, vibration: 5.2, current: 12.4, humidity: 35 }, healthScore: 72, failureRisk: 45, status: 'warning', lastMaintenance: '2026-04-12', history: [] },
];

const GENERATE_HISTORY = (baseTemp: number, baseVib: number, baseRisk: number) => {
  return Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    temp: baseTemp + (Math.random() * 4 - 2),
    vib: baseVib + (Math.random() * 0.5 - 0.25),
    risk: Math.max(0, Math.min(100, baseRisk + (Math.random() * 10 - 5)))
  }));
};

INITIAL_EQUIPMENT.forEach(eq => {
  eq.history = GENERATE_HISTORY(eq.sensors.temperature, eq.sensors.vibration, eq.failureRisk);
});

// --- AI PREDICTION ENGINE ---

const calculateAIAnalysis = (sensors: SensorData): { risk: number; health: number; issue: string; action: string; status: Status } => {
  let risk = 0;
  let issues: string[] = [];
  
  if (sensors.temperature > 70) { risk += 35; issues.push("Thermal overload"); }
  else if (sensors.temperature > 55) { risk += 15; issues.push("Elevated temperature"); }
  
  if (sensors.vibration > 8) { risk += 40; issues.push("Severe bearing degradation"); }
  else if (sensors.vibration > 4.5) { risk += 20; issues.push("Abnormal mechanical vibration"); }
  
  if (sensors.current > 14) { risk += 25; issues.push("Current spike detected"); }
  else if (sensors.current > 11) { risk += 10; issues.push("Irregular power draw"); }

  if (issues.length > 1) risk += 15;

  risk = Math.min(99, Math.max(0, Math.round(risk)));
  const health = Math.max(5, 100 - risk);
  
  let status: Status = 'healthy';
  let action = "Continue standard monitoring schedule.";
  if (risk >= 75) { status = 'critical'; action = "IMMEDIATE SHUTDOWN & INSPECTION REQUIRED."; }
  else if (risk >= 40) { status = 'warning'; action = "Schedule inspection within 48 hours. Check bearings and alignment."; }

  return {
    risk,
    health,
    issue: issues.length ? issues.join(", ") : "Operating within normal parameters",
    action,
    status
  };
};

// --- ANIMATED COMPONENTS ---

const Card = ({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => (
  <div 
    className={cn("glass-panel rounded-xl p-5 card-hover animate-fade-in-up hover:border-[#f59e0b]/40", className)}
    style={{ animationDelay: `${delay}s`, opacity: 0, animationFillMode: 'forwards' }}
  >
    {children}
  </div>
);

const Badge = ({ status }: { status: Status | Priority }) => {
  const colors = {
    healthy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    LOW: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    critical: "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse",
    CRITICAL: "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse",
  };
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wide", colors[status as keyof typeof colors] || colors.healthy)}>
      {status}
    </span>
  );
};

// --- MAIN APPLICATION ---

export default function BuildSenseAI() {
  const [view, setView] = useState<'login' | 'dashboard' | 'monitor' | 'equipment' | 'predictions' | 'maintenance' | 'copilot' | 'analytics'>('login');
  const [equipment, setEquipment] = useState<Equipment[]>(INITIAL_EQUIPMENT);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedEqId, setSelectedEqId] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user'|'ai', content: string}>>([
    { role: 'ai', content: "Hello. I'm BuildSense AI Copilot. Ask me about equipment health, maintenance priorities, or sensor anomalies." }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTasks = localStorage.getItem('bs_tasks');
    if (savedTasks) setTasks(JSON.parse(savedTasks));
  }, []);

  useEffect(() => {
    localStorage.setItem('bs_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (demoMode) return;
    
    const interval = setInterval(() => {
      setEquipment(prev => prev.map(eq => {
        const newSensors = {
          temperature: +(eq.sensors.temperature + (Math.random() * 0.4 - 0.2)).toFixed(1),
          vibration: +(eq.sensors.vibration + (Math.random() * 0.1 - 0.05)).toFixed(2),
          current: +(eq.sensors.current + (Math.random() * 0.2 - 0.1)).toFixed(1),
          humidity: eq.sensors.humidity
        };
        
        const analysis = calculateAIAnalysis(newSensors);
        
        const newHistory = [...eq.history.slice(-23), {
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          temp: newSensors.temperature,
          vib: newSensors.vibration,
          risk: analysis.risk
        }];

        return { ...eq, sensors: newSensors, ...analysis, history: newHistory };
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [demoMode]);

  useEffect(() => {
    equipment.forEach(eq => {
      if ((eq.status === 'critical' || eq.status === 'warning') && 
          !alerts.some(a => a.equipmentId === eq.id && !a.acknowledged)) {
        const newAlert: Alert = {
          id: `ALT-${Date.now()}`,
          equipmentId: eq.id,
          message: `${eq.name}: ${eq.issue}`,
          severity: eq.status,
          timestamp: new Date().toISOString(),
          acknowledged: false
        };
        setAlerts(prev => [newAlert, ...prev]);
      }
    });
  }, [equipment]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory, isTyping]);

  useEffect(() => {
    if (!demoMode) return;

    const targetId = 'EQ-001';
    const steps = [
      { delay: 1000, action: () => updateSensor(targetId, { temperature: 45, vibration: 2.1, current: 8.2 }) },
      { delay: 3000, action: () => updateSensor(targetId, { temperature: 52, vibration: 4.8, current: 9.5 }) },
      { delay: 5000, action: () => updateSensor(targetId, { temperature: 68, vibration: 7.2, current: 12.8 }) },
      { delay: 7000, action: () => updateSensor(targetId, { temperature: 78, vibration: 9.1, current: 14.2 }) },
      { delay: 9000, action: () => {
          setView('predictions');
          setSelectedEqId(targetId);
        }
      },
      { delay: 12000, action: () => {
          createTaskFromPrediction(targetId);
          setView('maintenance');
        }
      },
      { delay: 15000, action: () => {
          setTasks(prev => prev.map(t => t.equipmentId === targetId && t.status !== 'Completed' ? { ...t, status: 'Completed' } : t));
          updateSensor(targetId, { temperature: 44, vibration: 1.9, current: 8.0 });
        }
      },
      { delay: 18000, action: () => {
          setDemoMode(false);
          setDemoStep(0);
          alert("✅ Demo Sequence Completed Successfully!");
        }
      }
    ];

    const timeouts = steps.map((step, idx) => 
      setTimeout(() => {
        setDemoStep(idx + 1);
        step.action();
      }, step.delay)
    );

    return () => timeouts.forEach(clearTimeout);
  }, [demoMode]);

  const updateSensor = (id: string, sensors: Partial<SensorData>) => {
    setEquipment(prev => prev.map(eq => {
      if (eq.id !== id) return eq;
      const newSensors = { ...eq.sensors, ...sensors };
      const analysis = calculateAIAnalysis(newSensors);
      return { ...eq, sensors: newSensors, ...analysis };
    }));
  };

  const createTaskFromPrediction = (eqId: string) => {
    const eq = equipment.find(e => e.id === eqId);
    if (!eq) return;
    
    const existing = tasks.find(t => t.equipmentId === eqId && t.status !== 'Completed');
    if (existing) return;

    const newTask: MaintenanceTask = {
      id: `TSK-${Date.now()}`,
      equipmentId: eqId,
      title: `Inspect ${eq.name}`,
      priority: eq.status === 'critical' ? 'CRITICAL' : 'HIGH',
      status: 'Critical',
      createdAt: new Date().toISOString(),
      recommendation: eq.action || 'Schedule inspection'
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const handleCopilotSend = (msg: string) => {
    setChatHistory(prev => [...prev, { role: 'user', content: msg }]);
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      let response = "I'm analyzing that request based on current telemetry...";
      const lowerMsg = msg.toLowerCase();
      
      const criticalEq = equipment.reduce((prev, curr) => prev.failureRisk > curr.failureRisk ? prev : curr);
      
      if (lowerMsg.includes('inspect first') || lowerMsg.includes('priority')) {
        response = `${criticalEq.name} currently has the highest failure risk at ${criticalEq.failureRisk}%. Immediate inspection is recommended due to ${criticalEq.issue}.`;
      } else if (lowerMsg.includes('why') && lowerMsg.includes('high risk')) {
        const target = equipment.find(e => e.failureRisk > 50) || equipment[0];
        response = `${target.name} shows elevated risk because: ${target.issue}. Historical patterns suggest this will lead to failure within 48 hours if unaddressed.`;
      } else if (lowerMsg.includes('critical')) {
        const critCount = equipment.filter(e => e.status === 'critical').length;
        response = `There are currently ${critCount} assets in CRITICAL state. ${critCount > 0 ? `Top concern: ${criticalEq.name}.` : 'All systems nominal.'}`;
      } else if (lowerMsg.includes('vibration')) {
        const vibEq = equipment.filter(e => e.sensors.vibration > 4).map(e => e.name).join(', ');
        response = vibEq ? `Increasing vibration detected on: ${vibEq}. This typically indicates bearing wear or misalignment.` : "No abnormal vibration trends detected across campus assets.";
      }
      
      setChatHistory(prev => [...prev, { role: 'ai', content: response }]);
    }, 800);
  };

  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1c1c1c] via-[#0f0f0f] to-black p-4 animate-fade-in">
        <div className="w-full max-w-md glass-panel p-8 rounded-2xl border-t border-[#44403c]/50 animate-scale-in">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-[#f59e0b]/20 rounded-lg animate-float"><Building2 className="w-8 h-8 text-[#f59e0b]" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#fef3c7]">BuildSense AI</h1>
              <p className="text-[#a8a29e] text-sm">Predict Early. Act Smart.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="animate-fade-in-up stagger-1">
              <label className="block text-xs font-medium text-[#a8a29e] mb-1.5 uppercase tracking-wider">Email</label>
              <input type="email" defaultValue="admin@campus.edu" className="w-full bg-[#0f0f0f]/50 border border-[#3a3a3a] rounded-lg px-4 py-3 text-sm text-[#fef3c7] focus:outline-none focus:border-[#f59e0b] transition-colors" />
            </div>
            <div className="animate-fade-in-up stagger-2">
              <label className="block text-xs font-medium text-[#a8a29e] mb-1.5 uppercase tracking-wider">Password</label>
              <input type="password" defaultValue="password" className="w-full bg-[#0f0f0f]/50 border border-[#3a3a3a] rounded-lg px-4 py-3 text-sm text-[#fef3c7] focus:outline-none focus:border-[#f59e0b] transition-colors" />
            </div>
            <button 
              onClick={() => setView('dashboard')}
              className="w-full bg-[#f59e0b] hover:bg-[#fb923c] text-[#0f0f0f] font-bold py-3 rounded-lg transition-all mt-4 shadow-[0_0_20px_-5px_rgba(245,158,11,0.5)] animate-glow-pulse btn-press animate-fade-in-up stagger-3"
            >
              Enter Command Center
            </button>
          </div>
          <p className="text-center text-xs text-[#57534e] mt-6 animate-fade-in stagger-4">Secure Institutional Access • v2.4.0</p>
        </div>
      </div>
    );
  }

  const selectedEquipment = equipment.find(e => e.id === selectedEqId);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0f0f0f]">
      <aside className="w-64 border-r border-[#3a3a3a]/60 flex flex-col bg-[#0f0f0f]/80 backdrop-blur-xl z-20 hidden md:flex animate-slide-in-left">
        <div className="p-6 flex items-center gap-3 border-b border-[#3a3a3a]/60">
          <div className="p-1.5 bg-[#f59e0b]/20 rounded-md animate-float"><Building2 className="w-6 h-6 text-[#f59e0b]" /></div>
          <span className="font-bold text-lg tracking-tight text-[#fef3c7]">BuildSense</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'monitor', icon: Activity, label: 'Building Monitor' },
            { id: 'equipment', icon: Cpu, label: 'Equipment' },
            { id: 'predictions', icon: TrendingUp, label: 'AI Predictions' },
            { id: 'maintenance', icon: Settings, label: 'Maintenance' },
            { id: 'copilot', icon: Bot, label: 'AI Copilot' },
            { id: 'analytics', icon: BarChart3, label: 'Analytics' },
          ].map((item, index) => (
            <button
              key={item.id}
              onClick={() => { setView(item.id as any); setSelectedEqId(null); }}
              style={{ animationDelay: `${0.1 + index * 0.05}s`, opacity: 0, animationFillMode: 'forwards' }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all animate-slide-in-left btn-press",
                view === item.id 
                  ? "bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30" 
                  : "text-[#a8a29e] hover:text-[#fef3c7] hover:bg-[#1c1c1c]"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#3a3a3a]/60">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#1c1c1c]/50 border border-[#3a3a3a] animate-fade-in stagger-6">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#fef3c7] truncate">System Online</p>
              <p className="text-[10px] text-[#78716c] truncate">48 Assets Connected</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 border-b border-[#3a3a3a]/60 flex items-center justify-between px-6 bg-[#0f0f0f]/80 backdrop-blur-md z-10 animate-fade-in">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold capitalize text-[#fef3c7]">{view.replace('-', ' ')}</h2>
            {demoMode && (
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30 animate-pulse flex items-center gap-2">
                <Play className="w-3 h-3 fill-current" /> DEMO MODE ACTIVE (Step {demoStep}/8)
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {!demoMode ? (
              <button 
                onClick={() => { setDemoMode(true); setDemoStep(0); setView('dashboard'); }}
                className="flex items-center gap-2 px-4 py-2 bg-[#f59e0b] hover:bg-[#fb923c] text-[#0f0f0f] text-xs font-bold rounded-lg transition-all shadow-lg shadow-[#f59e0b]/30 animate-glow-pulse btn-press"
              >
                <Play className="w-3 h-3 fill-current" /> START HACKATHON DEMO
              </button>
            ) : (
              <button 
                onClick={() => setDemoMode(false)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-[#fef3c7] text-xs font-bold rounded-lg transition-all btn-press"
              >
                <Square className="w-3 h-3 fill-current" /> STOP DEMO
              </button>
            )}
            
            <div className="h-8 w-px bg-[#3a3a3a] mx-2" />
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-[#fef3c7]">Maintenance Admin</p>
                <p className="text-[10px] text-[#78716c]">Campus Facilities</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#2a2a2a] border border-[#44403c] flex items-center justify-center text-[#a8a29e]">
                <User className="w-4 h-4" />
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 scroll-smooth">
          
          {view === 'dashboard' && (
            <div key="dashboard" className="space-y-6 max-w-7xl mx-auto page-enter">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Building Health', value: '87%', sub: 'Healthy', color: 'text-emerald-400' },
                  { label: 'Connected Assets', value: '48', sub: 'All Online', color: 'text-[#f59e0b]' },
                  { label: 'Active Alerts', value: alerts.filter(a=>!a.acknowledged).length.toString(), sub: 'Requires Attention', color: 'text-amber-400' },
                  { label: 'High-Risk Assets', value: equipment.filter(e=>e.failureRisk > 50).length.toString(), sub: 'Predictive Flag', color: 'text-orange-400' },
                  { label: 'Predicted Failures', value: '5', sub: 'Next 30 Days', color: 'text-rose-400' },
                  { label: 'Energy Usage', value: '18.6', sub: 'MWh Today', color: 'text-[#fbbf24]' },
                ].map((stat, i) => (
                  <Card key={i} delay={i * 0.08} className="flex flex-col justify-between min-h-[120px]">
                    <p className="text-xs font-medium text-[#78716c] uppercase tracking-wider">{stat.label}</p>
                    <div>
                      <p className={cn("text-3xl font-bold tracking-tight", stat.color)}>{stat.value}</p>
                      <p className="text-xs text-[#a8a29e] mt-1">{stat.sub}</p>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card delay={0.3} className="lg:col-span-2 min-h-[400px] flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-[#fef3c7]">Campus Building Overview</h3>
                    <button onClick={() => setView('monitor')} className="text-xs text-[#f59e0b] hover:text-[#fbbf24] flex items-center gap-1 btn-press">View All <ChevronRight className="w-3 h-3"/></button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
                    {['Academic Block', 'Laboratory Block', 'Library', 'Administration', 'Hostel', 'Sports Complex'].map((bldg, i) => {
                      const bldgEq = equipment.filter(e => e.building.includes(bldg.split(' ')[0]));
                      const worstStatus = bldgEq.some(e => e.status === 'critical') ? 'critical' : bldgEq.some(e => e.status === 'warning') ? 'warning' : 'healthy';
                      return (
                        <button 
                          key={i}
                          onClick={() => { setView('monitor'); }}
                          style={{ animationDelay: `${0.4 + i * 0.08}s`, opacity: 0, animationFillMode: 'forwards' }}
                          className={cn(
                            "relative group p-4 rounded-xl border transition-all text-left h-full flex flex-col justify-between card-hover animate-fade-in-up btn-press",
                            worstStatus === 'critical' ? "bg-rose-500/5 border-rose-500/30 hover:bg-rose-500/10" :
                            worstStatus === 'warning' ? "bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10" :
                            "bg-[#1c1c1c]/50 border-[#3a3a3a] hover:border-[#44403c]"
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <Building2 className={cn("w-6 h-6", 
                              worstStatus === 'critical' ? "text-rose-400" : 
                              worstStatus === 'warning' ? "text-amber-400" : "text-[#78716c]"
                            )} />
                            <Badge status={worstStatus} />
                          </div>
                          <div>
                            <p className="font-medium text-[#fef3c7] text-sm">{bldg}</p>
                            <p className="text-xs text-[#78716c] mt-1">{bldgEq.length || Math.floor(Math.random()*5)+3} Assets Monitored</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Card>

                <Card delay={0.4} className="min-h-[400px] flex flex-col">
                  <h3 className="font-semibold text-[#fef3c7] mb-4">Priority Maintenance Queue</h3>
                  <div className="flex-1 space-y-3 overflow-auto pr-2">
                    {tasks.filter(t => t.status !== 'Completed').length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-[#57534e] text-sm animate-fade-in">
                        <CheckCircle2 className="w-8 h-8 mb-2 opacity-50 animate-float" />
                        No pending maintenance tasks
                      </div>
                    ) : (
                      tasks.filter(t => t.status !== 'Completed').sort((a,b) => {
                        const pMap = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
                        return pMap[b.priority] - pMap[a.priority];
                      }).map((task, i) => (
                        <div key={task.id} className="p-3 rounded-lg bg-[#0f0f0f]/50 border border-[#3a3a3a]/60 hover:border-[#f59e0b]/40 transition-colors cursor-pointer card-hover animate-fade-in-up btn-press" style={{ animationDelay: `${0.2 + i * 0.08}s`, opacity: 0, animationFillMode: 'forwards' }} onClick={() => {setView('maintenance')}}>
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-medium text-[#fef3c7]">{task.title}</span>
                            <Badge status={task.priority} />
                          </div>
                          <p className="text-xs text-[#78716c] line-clamp-1">{task.recommendation}</p>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {(view === 'equipment' || view === 'monitor' || view === 'predictions') && (
            <div key={selectedEqId || 'list'} className="max-w-7xl mx-auto space-y-6 page-enter">
              {!selectedEquipment ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {equipment.map((eq, idx) => (
                    <Card key={eq.id} delay={idx * 0.08} className="cursor-pointer group" >
                      <div className="flex justify-between items-start mb-4" onClick={() => setSelectedEqId(eq.id)}>
                        <div className="p-2 bg-[#2a2a2a] rounded-lg group-hover:bg-[#f59e0b]/20 transition-colors">
                          {eq.type === 'HVAC' ? <Fan className="w-5 h-5 text-[#a8a29e] group-hover:text-[#f59e0b]"/> : 
                           eq.type === 'Generator' ? <Zap className="w-5 h-5 text-[#a8a29e] group-hover:text-[#f59e0b]"/> :
                           <Cpu className="w-5 h-5 text-[#a8a29e] group-hover:text-[#f59e0b]"/>}
                        </div>
                        <Badge status={eq.status} />
                      </div>
                      <div onClick={() => setSelectedEqId(eq.id)}>
                        <h4 className="font-semibold text-[#fef3c7]">{eq.name}</h4>
                        <p className="text-xs text-[#78716c] mb-4">{eq.building} • {eq.floor}</p>
                        
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                          <div>
                            <p className="text-[#78716c]">Failure Risk</p>
                            <p className={cn("font-mono font-medium transition-all duration-300", eq.failureRisk > 70 ? "text-rose-400" : eq.failureRisk > 40 ? "text-amber-400" : "text-emerald-400")}>{eq.failureRisk}%</p>
                          </div>
                          <div>
                            <p className="text-[#78716c]">Health Score</p>
                            <p className="font-mono font-medium text-[#fde68a]">{eq.healthScore}%</p>
                          </div>
                          <div>
                            <p className="text-[#78716c]">Temperature</p>
                            <p className="font-mono font-medium text-[#fde68a]">{eq.sensors.temperature}°C</p>
                          </div>
                          <div>
                            <p className="text-[#78716c]">Vibration</p>
                            <p className="font-mono font-medium text-[#fde68a]">{eq.sensors.vibration} mm/s</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-6 animate-fade-in-up">
                  <button onClick={() => setSelectedEqId(null)} className="text-sm text-[#a8a29e] hover:text-[#fef3c7] flex items-center gap-1 mb-2 btn-press animate-slide-in-left">← Back to List</button>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="space-y-6">
                      <Card delay={0.1}>
                        <div className="flex justify-between items-center mb-6">
                          <div>
                            <h2 className="text-2xl font-bold text-[#fef3c7]">{selectedEquipment.name}</h2>
                            <p className="text-sm text-[#a8a29e]">{selectedEquipment.building} • {selectedEquipment.floor}</p>
                          </div>
                          <Badge status={selectedEquipment.status} />
                        </div>

                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-[#a8a29e]">AI Failure Probability</span>
                              <span className={cn("font-bold transition-all duration-500", selectedEquipment.failureRisk > 70 ? "text-rose-400" : "text-emerald-400")}>{selectedEquipment.failureRisk}%</span>
                            </div>
                            <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                              <div 
                                className={cn("h-full rounded-full progress-bar-fill", 
                                  selectedEquipment.failureRisk > 70 ? "bg-rose-500 animate-critical-pulse" : 
                                  selectedEquipment.failureRisk > 40 ? "bg-amber-500" : "bg-emerald-500"
                                )}
                                style={{ width: `${selectedEquipment.failureRisk}%` }}
                              />
                            </div>
                            <p className="text-xs text-[#78716c] mt-2 italic">"{selectedEquipment.issue}"</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#3a3a3a]/60">
                            {[
                              { label: 'Temperature', val: `${selectedEquipment.sensors.temperature}°C`, icon: Thermometer },
                              { label: 'Vibration', val: `${selectedEquipment.sensors.vibration} mm/s`, icon: Activity },
                              { label: 'Current', val: `${selectedEquipment.sensors.current} A`, icon: Zap },
                              { label: 'Humidity', val: `${selectedEquipment.sensors.humidity}%`, icon: Wifi },
                            ].map((s, i) => (
                              <div key={i} className="p-3 rounded-lg bg-[#0f0f0f]/50 border border-[#3a3a3a]/50 animate-fade-in-up card-hover" style={{ animationDelay: `${0.2 + i * 0.05}s`, opacity: 0, animationFillMode: 'forwards' }}>
                                <div className="flex items-center gap-2 text-[#78716c] mb-1">
                                  <s.icon className="w-3 h-3" />
                                  <span className="text-[10px] uppercase tracking-wider">{s.label}</span>
                                </div>
                                <p className="text-lg font-mono font-medium text-[#fef3c7] transition-all duration-300">{s.val}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Card>

                      {!demoMode && (
                        <Card delay={0.3} className="border-[#f59e0b]/30 bg-[#f59e0b]/5">
                          <h3 className="text-sm font-semibold text-[#fbbf24] mb-3 flex items-center gap-2">
                            <Settings className="w-4 h-4 animate-spin-slow" /> Manual Sensor Simulation
                          </h3>
                          <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => updateSensor(selectedEquipment.id, { temperature: 45, vibration: 2.1, current: 8.2 })} className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded border border-emerald-500/20 transition-colors btn-press">Normal</button>
                            <button onClick={() => updateSensor(selectedEquipment.id, { temperature: 62, vibration: 5.5, current: 11.5 })} className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium rounded border border-amber-500/20 transition-colors btn-press">Warning</button>
                            <button onClick={() => updateSensor(selectedEquipment.id, { temperature: 78, vibration: 9.1, current: 14.2 })} className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium rounded border border-rose-500/20 transition-colors btn-press">Critical</button>
                          </div>
                        </Card>
                      )}
                    </div>

                    <Card delay={0.2} className="lg:col-span-2 min-h-[400px] flex flex-col">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-[#fef3c7]">Real-time Telemetry & AI Trend</h3>
                        <div className="flex gap-2">
                          {['24H', '7D', '30D'].map(t => (
                            <button key={t} className="px-2 py-1 text-[10px] font-medium text-[#78716c] hover:text-[#fef3c7] hover:bg-[#2a2a2a] rounded transition-colors btn-press">{t}</button>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 min-h-[300px] animate-fade-in">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={selectedEquipment.history}>
                            <defs>
                              <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                            <XAxis dataKey="time" stroke="#57534e" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#57534e" fontSize={10} tickLine={false} axisLine={false} />
                            <RechartsTooltip 
                              contentStyle={{ backgroundColor: '#1c1c1c', borderColor: '#3a3a3a', borderRadius: '8px', fontSize: '12px', color: '#fef3c7' }}
                              itemStyle={{ color: '#fde68a' }}
                            />
                            <Area type="monotone" dataKey="risk" stroke="#dc2626" strokeWidth={2} fillOpacity={1} fill="url(#colorRisk)" name="Failure Risk %" />
                            <Area type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" name="Temperature °C" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </div>

                  {selectedEquipment.failureRisk > 30 && (
                    <div className="glass-panel rounded-xl p-6 border-l-4 border-l-[#f59e0b] animate-slide-in-left" style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Lightbulb className="w-4 h-4 text-[#f59e0b] animate-pulse" />
                            <span className="text-xs font-bold text-[#f59e0b] uppercase tracking-wider">AI Prescriptive Recommendation</span>
                          </div>
                          <h3 className="text-lg font-semibold text-[#fef3c7] mb-1">{selectedEquipment.action}</h3>
                          <p className="text-sm text-[#a8a29e]">Reason: {selectedEquipment.issue} deviates from baseline operating pattern.</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <button 
                            onClick={() => createTaskFromPrediction(selectedEquipment.id)}
                            disabled={tasks.some(t => t.equipmentId === selectedEquipment.id && t.status !== 'Completed')}
                            className="px-4 py-2 bg-[#f59e0b] hover:bg-[#fb923c] disabled:bg-[#2a2a2a] disabled:text-[#78716c] text-[#0f0f0f] text-sm font-bold rounded-lg transition-all shadow-lg shadow-[#f59e0b]/30 btn-press"
                          >
                            {tasks.some(t => t.equipmentId === selectedEquipment.id && t.status !== 'Completed') ? '✓ Task Created' : 'Create Maintenance Task'}
                          </button>
                          <button className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-[#fde68a] text-sm font-medium rounded-lg transition-all btn-press">Acknowledge</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {view === 'maintenance' && (
            <div key="maintenance" className="h-full flex flex-col max-w-7xl mx-auto page-enter">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#fef3c7]">Maintenance Priority Board</h2>
                <div className="flex gap-2">
                  {['All', 'Critical', 'High', 'Medium'].map(f => (
                    <button key={f} className="px-3 py-1.5 text-xs font-medium text-[#a8a29e] hover:text-[#fef3c7] bg-[#1c1c1c] hover:bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg transition-all btn-press">{f}</button>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
                {(['Critical', 'In Progress', 'Scheduled', 'Completed'] as const).map((status, sIdx) => (
                  <div key={status} className="flex flex-col min-w-[280px] animate-fade-in-up" style={{ animationDelay: `${sIdx * 0.1}s`, opacity: 0, animationFillMode: 'forwards' }}>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="text-xs font-bold text-[#78716c] uppercase tracking-wider">{status}</h3>
                      <span className="text-[10px] bg-[#1c1c1c] px-2 py-0.5 rounded-full text-[#57534e] border border-[#3a3a3a]">
                        {tasks.filter(t => t.status === status).length}
                      </span>
                    </div>
                    <div className="flex-1 bg-[#1c1c1c]/30 rounded-xl p-2 space-y-2 border border-[#3a3a3a]/30">
                      {tasks.filter(t => t.status === status).map((task, tIdx) => (
                        <div key={task.id} className="p-3 bg-[#0f0f0f] border border-[#3a3a3a] rounded-lg shadow-sm hover:border-[#f59e0b]/40 transition-all group card-hover animate-fade-in-up" style={{ animationDelay: `${0.1 + tIdx * 0.08}s`, opacity: 0, animationFillMode: 'forwards' }}>
                          <div className="flex justify-between items-start mb-2">
                            <Badge status={task.priority} />
                            <span className="text-[10px] text-[#57534e]">{new Date(task.createdAt).toLocaleDateString()}</span>
                          </div>
                          <h4 className="text-sm font-medium text-[#fef3c7] mb-1">{task.title}</h4>
                          <p className="text-xs text-[#78716c] mb-3 line-clamp-2">{task.recommendation}</p>
                          
                          {status !== 'Completed' && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {status === 'Critical' && (
                                <button onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? {...t, status: 'In Progress'} : t))} className="flex-1 py-1 text-[10px] bg-[#f59e0b]/10 text-[#f59e0b] rounded hover:bg-[#f59e0b]/20 btn-press">Start</button>
                              )}
                              {status === 'In Progress' && (
                                <button onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? {...t, status: 'Scheduled'} : t))} className="flex-1 py-1 text-[10px] bg-amber-500/10 text-amber-400 rounded hover:bg-amber-500/20 btn-press">Schedule</button>
                              )}
                              {status === 'Scheduled' && (
                                <button onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? {...t, status: 'Completed'} : t))} className="flex-1 py-1 text-[10px] bg-emerald-500/10 text-emerald-400 rounded hover:bg-emerald-500/20 btn-press">Complete</button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {tasks.filter(t => t.status === status).length === 0 && (
                        <div className="h-24 flex items-center justify-center text-xs text-[#57534e] border-2 border-dashed border-[#3a3a3a]/50 rounded-lg">
                          No tasks
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'copilot' && (
            <div key="copilot" className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col glass-panel rounded-2xl overflow-hidden animate-scale-in">
              <div className="p-4 border-b border-[#3a3a3a]/60 bg-[#1c1c1c]/80 flex items-center gap-3">
                <div className="p-2 bg-[#f59e0b]/20 rounded-lg animate-float"><Bot className="w-5 h-5 text-[#f59e0b]" /></div>
                <div>
                  <h3 className="font-semibold text-[#fef3c7]">BuildSense AI Copilot</h3>
                  <p className="text-xs text-[#78716c]">Your 24/7 virtual maintenance assistant</p>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto p-4 space-y-4 bg-[#0f0f0f]/50">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      "max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-[#f59e0b] text-[#0f0f0f] font-medium rounded-br-none animate-slide-in-right" 
                        : "bg-[#2a2a2a] text-[#fde68a] rounded-bl-none border border-[#44403c] animate-slide-in-left"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start animate-fade-in">
                    <div className="bg-[#2a2a2a] border border-[#44403c] rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1">
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              <div className="p-4 border-t border-[#3a3a3a]/60 bg-[#1c1c1c]/80 space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {['Which equipment should I inspect first?', 'Why is HVAC-01 at high risk?', 'Show critical equipment', 'Which equipment has increasing vibration?'].map(q => (
                    <button 
                      key={q} 
                      onClick={() => handleCopilotSend(q)}
                      className="whitespace-nowrap px-3 py-1.5 bg-[#2a2a2a] hover:bg-[#3a3a3a] border border-[#44403c] rounded-full text-xs text-[#fde68a] transition-colors btn-press"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); const input = e.currentTarget.input as HTMLInputElement; if(input.value.trim()) { handleCopilotSend(input.value); input.value = ''; } }}>
                  <div className="relative">
                    <input name="input" type="text" placeholder="Ask about equipment health, risks, or maintenance..." className="w-full bg-[#0f0f0f] border border-[#3a3a3a] rounded-xl pl-4 pr-12 py-3 text-sm text-[#fef3c7] focus:outline-none focus:border-[#f59e0b] transition-colors" />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#f59e0b] hover:bg-[#fb923c] rounded-lg text-[#0f0f0f] transition-colors btn-press">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {view === 'analytics' && (
            <div key="analytics" className="max-w-7xl mx-auto space-y-6 page-enter">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card delay={0.1} className="min-h-[300px]">
                  <h3 className="font-semibold text-[#fef3c7] mb-4">Campus Energy Consumption (MWh)</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={[{d:'Mon',v:18},{d:'Tue',v:22},{d:'Wed',v:19},{d:'Thu',v:24},{d:'Fri',v:21},{d:'Sat',v:15},{d:'Sun',v:14}]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                      <XAxis dataKey="d" stroke="#57534e" fontSize={10} />
                      <YAxis stroke="#57534e" fontSize={10} />
                      <RechartsTooltip contentStyle={{backgroundColor:'#1c1c1c',borderColor:'#3a3a3a',borderRadius:'8px',color:'#fef3c7'}} />
                      <Line type="monotone" dataKey="v" stroke="#fb923c" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
                <Card delay={0.2} className="min-h-[300px]">
                  <h3 className="font-semibold text-[#fef3c7] mb-4">Aggregate Failure Risk Distribution</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={equipment.map(e => ({name: e.name, risk: e.failureRisk}))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                      <XAxis dataKey="name" stroke="#57534e" fontSize={10} />
                      <YAxis stroke="#57534e" fontSize={10} />
                      <RechartsTooltip contentStyle={{backgroundColor:'#1c1c1c',borderColor:'#3a3a3a',borderRadius:'8px',color:'#fef3c7'}} />
                      <Area type="step" dataKey="risk" stroke="#dc2626" fill="#dc2626" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}