import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ServiceType, ServiceStatus } from '../types';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

interface EvaluationData {
  id: string;
  displayId: string;
  date: string; // Stored as ISO string or similar in DB, formatted for display
  unit: string;
  location: string;
  type: ServiceType;
  score: number;
  status: ServiceStatus;
  servicesSelected?: {
    disinsectization: boolean;
    deratization: boolean;
    termite: boolean;
  };
}

const Evaluations: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [evaluations, setEvaluations] = useState<EvaluationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta avaliação?')) {
      try {
        await deleteDoc(doc(db, 'evaluations', id));
        // State update handled by onSnapshot
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert("Erro ao excluir avaliação.");
      }
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'evaluations'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const evals: EvaluationData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        evals.push({
          id: doc.id,
          displayId: data.displayId || `#EV-${doc.id.substring(0, 6).toUpperCase()}`,
          date: data.date ? new Date(data.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
          unit: data.unit || 'N/A',
          location: data.location || 'N/A',
          type: data.type as ServiceType || ServiceType.DISINSECTIZATION,
          score: data.score || 0,
          status: data.status as ServiceStatus || ServiceStatus.IN_PROGRESS,
          servicesSelected: data.servicesSelected,
        });
      });
      setEvaluations(evals);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const statusColors: Record<ServiceStatus, string> = {
    [ServiceStatus.COMPLETED]: 'bg-green-100 text-green-800',
    [ServiceStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
    [ServiceStatus.PENDING_REVIEW]: 'bg-yellow-100 text-yellow-800',
    [ServiceStatus.ACTION_REQUIRED]: 'bg-red-100 text-red-800',
  };

  const filteredEvaluations = evaluations.filter(ev =>
    ev.unit.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ev.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ev.displayId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <nav aria-label="Caminho de navegação" className="flex text-sm text-slate-500 mb-2">
            <ol className="flex items-center space-x-2">
              <li><Link to="/dashboard" className="hover:text-primary">Painel</Link></li>
              <li><span className="material-icons text-[12px]">chevron_right</span></li>
              <li className="font-medium text-slate-900">Histórico de Avaliações</li>
            </ol>
          </nav>
          <h1 className="text-2xl font-bold text-slate-900">Histórico de Avaliações</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie e acompanhe as intervenções de controle de pragas em todas as unidades.</p>
        </div>
        <Link
          to="/new-evaluation"
          className="bg-primary hover:bg-primary/90 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <span className="material-icons text-sm">add</span>
          Nova Avaliação
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm transition-all">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full md:w-96">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-primary focus:border-primary"
              placeholder="Pesquisar por Unidade, ID ou Provedor..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <select className="text-sm bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-10 focus:ring-primary focus:border-primary">
              <option>Todos os tipos de serviço</option>
              {Object.values(ServiceType).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="text-sm bg-white border border-slate-200 rounded-lg py-2 pl-3 pr-10 focus:ring-primary focus:border-primary">
              <option>Todos os status</option>
              {Object.values(ServiceStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto pb-24">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">ID da Avaliação</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Unidade Administrativa</th>
                <th className="px-6 py-4">Tipo de Serviço</th>
                <th className="px-6 py-4">Pontuação</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-icons animate-spin text-primary">sync</span>
                      Carregando avaliações...
                    </div>
                  </td>
                </tr>
              ) : filteredEvaluations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma avaliação encontrada.
                  </td>
                </tr>
              ) : (
                filteredEvaluations.map((evalItem) => (
                  <tr key={evalItem.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-primary">{evalItem.displayId}</td>
                    <td className="px-6 py-4 text-sm">{evalItem.date}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{evalItem.unit}</span>
                        <span className="text-xs text-slate-500">{evalItem.location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {evalItem.servicesSelected ? (
                          <>
                            {evalItem.servicesSelected.disinsectization && (
                              <div className="flex items-center gap-2">
                                <span className="material-icons text-slate-400 text-[14px]">bug_report</span>
                                <span className="text-xs">{ServiceType.DISINSECTIZATION}</span>
                              </div>
                            )}
                            {evalItem.servicesSelected.deratization && (
                              <div className="flex items-center gap-2">
                                <span className="material-icons text-slate-400 text-[14px]">pest_control</span>
                                <span className="text-xs">{ServiceType.DERATIZATION}</span>
                              </div>
                            )}
                            {evalItem.servicesSelected.termite && (
                              <div className="flex items-center gap-2">
                                <span className="material-icons text-slate-400 text-[14px]">eco</span>
                                <span className="text-xs">{ServiceType.TERMITE_CONTROL}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="material-icons text-slate-400 text-sm">
                              {evalItem.type === ServiceType.DISINSECTIZATION ? 'bug_report' : evalItem.type === ServiceType.DERATIZATION ? 'pest_control' : 'eco'}
                            </span>
                            <span className="text-sm">{evalItem.type}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {evalItem.status === ServiceStatus.IN_PROGRESS ? (
                        <span className="text-xs text-slate-400 italic">Em revisão</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${evalItem.score > 80 ? 'bg-green-500' : evalItem.score > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${evalItem.score}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold">{evalItem.score}%</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[evalItem.status]}`}>
                        {evalItem.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right relative">
                      <button
                        onClick={() => setOpenMenuId(openMenuId === evalItem.id ? null : evalItem.id)}
                        className="text-slate-400 hover:text-primary transition-colors p-1 rounded-full hover:bg-slate-100"
                      >
                        <span className="material-icons">more_vert</span>
                      </button>

                      {openMenuId === evalItem.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenMenuId(null)}
                          ></div>
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-100 z-20 py-1 animate-in fade-in zoom-in-95 duration-200">
                            {evalItem.status === ServiceStatus.IN_PROGRESS ? (
                              <>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    navigate(`/edit-evaluation/${evalItem.id}`);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary flex items-center gap-2"
                                >
                                  <span className="material-icons text-xs">edit</span>
                                  Editar
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleDelete(evalItem.id);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <span className="material-icons text-xs">delete</span>
                                  Excluir
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setOpenMenuId(null);
                                  navigate(`/view-evaluation/${evalItem.id}`);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary flex items-center gap-2"
                              >
                                <span className="material-icons text-xs">visibility</span>
                                Visualizar
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && filteredEvaluations.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Exibindo {filteredEvaluations.length} avaliações</span>
            {/* Pagination UI commented out as we are showing all items for now */}
            {/* <div className="flex items-center gap-1">...</div> */}
          </div>
        )}
      </div>
    </div>
  );
};

export default Evaluations;
