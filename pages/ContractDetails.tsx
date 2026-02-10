import React, { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface Tariff {
  label: string;
  value: string;
}

interface ContractSettings {
  contractId: string;
  contractValue: string;
  contractValidity: string;
  mainManager: string;
  substituteManager: string;
  referenceProcess: string;
  tariffs: Tariff[];
}

interface HiringDoc {
  id: string;
  name: string;
  url: string;
  type: 'nf' | 'doc';
  createdAt: any;
  size?: number;
}

const ContractDetails: React.FC = () => {
  const [settings, setSettings] = useState<ContractSettings | null>(null);
  const [hiringDocs, setHiringDocs] = useState<HiringDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(docSnap.data() as ContractSettings);
        }
      } catch (error) {
        console.error("Error fetching contract settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();

    // Real-time listener for hiring documents
    const q = query(collection(db, 'hiring_docs'), orderBy('createdAt', 'desc'));
    const unsubscribeDocs = onSnapshot(q, (snapshot) => {
      const docsArr: HiringDoc[] = [];
      snapshot.forEach((doc) => {
        docsArr.push({ id: doc.id, ...doc.data() } as HiringDoc);
      });
      setHiringDocs(docsArr);
    });

    return () => unsubscribeDocs();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium italic">Buscando informações do contrato...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav className="flex text-sm text-slate-500 mb-2">
            <ol className="flex items-center space-x-2">
              <li>Painel</li>
              <li><span className="material-icons text-xs">chevron_right</span></li>
              <li className="font-medium text-slate-900">{settings?.contractId || 'Contrato'}</li>
            </ol>
          </nav>
          <h1 className="text-3xl font-bold text-slate-900">Detalhes do Contrato</h1>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded text-sm font-medium hover:bg-slate-50">
            <span className="material-icons text-sm">file_download</span> Exportar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-6 text-primary">
              <span className="material-icons">info</span>
              <h2 className="text-xl font-bold">Informações do Contrato</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-1">Número do Contrato</label>
                  <p className="text-lg font-bold text-slate-900">{settings?.contractId || 'N/A'}</p>
                  <p className="text-[10px] text-slate-400 font-medium">Processo: {settings?.referenceProcess || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-1">Valor Anual</label>
                  <p className="text-2xl font-black text-primary">R$ {settings?.contractValue || '0,00'}</p>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-1">Data de Validade</label>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{settings?.contractValidity || 'N/A'}</p>
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black uppercase">Vigente</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-1">Gestor Principal</label>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                        <span className="material-icons text-slate-400 text-sm">person</span>
                      </div>
                      <span className="text-sm font-bold text-slate-700">{settings?.mainManager || 'Não informado'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest block mb-1">Gestor Substituto</label>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                        <span className="material-icons text-slate-400 text-sm">badge</span>
                      </div>
                      <span className="text-sm font-bold text-slate-700">{settings?.substituteManager || 'Não informado'}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center gap-2 mb-6 text-primary">
              <span className="material-icons">payments</span>
              <h2 className="text-xl font-bold">Preços Unitários por m²</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {settings?.tariffs && settings.tariffs.length > 0 ? (
                settings.tariffs.map((p) => (
                  <div key={p.label} className="p-4 bg-slate-50 rounded-lg border border-slate-100 group hover:border-primary/40 hover:bg-white transition-all cursor-default">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 line-clamp-1">{p.label}</p>
                    <p className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">
                      R$ {p.value} <span className="text-xs font-normal text-slate-400">/m²</span>
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 italic">Nenhuma tarifa configurada.</p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full min-h-[500px]">
            <div className="p-6 bg-slate-50/50 border-b border-slate-200">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-icons">folder</span>
                <h2 className="text-lg font-bold">Arquivo de Documentos</h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">Repositório de documentos e notas fiscais do contrato.</p>
            </div>
            <div className="p-6 space-y-8 overflow-y-auto">
              {/* Notas Fiscais Category */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase text-amber-600 tracking-widest flex items-center gap-2">
                  <span className="material-icons text-sm">receipt_long</span> Notas Fiscais
                </h3>
                <div className="space-y-2">
                  {hiringDocs.filter(d => d.type === 'nf').length > 0 ? (
                    hiringDocs.filter(d => d.type === 'nf').map(d => (
                      <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="group flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <span className="material-icons text-amber-600 text-sm">description</span>
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-slate-800 truncate">{d.name}</p>
                            <p className="text-[10px] text-slate-400">Ver documento</p>
                          </div>
                        </div>
                        <span className="material-icons text-slate-300 group-hover:text-primary transition-colors text-lg">download</span>
                      </a>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-400 italic py-2">Nenhuma nota fiscal encontrada.</p>
                  )}
                </div>
              </div>

              {/* Documentação Category */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase text-blue-600 tracking-widest flex items-center gap-2">
                  <span className="material-icons text-sm">description</span> Documentações
                </h3>
                <div className="space-y-2">
                  {hiringDocs.filter(d => d.type === 'doc').length > 0 ? (
                    hiringDocs.filter(d => d.type === 'doc').map(d => (
                      <a key={d.id} href={d.url} target="_blank" rel="noreferrer" className="group flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="material-icons text-blue-600 text-sm">folder_open</span>
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-slate-800 truncate">{d.name}</p>
                            <p className="text-[10px] text-slate-400">Ver documento</p>
                          </div>
                        </div>
                        <span className="material-icons text-slate-300 group-hover:text-primary transition-colors text-lg">download</span>
                      </a>
                    ))
                  ) : (
                    <p className="text-[10px] text-slate-400 italic py-2">Nenhuma documentação encontrada.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ContractDetails;
