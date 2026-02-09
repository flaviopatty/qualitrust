import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface SystemAlert {
  id: string;
  title: string;
  content: string;
  expiresAt: any;
  severity: 'low' | 'medium' | 'high';
}

interface ContractInfo {
  contractId: string;
  contractValidity: string;
}

const Dashboard: React.FC = () => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch Contract Info
    const fetchContract = async () => {
      const docRef = doc(db, 'settings', 'general');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setContractInfo(docSnap.data() as ContractInfo);
      }
    };

    // 2. Fetch System Alerts (Filtered by expiry)
    const qAlerts = query(
      collection(db, 'system_alerts'),
      where('expiresAt', '>', Timestamp.now())
    );

    const unsubscribeAlerts = onSnapshot(qAlerts, (snapshot) => {
      const alertsArr = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemAlert));
      setAlerts(alertsArr);
    });

    // 3. Fetch Units and Evaluations in real-time
    const unsubscribeUnits = onSnapshot(collection(db, 'units'), (snapshot) => {
      setUnits(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubscribeEvals = onSnapshot(collection(db, 'evaluations'), (snapshot) => {
      setEvaluations(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    fetchContract();
    setLoading(false);

    return () => {
      unsubscribeAlerts();
      unsubscribeUnits();
      unsubscribeEvals();
    };
  }, []);

  // Check if unit has a completed evaluation for the current month
  const isUnitCompleted = (unitName: string) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    return evaluations.some(ev => {
      const evDate = ev.date?.toDate ? ev.date.toDate() : new Date(ev.date);
      return ev.unit === unitName &&
        evDate.getMonth() === currentMonth &&
        evDate.getFullYear() === currentYear;
    });
  };

  // Mock data for the chart - in a real app would be aggregates from Firestore
  const chartData = [
    { name: 'JAN', desinsetizacao: 4000, desratizacao: 2400, cupins: 2400 },
    { name: 'FEV', desinsetizacao: 3000, desratizacao: 1398, cupins: 2210 },
    { name: 'MAR', desinsetizacao: 2000, desratizacao: 9800, cupins: 2290 },
    { name: 'ABR', desinsetizacao: 2780, desratizacao: 3908, cupins: 2000 },
  ];

  const compliance = units.length > 0 ? (evaluations.filter(e => {
    const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
    return d.getMonth() === new Date().getMonth();
  }).length / units.length * 100).toFixed(1) : '0';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold mb-1">Painel de Monitoramento</h1>
          <p className="text-slate-500">Dashboard integrado com dados em tempo real do Firebase.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-slate-200">
          <p className="text-[10px] font-black uppercase text-slate-400">Contrato Atual</p>
          <p className="text-sm font-bold text-primary">{contractInfo?.contractId || 'CT-QUALITRUST'}</p>
        </div>
      </header>

      {/* Evaluation Status Grid */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold flex items-center gap-2">
            <span className="material-icons text-primary">fact_check</span>
            Status de Avaliação por Unidade (Mês Atual)
          </h3>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Concluído</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-200"></span> Pendente</div>
          </div>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
          {units.map((unit, i) => {
            const completed = isUnitCompleted(unit.name);
            return (
              <div
                key={unit.id || i}
                title={unit.name}
                className={`aspect-square border rounded-lg flex flex-col items-center justify-center group cursor-pointer hover:shadow-md transition-all ${completed
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-slate-50 border-slate-200'
                  }`}
              >
                <span className={`text-[10px] font-bold ${completed ? 'text-emerald-700' : 'text-slate-500'}`}>{unit.name.substring(0, 4)}</span>
                <span className={`material-icons text-sm ${completed ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {completed ? 'check_circle' : 'schedule'}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Contract Warning Bar */}
      {contractInfo && (
        <div className="bg-primary text-white p-4 rounded-xl shadow-lg flex items-center justify-between border-l-8 border-primary-dark">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="material-icons">info</span>
            </div>
            <div>
              <p className="font-bold">Validade do Contrato</p>
              <p className="text-xs text-white/80">Este contrato está programado para expirar em: <span className="underline font-black">{contractInfo.contractValidity}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* REAL System Alerts from Admin */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {alerts.length > 0 ? (
          alerts.map(alert => (
            <div key={alert.id} className={`p-5 rounded-xl border shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[160px] ${alert.severity === 'high' ? 'bg-red-50 border-red-200' :
              alert.severity === 'medium' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
              }`}>
              <div className={`absolute top-0 right-0 p-2 text-[8px] font-black uppercase tracking-widest ${alert.severity === 'high' ? 'text-red-500' : alert.severity === 'medium' ? 'text-amber-500' : 'text-slate-400'
                }`}>
                {alert.severity === 'high' ? 'Urgente' : alert.severity === 'medium' ? 'Aviso' : 'Informação'}
              </div>
              <div>
                <h4 className={`text-sm font-black mb-2 flex items-center gap-2 ${alert.severity === 'high' ? 'text-red-800' : alert.severity === 'medium' ? 'text-amber-800' : 'text-slate-700'
                  }`}>
                  <span className="material-icons text-sm">{alert.severity === 'high' ? 'report_problem' : 'info'}</span>
                  {alert.title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">{alert.content}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-black/5 flex justify-between items-center">
                <span className="text-[9px] text-slate-400 uppercase font-bold italic">Expiração automática habilitada</span>
                <span className="material-icons text-slate-300 text-sm">schedule</span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-xl text-center">
            <span className="material-icons text-slate-200 text-4xl mb-2">notifications_off</span>
            <p className="text-sm text-slate-400 font-medium">Nenhum alerta de sistema ativo no momento.</p>
          </div>
        )}
      </div>

      {/* Charts and Data */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold">Estatísticas Operacionais (m²)</h3>
            <div className="flex gap-2">
              <span className="text-[10px] font-bold px-2 py-1 bg-primary/10 text-primary rounded uppercase">6 Meses</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 20 }} />
                <Bar dataKey="desratizacao" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Desratização" />
                <Bar dataKey="desinsetizacao" fill="#93c5fd" radius={[4, 4, 0, 0]} name="Desinsetização" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-icons text-primary text-2xl">verified</span>
            </div>
            <h3 className="font-bold text-slate-800">Conformidade Geral</h3>
            <p className="text-4xl font-black text-slate-900 my-2">{compliance}%</p>
            <p className="text-xs text-slate-400">Baseado em {evaluations.length} avaliações processadas.</p>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-10">
              <span className="material-icons text-8xl -mr-4 -mt-4">shield</span>
            </div>
            <h4 className="font-bold text-sm mb-4">Resumo de Auditoria</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Unidades Totais</span>
                <span className="font-bold">{units.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Status Médio</span>
                <span className="font-bold text-emerald-400">{Number(compliance) > 90 ? 'Ótimo' : 'Regular'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
