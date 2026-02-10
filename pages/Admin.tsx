import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, updateDoc, deleteDoc, onSnapshot, serverTimestamp, query, orderBy, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';

interface Tariff {
  label: string;
  value: string;
}

interface SystemSettings {
  notificationPeriods: number[];
  emailRecipients: string[];
  notificationFrequency: 'once' | 'weekly';
  contractValue: string;
  contractId: string;
  mainManager: string;
  substituteManager: string;
  referenceProcess: string;
  contractValidity: string;
  tariffs: Tariff[];
}

interface FiscalInfo {
  name: string;
  email: string;
  ramal: string;
}

interface Unit {
  id?: string;
  name: string;
  squareMeters: string;
  address: string;
  titular: FiscalInfo;
  substituto: FiscalInfo;
}

interface HiringDoc {
  id: string;
  name: string;
  url: string;
  type: 'nf' | 'doc';
  createdAt: any;
  size?: number;
}

interface SystemAlert {
  id: string;
  title: string;
  content: string;
  expiresAt: any;
  createdAt: any;
  severity: 'low' | 'medium' | 'high';
}

const formatToBRL = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  const amount = (parseInt(digits) / 100).toFixed(2);
  const [int, dec] = amount.split('.');
  const formattedInt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedInt},${dec}`;
};

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState('settings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [notificationPeriods, setNotificationPeriods] = useState<number[]>([30, 60, 90]);
  const [emailRecipients, setEmailRecipients] = useState<string[]>(['admin@qualitrust.com']);
  const [notificationFrequency, setNotificationFrequency] = useState<'once' | 'weekly'>('once');
  const [contractValue, setContractValue] = useState('1.245.000,00');
  const [contractId, setContractId] = useState('CT-2024-088-QA');
  const [mainManager, setMainManager] = useState('Dr. Marcus Holloway');
  const [substituteManager, setSubstituteManager] = useState('');
  const [referenceProcess, setReferenceProcess] = useState('');
  const [contractValidity, setContractValidity] = useState('');
  const [tariffs, setTariffs] = useState<Tariff[]>([
    { label: 'Controle Geral de Insetos', value: '45,50' },
    { label: 'Mitigação de Roedores', value: '120,00' },
    { label: 'Serviço de Desinfecção', value: '85,75' },
  ]);
  const [newEmail, setNewEmail] = useState('');

  const [hiringDocs, setHiringDocs] = useState<HiringDoc[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [currentUnit, setCurrentUnit] = useState<Unit>({
    name: '',
    squareMeters: '',
    address: '',
    titular: { name: '', email: '', ramal: '' },
    substituto: { name: '', email: '', ramal: '' }
  });

  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [newAlert, setNewAlert] = useState({ title: '', content: '', expiresAt: '', severity: 'medium' as const });
  const [editingAlert, setEditingAlert] = useState<SystemAlert | null>(null);
  const [alertSearch, setAlertSearch] = useState('');
  const [alertPage, setAlertPage] = useState(1);
  const ALERTS_PER_PAGE = 10;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as SystemSettings;
          setNotificationPeriods(data.notificationPeriods || [30, 60, 90]);
          setEmailRecipients(data.emailRecipients || []);
          setNotificationFrequency(data.notificationFrequency || 'once');
          setContractValue(data.contractValue || '');
          setContractId(data.contractId || '');
          setMainManager(data.mainManager || '');
          setSubstituteManager(data.substituteManager || '');
          setReferenceProcess(data.referenceProcess || '');
          setContractValidity(data.contractValidity || '');
          setTariffs(data.tariffs || [
            { label: 'Controle Geral de Insetos', value: '45,50' },
            { label: 'Mitigação de Roedores', value: '120,00' },
            { label: 'Serviço de Desinfecção', value: '85,75' },
          ]);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'units') fetchUnits();
    if (activeTab === 'alerts') fetchAlerts();
  }, [activeTab]);

  useEffect(() => {
    const q = query(collection(db, 'hiring_docs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsArr: HiringDoc[] = [];
      snapshot.forEach((doc) => {
        docsArr.push({ id: doc.id, ...doc.data() } as HiringDoc);
      });
      setHiringDocs(docsArr);
    });
    return () => unsubscribe();
  }, []);

  const fetchAlerts = () => {
    const q = query(collection(db, 'system_alerts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertsArr: SystemAlert[] = [];
      snapshot.forEach((doc) => {
        alertsArr.push({ id: doc.id, ...doc.data() } as SystemAlert);
      });
      setSystemAlerts(alertsArr);
    });
    return unsubscribe;
  };

  const fetchUnits = async () => {
    setLoadingUnits(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'units'));
      const fetchedUnits = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit));
      setUnits(fetchedUnits);
    } catch (error) {
      console.error("Error fetching units:", error);
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const settings: SystemSettings = {
        notificationPeriods,
        emailRecipients,
        notificationFrequency,
        contractValue,
        contractId,
        mainManager,
        substituteManager,
        referenceProcess,
        contractValidity,
        tariffs
      };
      await setDoc(doc(db, 'settings', 'general'), settings);
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error("Error saving settings:", error);
      alert('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingAlert) {
        const { id, createdAt, ...updateData } = editingAlert;
        // Ensure expiresAt is a Timestamp if it's a string from the input
        const expiresAt = typeof editingAlert.expiresAt === 'string'
          ? Timestamp.fromDate(new Date(editingAlert.expiresAt))
          : editingAlert.expiresAt;

        await updateDoc(doc(db, 'system_alerts', id), {
          ...updateData,
          expiresAt
        });
        setEditingAlert(null);
        setShowAlertForm(false);
      } else {
        await addDoc(collection(db, 'system_alerts'), {
          title: newAlert.title,
          content: newAlert.content,
          severity: newAlert.severity,
          expiresAt: Timestamp.fromDate(new Date(newAlert.expiresAt)),
          createdAt: serverTimestamp()
        });
        setNewAlert({ title: '', content: '', expiresAt: '', severity: 'medium' });
        setShowAlertForm(false);
      }
    } catch (error) {
      console.error("Error saving alert:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditAlert = (alert: SystemAlert) => {
    // Convert timestamp to string format for datetime-local input
    const date = alert.expiresAt?.toDate ? alert.expiresAt.toDate() : new Date(alert.expiresAt);
    const dateString = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    setEditingAlert({ ...alert, expiresAt: dateString });
    setShowAlertForm(true);
  };

  const handleDeleteAlert = async (id: string) => {
    if (window.confirm("Excluir alerta?")) {
      await deleteDoc(doc(db, 'system_alerts', id));
    }
  }

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (currentUnit.id) {
        await updateDoc(doc(db, 'units', currentUnit.id), { ...currentUnit });
      } else {
        const { id, ...unitData } = currentUnit;
        await addDoc(collection(db, 'units'), unitData);
      }
      setShowUnitForm(false);
      fetchUnits();
      resetCurrentUnit();
    } catch (error) {
      console.error("Error saving unit:", error);
      alert("Erro ao salvar unidade.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUnit = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir esta unidade?")) {
      try {
        await deleteDoc(doc(db, 'units', id));
        fetchUnits();
      } catch (error) {
        console.error("Error deleting unit:", error);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'nf' | 'doc') => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setUploading(type);
    try {
      for (const file of Array.from(files) as File[]) {
        const storageRef = ref(storage, `hiring_docs/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(snapshot.ref);
        await addDoc(collection(db, 'hiring_docs'), {
          name: file.name,
          url,
          type,
          size: file.size,
          createdAt: serverTimestamp()
        });
      }
    } catch (error: any) {
      console.error("Error uploading: ", error);
      let errorMessage = error.message || 'Erro desconhecido';

      if (error.code === 'storage/unauthorized') {
        errorMessage = 'Usuário sem permissão. Verifique as regras do Firebase Storage.';
      } else if (error.code === 'storage/retry-limit-exceeded') {
        errorMessage = 'Tempo limite excedido. Verifique sua conexão.';
      } else if (error.code === 'storage/object-not-found') {
        errorMessage = 'Bucket de armazenamento não encontrado. Verifique seu arquivo .env.local.';
      }

      alert(`Erro ao enviar arquivo: ${errorMessage}\n\nCódigo: ${error.code || 'N/A'}\nPor favor, verifique se o Firebase Storage está ativado no console e se as regras de permissão permitem o upload.`);
    } finally {
      setUploading(null);
    }

  };

  const handleDeleteDoc = async (hdoc: HiringDoc) => {
    if (window.confirm(`Deseja excluir o documento ${hdoc.name}?`)) {
      try {
        await deleteDoc(doc(db, 'hiring_docs', hdoc.id));
      } catch (error) {
        console.error("Error deleting doc: ", error);
      }
    }
  };

  const resetCurrentUnit = () => {
    setCurrentUnit({
      name: '',
      squareMeters: '',
      address: '',
      titular: { name: '', email: '', ramal: '' },
      substituto: { name: '', email: '', ramal: '' }
    });
  };

  const togglePeriod = (period: number) => {
    setNotificationPeriods(prev =>
      prev.includes(period) ? prev.filter(p => p !== period) : [...prev, period].sort((a, b) => a - b)
    );
  };

  const addEmail = () => {
    if (newEmail && !emailRecipients.includes(newEmail)) {
      setEmailRecipients([...emailRecipients, newEmail]);
      setNewEmail('');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Carregando configurações...</div>;
  }

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-500 pb-24">
      <header className="mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary rounded-lg p-2 text-white shadow-lg shadow-primary/20">
            <span className="material-icons">security</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin QualiTrust</h1>
            <p className="text-sm text-slate-500">Configuração do sistema e gestão de segurança</p>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-64 flex-shrink-0">
          <nav className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 gap-1 lg:gap-2 no-scrollbar scroll-smooth">
            {[
              { id: 'settings', icon: 'settings', label: 'Configurações' },
              { id: 'units', icon: 'map', label: 'Unidades' },
              { id: 'docs', icon: 'folder_shared', label: 'Doc da contratação' },
              { id: 'alerts', icon: 'notification_important', label: 'Alertas do Sistema' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:bg-white'}`}
              >
                <span className="material-icons text-sm">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              <section className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h2 className="font-bold flex items-center gap-2">
                    <span className="material-icons text-primary text-lg">mail</span>
                    Alertas Automáticos de Expiração
                  </h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 mb-4">Limites de Notificação</h3>
                      <div className="flex flex-wrap gap-3">
                        {[30, 60, 90, 120].map(days => (
                          <button
                            key={days}
                            onClick={() => togglePeriod(days)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${notificationPeriods.includes(days) ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-600'}`}
                          >
                            {days} Dias Antes
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 mb-4">Destinatários</h3>
                      <div className="space-y-2 mb-4">
                        {emailRecipients.map(email => (
                          <div key={email} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <span className="text-xs text-slate-600">{email}</span>
                            <button onClick={() => setEmailRecipients(prev => prev.filter(e => e !== email))} className="text-slate-400 hover:text-red-500">
                              <span className="material-icons text-sm">close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="E-mail..." value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                        <button onClick={addEmail} className="px-4 py-2 bg-slate-100 rounded-lg text-xs font-bold">Adicionar</button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                  <h2 className="font-bold flex items-center gap-2"><span className="material-icons text-primary">assignment</span> Configuração de Contrato</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Valor Anual</label>
                    <input className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={contractValue} onChange={e => setContractValue(formatToBRL(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">ID do Contrato</label>
                    <input className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={contractId} onChange={e => setContractId(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Data de Validade</label>
                    <input className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Ex: 31/12/2026" value={contractValidity} onChange={e => setContractValidity(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Gestor Principal</label>
                    <input className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" value={mainManager} onChange={e => setMainManager(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Gestor Substituto</label>
                    <input className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" value={substituteManager} onChange={e => setSubstituteManager(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Processo de Referência</label>
                    <input className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Ex: BP-992/2023" value={referenceProcess} onChange={e => setReferenceProcess(e.target.value)} />
                  </div>
                </div>
              </section>

              <section className="col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

                <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                  <h2 className="font-bold flex items-center gap-2"><span className="material-icons text-primary">payments</span> Tarifas por m²</h2>
                </div>
                <div className="p-6 space-y-3">
                  {tariffs.map((t, i) => (
                    <div key={i} className="flex flex-col sm:flex-row gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-primary/30 transition-all">
                      <input
                        className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-600 p-0"
                        value={t.label}
                        onChange={(e) => {
                          const newTariffs = [...tariffs];
                          newTariffs[i].label = e.target.value;
                          setTariffs(newTariffs);
                        }}
                      />
                      <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-slate-200">
                        <span className="text-xs font-bold text-slate-400">R$</span>
                        <input
                          className="w-20 bg-transparent border-none focus:ring-0 text-sm font-black text-primary p-0 text-right"
                          value={t.value}
                          onChange={(e) => {
                            const newTariffs = [...tariffs];
                            newTariffs[i].value = formatToBRL(e.target.value);
                            setTariffs(newTariffs);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setTariffs([...tariffs, { label: 'Nova Tarifa', value: '0,00' }])}
                    className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:text-primary hover:border-primary transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <span className="material-icons text-sm">add</span> Adicionar Outra
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'units' && (
            <div className="space-y-6">
              <header className="bg-white p-6 rounded-xl border border-slate-200 flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2"><span className="material-icons text-primary">map</span> Unidades</h2>
                <button onClick={() => { resetCurrentUnit(); setShowUnitForm(true); }} className="px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm">Nova Unidade</button>
              </header>
              {showUnitForm && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 animate-in slide-in-from-top-2 duration-300">
                  <form onSubmit={handleSaveUnit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Unidade</label>
                        <input
                          required
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                          placeholder="Ex: Tribunal de Justiça - Sede"
                          value={currentUnit.name}
                          onChange={e => setCurrentUnit({ ...currentUnit, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Metragem (m²)</label>
                        <input
                          required
                          type="number"
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                          placeholder="Ex: 500"
                          value={currentUnit.squareMeters}
                          onChange={e => setCurrentUnit({ ...currentUnit, squareMeters: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Endereço Completo</label>
                        <input
                          required
                          className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                          placeholder="Rua, Número, Bairro, Cidade - UF"
                          value={currentUnit.address}
                          onChange={e => setCurrentUnit({ ...currentUnit, address: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                      {/* Fiscal Titular */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                          <span className="material-icons text-lg">person</span>
                          Fiscal Titular
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          <input
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                            placeholder="Nome do Fiscal"
                            value={currentUnit.titular.name}
                            onChange={e => setCurrentUnit({ ...currentUnit, titular: { ...currentUnit.titular, name: e.target.value } })}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                              placeholder="E-mail"
                              value={currentUnit.titular.email}
                              onChange={e => setCurrentUnit({ ...currentUnit, titular: { ...currentUnit.titular, email: e.target.value } })}
                            />
                            <input
                              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                              placeholder="Ramal/Telefone"
                              value={currentUnit.titular.ramal}
                              onChange={e => setCurrentUnit({ ...currentUnit, titular: { ...currentUnit.titular, ramal: e.target.value } })}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Fiscal Substituto */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-600 flex items-center gap-2">
                          <span className="material-icons text-lg">person_outline</span>
                          Fiscal Substituto
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          <input
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                            placeholder="Nome do Substituto"
                            value={currentUnit.substituto.name}
                            onChange={e => setCurrentUnit({ ...currentUnit, substituto: { ...currentUnit.substituto, name: e.target.value } })}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                              placeholder="E-mail"
                              value={currentUnit.substituto.email}
                              onChange={e => setCurrentUnit({ ...currentUnit, substituto: { ...currentUnit.substituto, email: e.target.value } })}
                            />
                            <input
                              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm"
                              placeholder="Ramal/Telefone"
                              value={currentUnit.substituto.ramal}
                              onChange={e => setCurrentUnit({ ...currentUnit, substituto: { ...currentUnit.substituto, ramal: e.target.value } })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowUnitForm(false)}
                        className="px-6 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50"
                      >
                        {saving ? 'Gravando...' : currentUnit.id ? 'Atualizar Unidade' : 'Criar Unidade'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {units.map(u => (
                  <div key={u.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <p className="font-bold">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.address}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setCurrentUnit(u); setShowUnitForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 text-slate-400 hover:text-primary transition-colors" title="Editar Unidade">
                        <span className="material-icons text-sm">edit</span>
                      </button>
                      <button onClick={() => u.id && handleDeleteUnit(u.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Excluir Unidade">
                        <span className="material-icons text-sm">delete</span>
                      </button>
                    </div>

                  </div>
                ))}
              </div>

            </div>
          )}

          {activeTab === 'docs' && (
            <div className="space-y-6">
              <header className="bg-white p-6 rounded-xl border border-slate-200">
                <h2 className="text-xl font-bold flex items-center gap-2"><span className="material-icons text-primary">folder_shared</span> Documentação da Contratação</h2>
              </header>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {(['nf', 'doc'] as const).map(type => (
                  <section key={type} className="bg-white rounded-xl border border-slate-200 flex flex-col min-h-[400px]">
                    <div className="p-4 border-b bg-slate-50/50 font-bold flex items-center gap-2">
                      <span className="material-icons">{type === 'nf' ? 'receipt_long' : 'description'}</span>
                      {type === 'nf' ? 'Notas Fiscais' : 'Documentações'}
                    </div>
                    <div className="p-4 flex-1 overflow-y-auto space-y-2">
                      {hiringDocs.filter(d => d.type === type).map(d => (
                        <div key={d.id} className="flex items-center justify-between p-2 bg-slate-50 border rounded-lg group">
                          <span className="text-xs truncate max-w-[150px]">{d.name}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a href={d.url} target="_blank" rel="noreferrer" className="p-1 text-slate-400 hover:text-primary"><span className="material-icons text-sm">visibility</span></a>
                            <button onClick={() => handleDeleteDoc(d)} className="p-1 text-slate-400 hover:text-red-500"><span className="material-icons text-sm">delete</span></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 border-t">
                      <label className={`w-full py-2 bg-primary/10 text-primary rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer ${uploading === type ? 'opacity-50' : ''}`}>
                        {uploading === type ? 'Enviando...' : 'Fazer Upload'}
                        <input type="file" className="hidden" onChange={e => handleFileUpload(e, type)} disabled={!!uploading} />
                      </label>
                    </div>
                  </section>
                ))}
              </div>

            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-6">
              <header className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="material-icons text-primary">notification_important</span>
                  Alertas do Dashboard
                </h2>
                <div className="flex w-full md:w-auto gap-3">
                  <div className="relative flex-1 md:w-64">
                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                    <input
                      type="text"
                      placeholder="Buscar alertas..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white transition-all"
                      value={alertSearch}
                      onChange={e => { setAlertSearch(e.target.value); setAlertPage(1); }}
                    />
                  </div>
                  <button
                    onClick={() => { setEditingAlert(null); setNewAlert({ title: '', content: '', expiresAt: '', severity: 'medium' }); setShowAlertForm(true); }}
                    className="px-4 py-2 bg-primary text-white rounded-lg font-bold text-sm shadow-md flex items-center gap-2 whitespace-nowrap"
                  >
                    <span className="material-icons text-sm">add</span> Novo Alerta
                  </button>
                </div>
              </header>

              {showAlertForm && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 animate-in slide-in-from-top-2">
                  <form onSubmit={handleCreateAlert} className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-slate-800">{editingAlert ? 'Editar Alerta' : 'Novo Alerta'}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Título</label>
                        <input
                          required
                          className="w-full px-4 py-2 border rounded-lg text-sm"
                          value={editingAlert ? editingAlert.title : newAlert.title}
                          onChange={e => editingAlert ? setEditingAlert({ ...editingAlert, title: e.target.value }) : setNewAlert({ ...newAlert, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500">Gravidade</label>
                        <select
                          className="w-full px-4 py-2 border rounded-lg text-sm"
                          value={editingAlert ? editingAlert.severity : newAlert.severity}
                          onChange={e => editingAlert ? setEditingAlert({ ...editingAlert, severity: e.target.value as any }) : setNewAlert({ ...newAlert, severity: e.target.value as any })}
                        >
                          <option value="low">Baixa (Cinza)</option>
                          <option value="medium">Média (Amarelo)</option>
                          <option value="high">Alta (Vermelho)</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Conteúdo do Alerta</label>
                      <textarea
                        required
                        className="w-full px-4 py-2 border rounded-lg text-sm min-h-[100px]"
                        value={editingAlert ? editingAlert.content : newAlert.content}
                        onChange={e => editingAlert ? setEditingAlert({ ...editingAlert, content: e.target.value }) : setNewAlert({ ...newAlert, content: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500">Expira em (Data e Hora)</label>
                      <input
                        required
                        type="datetime-local"
                        className="w-full px-4 py-2 border rounded-lg text-sm"
                        value={editingAlert ? editingAlert.expiresAt : newAlert.expiresAt}
                        onChange={e => editingAlert ? setEditingAlert({ ...editingAlert, expiresAt: e.target.value }) : setNewAlert({ ...newAlert, expiresAt: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowAlertForm(false)} className="px-4 py-2 border rounded-lg text-sm font-bold">Cancelar</button>
                      <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold">
                        {saving ? 'Gravando...' : editingAlert ? 'Salvar Alterações' : 'Criar Alerta'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {systemAlerts
                    .filter(alert =>
                      alert.title.toLowerCase().includes(alertSearch.toLowerCase()) ||
                      alert.content.toLowerCase().includes(alertSearch.toLowerCase())
                    )
                    .slice((alertPage - 1) * ALERTS_PER_PAGE, alertPage * ALERTS_PER_PAGE)
                    .map(alert => (
                      <div key={alert.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between group">
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full ${alert.severity === 'high' ? 'bg-red-500' : alert.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                            <h4 className="font-bold text-slate-800 truncate">{alert.title}</h4>
                          </div>
                          <p className="text-xs text-slate-500 mb-2 line-clamp-2">{alert.content}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 uppercase font-black tracking-widest">
                            <span className="material-icons text-[12px]">event</span>
                            Expira: {alert.expiresAt?.toDate ? alert.expiresAt.toDate().toLocaleString() : new Date(alert.expiresAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 opacity-10 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEditAlert(alert)} className="p-2 text-slate-400 hover:text-primary transition-colors">
                            <span className="material-icons text-sm">edit</span>
                          </button>
                          <button onClick={() => handleDeleteAlert(alert.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                            <span className="material-icons text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                {systemAlerts.filter(alert =>
                  alert.title.toLowerCase().includes(alertSearch.toLowerCase()) ||
                  alert.content.toLowerCase().includes(alertSearch.toLowerCase())
                ).length > ALERTS_PER_PAGE && (
                    <div className="flex justify-center items-center gap-4 mt-8 pb-4">
                      <button
                        disabled={alertPage === 1}
                        onClick={() => setAlertPage(prev => prev - 1)}
                        className="p-2 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-all"
                      >
                        <span className="material-icons">chevron_left</span>
                      </button>
                      <span className="text-sm font-bold text-slate-600">
                        Página {alertPage} de {Math.ceil(systemAlerts.filter(alert => alert.title.toLowerCase().includes(alertSearch.toLowerCase()) || alert.content.toLowerCase().includes(alertSearch.toLowerCase())).length / ALERTS_PER_PAGE)}
                      </span>
                      <button
                        disabled={alertPage === Math.ceil(systemAlerts.filter(alert => alert.title.toLowerCase().includes(alertSearch.toLowerCase()) || alert.content.toLowerCase().includes(alertSearch.toLowerCase())).length / ALERTS_PER_PAGE)}
                        onClick={() => setAlertPage(prev => prev + 1)}
                        className="p-2 rounded-lg border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-all"
                      >
                        <span className="material-icons">chevron_right</span>
                      </button>
                    </div>
                  )}

                {systemAlerts.filter(alert =>
                  alert.title.toLowerCase().includes(alertSearch.toLowerCase()) ||
                  alert.content.toLowerCase().includes(alertSearch.toLowerCase())
                ).length === 0 && (
                    <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                      <span className="material-icons text-slate-300 text-4xl mb-2">search_off</span>
                      <p className="text-slate-500 font-medium">Nenhum alerta encontrado.</p>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
      {activeTab === 'settings' && (
        <div className="fixed bottom-8 right-8">
          <button onClick={handleSaveSettings} disabled={saving} className="px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-xl flex items-center gap-2">
            <span className="material-icons">save</span> {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      )}
    </div>
  );
};

export default Admin;
