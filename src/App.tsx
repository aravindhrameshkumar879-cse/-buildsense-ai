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

// --- AI PREDICTION ENGINE (RULE-BASED SIMULATION) ---

const calculateAIAnalysis = (sensors: SensorData): { risk: number; health: number; issue: string; action: string; status: Status } => {
  let risk = 0;
  let issues: string[] = [];
  
  // Thermal Analysis
  if (sensors.temperature > 70) { risk += 35; issues.push("Thermal overload"); }
  else if (sensors.temperature > 55) { risk += 15; issues.push("Elevated temperature"); }
  
  // Mechanical Analysis
  if (sensors.vibration > 8) { risk += 40; issues.push("Severe bearing degradation"); }
  else if (sensors.vibration > 4.5) { risk += 20; issues.push("Abnormal mechanical vibration"); }
  
  // Electrical Analysis
  if (sensors.current > 14) { risk += 25; issues.push("Current spike detected"); }
  else if (sensors.current > 11) { risk += 10; issues.push("Irregular power draw"); }

  // Compound penalty
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

// --- COMPONENTS ---

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("glass-panel rounded-xl p-5 transition-all duration-300 hover:border-slate-700", className)}>
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Persist to localStorage
  useEffect(() => {
    const savedTasks = localStorage.getItem('bs_tasks');
    if (savedTasks) setTasks(JSON.parse(savedTasks));
  }, []);

  useEffect(() => {
    localStorage.setItem('bs_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Live Sensor Simulation Tick
  useEffect(() => {
    if (demoMode) return; // Pause random noise during demo
    
    const interval = setInterval(() => {
      setEquipment(prev => prev.map(eq => {
        // Add tiny realistic noise to sensors
        const newSensors = {
          temperature: +(eq.sensors.temperature + (Math.random() * 0.4 - 0.2)).toFixed(1),
          vibration: +(eq.sensors.vibration + (Math.random() * 0.1 - 0.05)).toFixed(2),
          current: +(eq.sensors.current + (Math.random() * 0.2 - 0.1)).toFixed(1),
          humidity: eq.sensors.humidity
        };
        
        const analysis = calculateAIAnalysis(newSensors);
        
        // Update history for charts (keep last 24 points)
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

  // Auto-generate alerts when status changes to critical/warning
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

  // Scroll chat to bottom
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  // --- HACKATHON DEMO MODE LOGIC ---
  useEffect(() => {
    if (!demoMode) return;

    const targetId = 'EQ-001'; // HVAC-01
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
          // Simulate completing the task
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
      recommendation: eq.action
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const handleCopilotSend = (msg: string) => {
    setChatHistory(prev => [...prev, { role: 'user', content: msg }]);
    
    setTimeout(() => {
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

  // --- RENDER HELPERS ---

  if (view === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-4">
        <div className="w-full max-w-md glass-panel p-8 rounded-2xl border-t border-slate-700/50">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-indigo-500/20 rounded-lg"><Building2 className="w-8 h-8 text-indigo-400" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">BuildSense AI</h1>
              <p className="text-slate-400 text-sm">Predict Early. Act Smart.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Email</label>
              <input type="email" defaultValue="admin@campus.edu" className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
              <input type="password" defaultValue="password" className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
            <button 
              onClick={() => setView('dashboard')}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg transition-all mt-4 shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)]"
            >
              Enter Command Center
            </button>
          </div>
          <p className="text-center text-xs text-slate-600 mt-6">Secure Institutional Access • v2.4.0</p>
        </div>
      </div>
    );
  }

  const selectedEquipment = equipment.find(e => e.id === selectedEqId);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-800/60 flex flex-col bg-slate-950/80 backdrop-blur-xl z-20 hidden md:flex">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/60">
          <div className="p-1.5 bg-indigo-500/20 rounded-md"><Building2 className="w-6 h-6 text-indigo-400" /></div>
          <span className="font-bold text-lg tracking-tight">BuildSense</span>
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
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setView(item.id as any); setSelectedEqId(null); }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                view === item.id 
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800/60">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-800">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">System Online</p>
              <p className="text-[10px] text-slate-500 truncate">48 Assets Connected</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* TOP BAR */}
        <header className="h-16 border-b border-slate-800/60 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold capitalize">{view.replace('-', ' ')}</h2>
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
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/20"
              >
                <Play className="w-3 h-3 fill-current" /> START HACKATHON DEMO
              </button>
            ) : (
              <button 
                onClick={() => setDemoMode(false)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-all"
              >
                <Square className="w-3 h-3 fill-current" /> STOP DEMO
              </button>
            )}
            
            <div className="h-8 w-px bg-slate-800 mx-2" />
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-medium text-slate-200">Maintenance Admin</p>
                <p className="text-[10px] text-slate-500">Campus Facilities</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                <User className="w-4 h-4" />
              </div>
            </div>
          </div>
        </header>

        {/* SCROLLABLE VIEWPORT */}
        <div className="flex-1 overflow-auto p-6 scroll-smooth">
          
          {/* DASHBOARD VIEW */}
          {view === 'dashboard' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Building Health', value: '87%', sub: 'Healthy', color: 'text-emerald-400' },
                  { label: 'Connected Assets', value: '48', sub: 'All Online', color: 'text-indigo-400' },
                  { label: 'Active Alerts', value: alerts.filter(a=>!a.acknowledged).length.toString(), sub: 'Requires Attention', color: 'text-amber-400' },
                  { label: 'High-Risk Assets', value: equipment.filter(e=>e.failureRisk > 50).length.toString(), sub: 'Predictive Flag', color: 'text-orange-400' },
                  { label: 'Predicted Failures', value: '5', sub: 'Next 30 Days', color: 'text-rose-400' },
                  { label: 'Energy Usage', value: '18.6', sub: 'MWh Today', color: 'text-cyan-400' },
                ].map((stat, i) => (
                  <Card key={i} className="flex flex-col justify-between min-h-[120px]">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
                    <div>
                      <p className={cn("text-3xl font-bold tracking-tight", stat.color)}>{stat.value}</p>
                      <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 min-h-[400px] flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-semibold text-slate-200">Campus Building Overview</h3>
                    <button onClick={() => setView('monitor')} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">View All <ChevronRight className="w-3 h-3"/></button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1">
                    {['Academic Block', 'Laboratory Block', 'Library', 'Administration', 'Hostel', 'Sports Complex'].map((bldg, i) => {
                      const bldgEq = equipment.filter(e => e.building.includes(bldg.split(' ')[0]));
                      const worstStatus = bldgEq.some(e => e.status === 'critical') ? 'critical' : bldgEq.some(e => e.status === 'warning') ? 'warning' : 'healthy';
                      return (
                        <button 
                          key={i}
                          onClick={() => { setView('monitor'); }}
                          className={cn(
                            "relative group p-4 rounded-xl border transition-all text-left h-full flex flex-col justify-between",
                            worstStatus === 'critical' ? "bg-rose-500/5 border-rose-500/30 hover:bg-rose-500/10" :
                            worstStatus === 'warning' ? "bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10" :
                            "bg-slate-900/50 border-slate-800 hover:border-slate-600"
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <Building2 className={cn("w-6 h-6", 
                              worstStatus === 'critical' ? "text-rose-400" : 
                              worstStatus === 'warning' ? "text-amber-400" : "text-slate-500"
                            )} />
                            <Badge status={worstStatus} />
                          </div>
                          <div>
                            <p className="font-medium text-slate-200 text-sm">{bldg}</p>
                            <p className="text-xs text-slate-500 mt-1">{bldgEq.length || Math.floor(Math.random()*5)+3} Assets Monitored</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Card>

                <Card className="min-h-[400px] flex flex-col">
                  <h3 className="font-semibold text-slate-200 mb-4">Priority Maintenance Queue</h3>
                  <div className="flex-1 space-y-3 overflow-auto pr-2">
                    {tasks.filter(t => t.status !== 'Completed').length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-600 text-sm">
                        <CheckCircle2 className="w-8 h-8 mb-2 opacity-50" />
                        No pending maintenance tasks
                      </div>
                    ) : (
                      tasks.filter(t => t.status !== 'Completed').sort((a,b) => {
                        const pMap = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
                        return pMap[b.priority] - pMap[a.priority];
                      }).map(task => (
                        <div key={task.id} className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/60 hover:border-slate-700 transition-colors cursor-pointer" onClick={() => {setView('maintenance')}}>
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-sm font-medium text-slate-200">{task.title}</span>
                            <Badge status={task.priority} />
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1">{task.recommendation}</p>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* EQUIPMENT / MONITOR / PREDICTIONS DETAIL VIEW */}
          {(view === 'equipment' || view === 'monitor' || view === 'predictions') && (
            <div className="max-w-7xl mx-auto space-y-6">
              {!selectedEquipment ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {equipment.map(eq => (
                    <Card key={eq.id} className="cursor-pointer hover:shadow-indigo-500/10 group" >
                      <div className="flex justify-between items-start mb-4" onClick={() => setSelectedEqId(eq.id)}>
                        <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                          {eq.type === 'HVAC' ? <Fan className="w-5 h-5 text-slate-400 group-hover:text-indigo-400"/> : 
                           eq.type === 'Generator' ? <Zap className="w-5 h-5 text-slate-400 group-hover:text-indigo-400"/> :
                           <Cpu className="w-5 h-5 text-slate-400 group-hover:text-indigo-400"/>}
                        </div>
                        <Badge status={eq.status} />
                      </div>
                      <div onClick={() => setSelectedEqId(eq.id)}>
                        <h4 className="font-semibold text-slate-200">{eq.name}</h4>
                        <p className="text-xs text-slate-500 mb-4">{eq.building} • {eq.floor}</p>
                        
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                          <div>
                            <p className="text-slate-500">Failure Risk</p>
                            <p className={cn("font-mono font-medium", eq.failureRisk > 70 ? "text-rose-400" : eq.failureRisk > 40 ? "text-amber-400" : "text-emerald-400")}>{eq.failureRisk}%</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Health Score</p>
                            <p className="font-mono font-medium text-slate-300">{eq.healthScore}%</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Temperature</p>
                            <p className="font-mono font-medium text-slate-300">{eq.sensors.temperature}°C</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Vibration</p>
                            <p className="font-mono font-medium text-slate-300">{eq.sensors.vibration} mm/s</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <button onClick={() => setSelectedEqId(null)} className="text-sm text-slate-400 hover:text-white flex items-center gap-1 mb-2">← Back to List</button>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT COL: STATS & CONTROLS */}
                    <div className="space-y-6">
                      <Card>
                        <div className="flex justify-between items-center mb-6">
                          <div>
                            <h2 className="text-2xl font-bold text-white">{selectedEquipment.name}</h2>
                            <p className="text-sm text-slate-400">{selectedEquipment.building} • {selectedEquipment.floor}</p>
                          </div>
                          <Badge status={selectedEquipment.status} />
                        </div>

                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-400">AI Failure Probability</span>
                              <span className={cn("font-bold", selectedEquipment.failureRisk > 70 ? "text-rose-400" : "text-emerald-400")}>{selectedEquipment.failureRisk}%</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className={cn("h-full transition-all duration-1000 ease-out", 
                                  selectedEquipment.failureRisk > 70 ? "bg-rose-500" : 
                                  selectedEquipment.failureRisk > 40 ? "bg-amber-500" : "bg-emerald-500"
                                )}
                                style={{ width: `${selectedEquipment.failureRisk}%` }}
                              />
                            </div>
                            <p className="text-xs text-slate-500 mt-2 italic">"{selectedEquipment.issue}"</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800/60">
                            {[
                              { label: 'Temperature', val: `${selectedEquipment.sensors.temperature}°C`, icon: Thermometer },
                              { label: 'Vibration', val: `${selectedEquipment.sensors.vibration} mm/s`, icon: Activity },
                              { label: 'Current', val: `${selectedEquipment.sensors.current} A`, icon: Zap },
                              { label: 'Humidity', val: `${selectedEquipment.sensors.humidity}%`, icon: Wifi },
                            ].map((s, i) => (
                              <div key={i} className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/50">
                                <div className="flex items-center gap-2 text-slate-500 mb-1">
                                  <s.icon className="w-3 h-3" />
                                  <span className="text-[10px] uppercase tracking-wider">{s.label}</span>
                                </div>
                                <p className="text-lg font-mono font-medium text-slate-200">{s.val}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Card>

                      {/* SIMULATION CONTROLS - ONLY VISIBLE WHEN NOT IN DEMO */}
                      {!demoMode && (
                        <Card className="border-indigo-500/20 bg-indigo-500/5">
                          <h3 className="text-sm font-semibold text-indigo-300 mb-3 flex items-center gap-2">
                            <Settings className="w-4 h-4" /> Manual Sensor Simulation
                          </h3>
                          <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => updateSensor(selectedEquipment.id, { temperature: 45, vibration: 2.1, current: 8.2 })} className="px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded border border-emerald-500/20 transition-colors">Normal</button>
                            <button onClick={() => updateSensor(selectedEquipment.id, { temperature: 62, vibration: 5.5, current: 11.5 })} className="px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium rounded border border-amber-500/20 transition-colors">Warning</button>
                            <button onClick={() => updateSensor(selectedEquipment.id, { temperature: 78, vibration: 9.1, current: 14.2 })} className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium rounded border border-rose-500/20 transition-colors">Critical</button>
                          </div>
                        </Card>
                      )}
                    </div>

                    {/* MIDDLE COL: CHARTS */}
                    <Card className="lg:col-span-2 min-h-[400px] flex flex-col">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-slate-200">Real-time Telemetry & AI Trend</h3>
                        <div className="flex gap-2">
                          {['24H', '7D', '30D'].map(t => (
                            <button key={t} className="px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-white hover:bg-slate-800 rounded transition-colors">{t}</button>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1 min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={selectedEquipment.history}>
                            <defs>
                              <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                            <RechartsTooltip 
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px' }}
                              itemStyle={{ color: '#e2e8f0' }}
                            />
                            <Area type="monotone" dataKey="risk" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorRisk)" name="Failure Risk %" />
                            <Area type="monotone" dataKey="temp" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" name="Temperature °C" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </div>

                  {/* PRESCRIPTIVE ACTION PANEL */}
                  {selectedEquipment.failureRisk > 30 && (
                    <div className="glass-panel rounded-xl p-6 border-l-4 border-l-indigo-500 animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Lightbulb className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">AI Prescriptive Recommendation</span>
                          </div>
                          <h3 className="text-lg font-semibold text-white mb-1">{selectedEquipment.action}</h3>
                          <p className="text-sm text-slate-400">Reason: {selectedEquipment.issue} deviates from baseline operating pattern.</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <button 
                            onClick={() => createTaskFromPrediction(selectedEquipment.id)}
                            disabled={tasks.some(t => t.equipmentId === selectedEquipment.id && t.status !== 'Completed')}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-all shadow-lg shadow-indigo-500/20"
                          >
                            {tasks.some(t => t.equipmentId === selectedEquipment.id && t.status !== 'Completed') ? 'Task Created' : 'Create Maintenance Task'}
                          </button>
                          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-all">Acknowledge</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MAINTENANCE KANBAN */}
          {view === 'maintenance' && (
            <div className="h-full flex flex-col max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Maintenance Priority Board</h2>
                <div className="flex gap-2">
                  {['All', 'Critical', 'High', 'Medium'].map(f => (
                    <button key={f} className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-all">{f}</button>
                  ))}
                </div>
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
                {(['Critical', 'In Progress', 'Scheduled', 'Completed'] as const).map(status => (
                  <div key={status} className="flex flex-col min-w-[280px]">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{status}</h3>
                      <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-full text-slate-600 border border-slate-800">
                        {tasks.filter(t => t.status === status).length}
                      </span>
                    </div>
                    <div className="flex-1 bg-slate-900/30 rounded-xl p-2 space-y-2 border border-slate-800/30">
                      {tasks.filter(t => t.status === status).map(task => (
                        <div key={task.id} className="p-3 bg-slate-950 border border-slate-800 rounded-lg shadow-sm hover:border-slate-700 transition-all group">
                          <div className="flex justify-between items-start mb-2">
                            <Badge status={task.priority} />
                            <span className="text-[10px] text-slate-600">{new Date(task.createdAt).toLocaleDateString()}</span>
                          </div>
                          <h4 className="text-sm font-medium text-slate-200 mb-1">{task.title}</h4>
                          <p className="text-xs text-slate-500 mb-3 line-clamp-2">{task.recommendation}</p>
                          
                          {status !== 'Completed' && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {status === 'Critical' && (
                                <button onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? {...t, status: 'In Progress'} : t))} className="flex-1 py-1 text-[10px] bg-indigo-500/10 text-indigo-400 rounded hover:bg-indigo-500/20">Start</button>
                              )}
                              {status === 'In Progress' && (
                                <button onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? {...t, status: 'Scheduled'} : t))} className="flex-1 py-1 text-[10px] bg-amber-500/10 text-amber-400 rounded hover:bg-amber-500/20">Schedule</button>
                              )}
                              {status === 'Scheduled' && (
                                <button onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? {...t, status: 'Completed'} : t))} className="flex-1 py-1 text-[10px] bg-emerald-500/10 text-emerald-400 rounded hover:bg-emerald-500/20">Complete</button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {tasks.filter(t => t.status === status).length === 0 && (
                        <div className="h-24 flex items-center justify-center text-xs text-slate-700 border-2 border-dashed border-slate-800/50 rounded-lg">
                          No tasks
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI COPILOT */}
          {view === 'copilot' && (
            <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col glass-panel rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-800/60 bg-slate-900/80 flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-lg"><Bot className="w-5 h-5 text-indigo-400" /></div>
                <div>
                  <h3 className="font-semibold text-white">BuildSense AI Copilot</h3>
                  <p className="text-xs text-slate-500">Your 24/7 virtual maintenance assistant</p>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto p-4 space-y-4 bg-slate-950/50">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      "max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed",
                      msg.role === 'user' 
                        ? "bg-indigo-600 text-white rounded-br-none" 
                        : "bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              
              <div className="p-4 border-t border-slate-800/60 bg-slate-900/80 space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {['Which equipment should I inspect first?', 'Why is HVAC-01 at high risk?', 'Show critical equipment', 'Which equipment has increasing vibration?'].map(q => (
                    <button 
                      key={q} 
                      onClick={() => handleCopilotSend(q)}
                      className="whitespace-nowrap px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-xs text-slate-300 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); const input = e.currentTarget.input as HTMLInputElement; if(input.value.trim()) { handleCopilotSend(input.value); input.value = ''; } }}>
                  <div className="relative">
                    <input name="input" type="text" placeholder="Ask about equipment health, risks, or maintenance..." className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-colors">
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ANALYTICS PLACEHOLDER */}
          {view === 'analytics' && (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="min-h-[300px]">
                  <h3 className="font-semibold text-slate-200 mb-4">Campus Energy Consumption (MWh)</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={[{d:'Mon',v:18},{d:'Tue',v:22},{d:'Wed',v:19},{d:'Thu',v:24},{d:'Fri',v:21},{d:'Sat',v:15},{d:'Sun',v:14}]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="d" stroke="#475569" fontSize={10} />
                      <YAxis stroke="#475569" fontSize={10} />
                      <RechartsTooltip contentStyle={{backgroundColor:'#0f172a',borderColor:'#1e293b',borderRadius:'8px'}} />
                      <Line type="monotone" dataKey="v" stroke="#06b6d4" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
                <Card className="min-h-[300px]">
                  <h3 className="font-semibold text-slate-200 mb-4">Aggregate Failure Risk Distribution</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={equipment.map(e => ({name: e.name, risk: e.failureRisk}))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#475569" fontSize={10} />
                      <YAxis stroke="#475569" fontSize={10} />
                      <RechartsTooltip contentStyle={{backgroundColor:'#0f172a',borderColor:'#1e293b',borderRadius:'8px'}} />
                      <Area type="step" dataKey="risk" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.2} />
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