import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ServiceType, ServiceStatus } from '../types';
import { useAuth } from '../context/AuthContext';

const NewEvaluation: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);

  const isView = location.pathname.includes('/view-evaluation');
  const isEdit = !!id && !isView;

  // Block 2: Reference Month
  const [referenceMonth, setReferenceMonth] = useState(new Date().getMonth().toString());
  const currentYear = new Date().getFullYear();

  // Block 3: Services
  const [services, setServices] = useState({
    disinsectization: false,
    deratization: false,
    termite: false,
  });

  // Block 4: Financial Adjustments
  const [financials, setFinancials] = useState({
    disinsectization: { metrage: 0, unitPrice: 0.00, discount: 0 },
    deratization: { metrage: 0, unitPrice: 0.00, discount: 0 },
    termite: { metrage: 0, unitPrice: 0.00, discount: 0 },
  });

  // Block 5: General Evaluation - Initialized to compliant state (No discounts)
  const [generalEval, setGeneralEval] = useState({
    employeeIdentified: true,
    epiUsed: true,
    damageRecovered: false,
    proofDelivered: true,
  });

  // Block 6: Disinsectization Specific - Initialized to compliant
  const [disinsectizationEval, setDisinsectizationEval] = useState({
    executedMetrage: 0,
    followedSchedule: true,
    delayDays: 0,
    lightTrapsMaintained: true,
    extraCall: false,
    extraCallOnTime: true,
    extraCallEffective: true,
  });

  // Block 7: Deratization Specific
  const [deratizationEval, setDeratizationEval] = useState({
    executedMetrage: 0,
    followedSchedule: true,
    delayDays: 0,
    lightTrapsMaintained: true,
    extraCall: false,
    extraCallOnTime: true,
    extraCallEffective: true,
  });

  // Block 8: Termite Specific
  const [termiteEval, setTermiteEval] = useState({
    chemicalBarrier: true, // Defaulting to true (compliant)
  });

  // Fetch Logic
  useEffect(() => {
    const fetchData = async () => {
      // If no unit is loaded yet, we can't fetch unit details
      if (!userProfile?.unit) return;

      try {
        console.log("Fetching data for unit:", userProfile.unit);

        // 1. Fetch Unit Data for Metrage
        // Assuming 'units' collection exists and has a field 'name' that matches userProfile.unit
        const unitsRef = collection(db, 'units');
        const q = query(unitsRef, where("name", "==", userProfile.unit));
        const querySnapshot = await getDocs(q);

        let unitMetrage = 0;
        if (!querySnapshot.empty) {
          const unitData = querySnapshot.docs[0].data();
          // Handle potential string format "1.200,50" or number
          const rawMetrage = unitData.squareMeters;
          if (typeof rawMetrage === 'string') {
            // remove thousands separator if present, replace decimal comma
            unitMetrage = parseFloat(rawMetrage.replace(/\./g, '').replace(',', '.')) || 0;
          } else {
            unitMetrage = Number(rawMetrage) || 0;
          }
          console.log("Unit Metrage found:", unitMetrage);
        } else {
          console.warn("No unit found with name:", userProfile.unit);
        }

        // 2. Fetch Settings for Tariffs
        const settingsRef = doc(db, 'settings', 'general');
        const settingsSnap = await getDoc(settingsRef);

        let prices = { disinsectization: 0, deratization: 0, termite: 0 };

        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          if (data.tariffs && Array.isArray(data.tariffs)) {
            // Helper to parse price string "120,50" -> 120.50
            const parsePrice = (val: string) => {
              if (!val) return 0;
              return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
            };

            data.tariffs.forEach((t: any) => {
              const label = (t.label || '').toLowerCase();
              if (label.includes('insetos') || label.includes('desinsetização') || label.includes('desinsetizacao')) {
                prices.disinsectization = parsePrice(t.value);
              } else if (label.includes('roedores') || label.includes('desratização') || label.includes('desratizacao')) {
                prices.deratization = parsePrice(t.value);
              } else if (label.includes('cupim') || label.includes('descupinização') || label.includes('descupinizacao') || label.includes('desinfecção') || label.includes('desinfeccao')) {
                prices.termite = parsePrice(t.value);
              }
            });
            console.log("Tariffs identified:", prices);
          }
        }

        // Update Financials State
        setFinancials(prev => ({
          disinsectization: { ...prev.disinsectization, metrage: unitMetrage, unitPrice: prices.disinsectization },
          deratization: { ...prev.deratization, metrage: unitMetrage, unitPrice: prices.deratization },
          termite: { ...prev.termite, metrage: unitMetrage, unitPrice: prices.termite },
        }));

        // Also update specific evaluation metrages to match the unit metrage by default
        setDisinsectizationEval(prev => ({ ...prev, executedMetrage: unitMetrage }));
        setDeratizationEval(prev => ({ ...prev, executedMetrage: unitMetrage }));

      } catch (error) {
        console.error("Error fetching auto-fill data:", error);
      }
    };

    fetchData();
  }, [userProfile]); // Re-run when userProfile loads

  // Fetch Evaluation for Edit/View
  useEffect(() => {
    if ((isEdit || isView) && id) {
      const fetchEvaluation = async () => {
        setLoading(true);
        try {
          const evalRef = doc(db, 'evaluations', id);
          const evalSnap = await getDoc(evalRef);
          if (evalSnap.exists()) {
            const data = evalSnap.data();

            // Map data to state
            if (data.referenceMonth) {
              const monthIdx = months.indexOf(data.referenceMonth);
              if (monthIdx !== -1) setReferenceMonth(monthIdx.toString());
            }

            if (data.servicesSelected) setServices(data.servicesSelected);
            if (data.financials?.details) setFinancials(data.financials.details);
            if (data.generalEvaluation) setGeneralEval(data.generalEvaluation);

            if (data.specificEvaluation?.disinsectization) {
              setDisinsectizationEval(data.specificEvaluation.disinsectization);
            }
            if (data.specificEvaluation?.deratization) {
              setDeratizationEval(data.specificEvaluation.deratization);
            }
            if (data.specificEvaluation?.termite) {
              setTermiteEval(data.specificEvaluation.termite);
            }
          }
        } catch (error) {
          console.error("Error fetching evaluation for edit:", error);
          alert("Erro ao carregar dados da avaliação.");
        } finally {
          setLoading(false);
        }
      };
      fetchEvaluation();
    }
  }, [id, isEdit]);

  // Automatic Discount Calculation
  useEffect(() => {
    // 1. General Discounts (Applies to ALL)
    let generalDiscountPercent = 0;
    if (!generalEval.employeeIdentified) generalDiscountPercent += 0.02;
    if (!generalEval.epiUsed) generalDiscountPercent += 0.02;
    if (generalEval.damageRecovered) generalDiscountPercent += 0.02;
    if (!generalEval.proofDelivered) generalDiscountPercent += 0.02;

    // 2. Disinsectization Specific Discounts
    let disinsectizationSpecificPercent = 0;

    // Delay Days: 0.2% per day
    if (!disinsectizationEval.followedSchedule && disinsectizationEval.delayDays > 0) {
      disinsectizationSpecificPercent += (disinsectizationEval.delayDays * 0.002);
    }

    // Light Traps: 2%
    if (!disinsectizationEval.lightTrapsMaintained) {
      disinsectizationSpecificPercent += 0.02;
    }

    // Extra Call
    if (disinsectizationEval.extraCall) {
      // Answer No to "On Time" -> 2%
      if (!disinsectizationEval.extraCallOnTime) disinsectizationSpecificPercent += 0.02;
      // Answer No to "Effective" -> 2%
      if (!disinsectizationEval.extraCallEffective) disinsectizationSpecificPercent += 0.02;
    }

    // 3. Deratization Specific Discounts
    let deratizationSpecificPercent = 0;

    // Delay Days: 0.2% per day
    if (!deratizationEval.followedSchedule && deratizationEval.delayDays > 0) {
      deratizationSpecificPercent += (deratizationEval.delayDays * 0.002);
    }

    // Traps: 2%
    if (!deratizationEval.lightTrapsMaintained) {
      deratizationSpecificPercent += 0.02;
    }

    // Extra Call
    if (deratizationEval.extraCall) {
      // Answer No to "On Time" -> 2%
      if (!deratizationEval.extraCallOnTime) deratizationSpecificPercent += 0.02;
      // Answer No to "Effective" -> 2%
      if (!deratizationEval.extraCallEffective) deratizationSpecificPercent += 0.02;
    }

    // 4. Termite Specific Discounts
    let termiteSpecificPercent = 0;
    if (!termiteEval.chemicalBarrier) {
      termiteSpecificPercent = 1.00; // 100% discount
    }

    setFinancials(prev => {
      const startDis = prev.disinsectization.discount;
      const startDer = prev.deratization.discount;
      const startTer = prev.termite.discount;

      // Helper Calculation
      const calcVal = (item: typeof prev.disinsectization, percent: number) => {
        const cappedPercent = Math.min(1, percent); // Cap at 100%
        const base = item.metrage * item.unitPrice;
        return Number((base * cappedPercent).toFixed(2));
      };

      const newDis = calcVal(prev.disinsectization, generalDiscountPercent + disinsectizationSpecificPercent);
      const newDer = calcVal(prev.deratization, generalDiscountPercent + deratizationSpecificPercent);
      const newTer = calcVal(prev.termite, generalDiscountPercent + termiteSpecificPercent);

      // Only update if changes to avoid loop/renders
      if (startDis !== newDis || startDer !== newDer || startTer !== newTer) {
        return {
          ...prev,
          disinsectization: { ...prev.disinsectization, discount: newDis },
          deratization: { ...prev.deratization, discount: newDer },
          termite: { ...prev.termite, discount: newTer }
        };
      }
      return prev;
    });
  }, [
    generalEval,
    disinsectizationEval,
    deratizationEval,
    termiteEval, // Added dependency
    financials.disinsectization.metrage, financials.disinsectization.unitPrice,
    financials.deratization.metrage, financials.deratization.unitPrice,
    financials.termite.metrage, financials.termite.unitPrice
  ]);

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const handleServiceToggle = (key: keyof typeof services) => {
    setServices(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const calculateFinancials = () => {
    let totalDiscount = 0;
    let totalFinal = 0;

    const calcService = (key: keyof typeof services, finKey: keyof typeof financials) => {
      if (services[key]) {
        const item = financials[finKey];
        const value = item.metrage * item.unitPrice;
        const final = value - item.discount;
        totalDiscount += item.discount;
        totalFinal += final;
        return { value, final };
      }
      return { value: 0, final: 0 };
    };

    const dis = calcService('disinsectization', 'disinsectization');
    const der = calcService('deratization', 'deratization');
    const ter = calcService('termite', 'termite');

    return { totalDiscount, totalFinal, dis, der, ter };
  };

  const totals = calculateFinancials();

  const handleSubmit = async (status: ServiceStatus = ServiceStatus.COMPLETED) => {
    if (!userProfile) {
      alert("Perfil de usuário não carregado.");
      return;
    }
    setLoading(true);
    try {
      // Determine primary type for list display
      let primaryType = ServiceType.DISINSECTIZATION;
      if (services.termite) primaryType = ServiceType.TERMITE_CONTROL;
      else if (services.deratization) primaryType = ServiceType.DERATIZATION;

      const newEval = {
        // Block 1 & 2
        evaluatorName: userProfile.name,
        evaluatorUnit: userProfile.unit,
        evaluatorRole: userProfile.role,
        referenceMonth: months[parseInt(referenceMonth)],
        referenceYear: currentYear,

        // Block 3
        servicesSelected: services,

        // Block 4
        financials: {
          details: financials,
          totals: totals
        },

        // Block 5
        generalEvaluation: generalEval,

        // Block 6, 7, 8
        specificEvaluation: {
          disinsectization: services.disinsectization ? disinsectizationEval : null,
          deratization: services.deratization ? deratizationEval : null,
          termite: services.termite ? termiteEval : null,
        },

        // Metadata
        unit: userProfile.unit, // For search compatibility
        location: userProfile.unit, // For search compatibility
        type: primaryType,
        score: 100, // Placeholder score or logic to calc it
        status: status,
        date: new Date().toISOString(),
        [isEdit ? 'updatedAt' : 'createdAt']: serverTimestamp(),
      };

      if (isEdit && id) {
        await updateDoc(doc(db, 'evaluations', id), newEval);
      } else {
        await addDoc(collection(db, 'evaluations'), newEval);
      }

      navigate('/evaluations');
    } catch (error) {
      console.error("Error creating evaluation: ", error);
      alert("Erro ao salvar avaliação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`max-w-5xl mx-auto pb-24 animate-in slide-in-from-right-4 duration-500 ${isView ? 'pointer-events-none opacity-90' : ''}`}>
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {isView ? 'Visualizar Avaliação' : isEdit ? 'Editar Avaliação' : 'Nova Avaliação'}
          </h1>
          <p className="text-slate-500 text-sm">
            {isView ? 'Detalhes da vistoria técnica realizada.' : isEdit ? 'Atualize os dados da vistoria técnica.' : 'Preencha os dados da vistoria técnica.'}
          </p>
        </div>
        {isView && (
          <button
            onClick={() => window.print()}
            className="pointer-events-auto flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200"
          >
            <span className="material-icons text-sm">print</span>
            Imprimir
          </button>
        )}
      </header>

      <div className="space-y-8">
        {/* Block 1: User Info */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">1</span>
            Identificação do Fiscal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Nome Completo</label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium">
                {userProfile?.name || 'Carregando...'}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Unidade de Lotação</label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium">
                {userProfile?.unit || 'Carregando...'}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Função</label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium">
                {userProfile?.role || 'Carregando...'}
              </div>
            </div>
          </div>
        </section>

        {/* Block 2: Reference Month */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">2</span>
            Período de Referência
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Mês</label>
              <select
                value={referenceMonth}
                onChange={(e) => setReferenceMonth(e.target.value)}
                className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary"
              >
                {months.map((m, idx) => (
                  <option key={idx} value={idx}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">Ano</label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium">
                {currentYear}
              </div>
            </div>
          </div>
        </section>

        {/* Block 3: Services Selection */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">3</span>
            Serviços Executados
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { id: 'disinsectization', label: 'Desinsetização' },
              { id: 'deratization', label: 'Desratização' },
              { id: 'termite', label: 'Descupinização' }
            ].map((s) => (
              <label key={s.id} className={`cursor-pointer border-2 rounded-xl p-4 flex items-center gap-3 transition-all ${services[s.id as keyof typeof services] ? 'border-primary bg-primary/5' : 'border-slate-100 hover:border-slate-300'}`}>
                <input
                  type="checkbox"
                  className="w-5 h-5 text-primary rounded focus:ring-primary"
                  checked={services[s.id as keyof typeof services]}
                  onChange={() => handleServiceToggle(s.id as keyof typeof services)}
                />
                <span className={`font-medium ${services[s.id as keyof typeof services] ? 'text-primary' : 'text-slate-600'}`}>{s.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Block 4: Financial Summary */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 overflow-hidden">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">4</span>
            Resumo de Ajustes do Contrato
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Serviço</th>
                  <th className="px-4 py-3">Metragem (m²)</th>
                  <th className="px-4 py-3">Valor Unit. (R$)</th>
                  <th className="px-4 py-3">Valor S/ Desconto</th>
                  <th className="px-4 py-3">Descontos (R$)</th>
                  <th className="px-4 py-3 text-right">Valor Final (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.disinsectization && (
                  <tr>
                    <td className="px-4 py-3 font-medium">Desinsetização</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        className="w-20 p-2 bg-slate-100 border border-slate-300 rounded text-right text-slate-600 cursor-not-allowed"
                        value={financials.disinsectization.metrage}
                        readOnly
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number" step="0.01"
                        className="w-20 p-2 bg-slate-100 border border-slate-300 rounded text-right text-slate-600 cursor-not-allowed"
                        value={financials.disinsectization.unitPrice}
                        readOnly
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500">R$ {totals.dis.value.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number" step="0.01"
                        className="w-20 p-1 border rounded text-right text-red-500"
                        value={financials.disinsectization.discount}
                        onChange={(e) => setFinancials(prev => ({ ...prev, disinsectization: { ...prev.disinsectization, discount: Number(e.target.value) } }))}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-bold">R$ {totals.dis.final.toFixed(2)}</td>
                  </tr>
                )}
                {services.deratization && (
                  <tr>
                    <td className="px-4 py-3 font-medium">Desratização</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        className="w-20 p-2 bg-slate-100 border border-slate-300 rounded text-right text-slate-600 cursor-not-allowed"
                        value={financials.deratization.metrage}
                        readOnly
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number" step="0.01"
                        className="w-20 p-2 bg-slate-100 border border-slate-300 rounded text-right text-slate-600 cursor-not-allowed"
                        value={financials.deratization.unitPrice}
                        readOnly
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500">R$ {totals.der.value.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number" step="0.01"
                        className="w-20 p-1 border rounded text-right text-red-500"
                        value={financials.deratization.discount}
                        onChange={(e) => setFinancials(prev => ({ ...prev, deratization: { ...prev.deratization, discount: Number(e.target.value) } }))}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-bold">R$ {totals.der.final.toFixed(2)}</td>
                  </tr>
                )}
                {services.termite && (
                  <tr>
                    <td className="px-4 py-3 font-medium">Descupinização</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        className="w-20 p-2 bg-slate-100 border border-slate-300 rounded text-right text-slate-600 cursor-not-allowed"
                        value={financials.termite.metrage}
                        readOnly
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number" step="0.01"
                        className="w-20 p-2 bg-slate-100 border border-slate-300 rounded text-right text-slate-600 cursor-not-allowed"
                        value={financials.termite.unitPrice}
                        readOnly
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500">R$ {totals.ter.value.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number" step="0.01"
                        className="w-20 p-1 border rounded text-right text-red-500"
                        value={financials.termite.discount}
                        onChange={(e) => setFinancials(prev => ({ ...prev, termite: { ...prev.termite, discount: Number(e.target.value) } }))}
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-bold">R$ {totals.ter.final.toFixed(2)}</td>
                  </tr>
                )}
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-200">
                  <td colSpan={4} className="px-4 py-3 text-right text-slate-600">Totais</td>
                  <td className="px-4 py-3 text-red-600">R$ {totals.totalDiscount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-lg text-primary">R$ {totals.totalFinal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Block 5: General Evaluation */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">5</span>
            Avaliação Geral
          </h2>
          <div className="space-y-4">
            {[
              { id: 'employeeIdentified', q: 'Funcionário identificado e capacitado?' },
              { id: 'epiUsed', q: 'Funcionário utilizou EPI durante toda execução?' },
              { id: 'damageRecovered', q: 'Houve dano não recuperado na estrutura do imóvel?' },
              { id: 'proofDelivered', q: 'Houve a entrega comprovante de aplicação após o serviço?' }
            ].map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 gap-2 border-b border-slate-50 last:border-0">
                <span className="text-sm font-medium text-slate-700">{item.q}</span>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={generalEval[item.id as keyof typeof generalEval] === true}
                      onChange={() => setGeneralEval(prev => ({ ...prev, [item.id]: true }))}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm">Sim</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={generalEval[item.id as keyof typeof generalEval] === false}
                      onChange={() => setGeneralEval(prev => ({ ...prev, [item.id]: false }))}
                      className="text-primary focus:ring-primary"
                    />
                    <span className="text-sm">Não</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Block 6: Disinsectization Specific */}
        {services.disinsectization && (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">6</span>
              Avaliação de Desinsetização
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Quantos metros quadrados foram executados?</label>
                <input
                  type="number"
                  value={disinsectizationEval.executedMetrage}
                  onChange={(e) => {
                    const newVal = Number(e.target.value);
                    setDisinsectizationEval(prev => ({ ...prev, executedMetrage: newVal }));
                    setFinancials(prev => ({ ...prev, disinsectization: { ...prev.disinsectization, metrage: newVal } }));
                  }}
                  className="w-40 border-slate-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start py-3 gap-2">
                <span className="text-sm font-medium text-slate-700 mt-1">A visita seguiu o cronograma acordado?</span>
                <div className="flex flex-col sm:items-end gap-2">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={disinsectizationEval.followedSchedule === true} onChange={() => setDisinsectizationEval(prev => ({ ...prev, followedSchedule: true }))} className="text-primary focus:ring-primary" />
                      <span className="text-sm">Sim</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={disinsectizationEval.followedSchedule === false} onChange={() => setDisinsectizationEval(prev => ({ ...prev, followedSchedule: false }))} className="text-primary focus:ring-primary" />
                      <span className="text-sm">Não</span>
                    </label>
                  </div>
                  {!disinsectizationEval.followedSchedule && (
                    <div className="flex flex-col items-end">
                      <label className="text-xs font-bold text-slate-500 mb-1">Quantos dias de atraso?</label>
                      <input
                        type="number"
                        value={disinsectizationEval.delayDays}
                        onChange={(e) => setDisinsectizationEval(prev => ({ ...prev, delayDays: Number(e.target.value) }))}
                        className="w-32 text-sm border-slate-300 rounded-lg focus:ring-primary focus:border-primary"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 gap-2">
                <span className="text-sm font-medium text-slate-700">Armadilhas luminosas avaliadas e mantidas?</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={disinsectizationEval.lightTrapsMaintained === true} onChange={() => setDisinsectizationEval(prev => ({ ...prev, lightTrapsMaintained: true }))} className="text-primary focus:ring-primary" />
                    <span className="text-sm">Sim</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={disinsectizationEval.lightTrapsMaintained === false} onChange={() => setDisinsectizationEval(prev => ({ ...prev, lightTrapsMaintained: false }))} className="text-primary focus:ring-primary" />
                    <span className="text-sm">Não</span>
                  </label>
                </div>
              </div>

              <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={disinsectizationEval.extraCall}
                    onChange={() => setDisinsectizationEval(prev => ({ ...prev, extraCall: !prev.extraCall }))}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <span className="font-bold text-sm text-slate-800">Houve chamado extra?</span>
                </label>

                {disinsectizationEval.extraCall && (
                  <div className="pl-7 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Visita ocorreu na data e hora acordadas?</span>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={disinsectizationEval.extraCallOnTime === true} onChange={() => setDisinsectizationEval(prev => ({ ...prev, extraCallOnTime: true }))} className="text-primary focus:ring-primary" /><span className="text-sm">Sim</span></label>
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={disinsectizationEval.extraCallOnTime === false} onChange={() => setDisinsectizationEval(prev => ({ ...prev, extraCallOnTime: false }))} className="text-primary focus:ring-primary" /><span className="text-sm">Não</span></label>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Após 24h houve eficácia do produto?</span>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={disinsectizationEval.extraCallEffective === true} onChange={() => setDisinsectizationEval(prev => ({ ...prev, extraCallEffective: true }))} className="text-primary focus:ring-primary" /><span className="text-sm">Sim</span></label>
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={disinsectizationEval.extraCallEffective === false} onChange={() => setDisinsectizationEval(prev => ({ ...prev, extraCallEffective: false }))} className="text-primary focus:ring-primary" /><span className="text-sm">Não</span></label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Block 7: Deratization Specific */}
        {services.deratization && (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">7</span>
              Avaliação de Desratização
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Quantos metros quadrados foram executados?</label>
                <input
                  type="number"
                  value={deratizationEval.executedMetrage}
                  onChange={(e) => {
                    const newVal = Number(e.target.value);
                    setDeratizationEval(prev => ({ ...prev, executedMetrage: newVal }));
                    setFinancials(prev => ({ ...prev, deratization: { ...prev.deratization, metrage: newVal } }));
                  }}
                  className="w-40 border-slate-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start py-2 gap-2">
                <span className="text-sm font-medium text-slate-700 mt-1">A visita seguiu o cronograma acordado?</span>
                <div className="flex flex-col sm:items-end gap-2">
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={deratizationEval.followedSchedule === true} onChange={() => setDeratizationEval(prev => ({ ...prev, followedSchedule: true }))} className="text-primary focus:ring-primary" />
                      <span className="text-sm">Sim</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={deratizationEval.followedSchedule === false} onChange={() => setDeratizationEval(prev => ({ ...prev, followedSchedule: false }))} className="text-primary focus:ring-primary" />
                      <span className="text-sm">Não</span>
                    </label>
                  </div>
                  {!deratizationEval.followedSchedule && (
                    <div className="flex flex-col items-end">
                      <label className="text-xs font-bold text-slate-500 mb-1">Quantos dias de atraso?</label>
                      <input
                        type="number"
                        value={deratizationEval.delayDays}
                        onChange={(e) => setDeratizationEval(prev => ({ ...prev, delayDays: Number(e.target.value) }))}
                        className="w-32 text-sm border-slate-300 rounded-lg focus:ring-primary focus:border-primary"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2 gap-2">
                <span className="text-sm font-medium text-slate-700">Armadilhas avaliadas e mantidas?</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={deratizationEval.lightTrapsMaintained === true} onChange={() => setDeratizationEval(prev => ({ ...prev, lightTrapsMaintained: true }))} className="text-primary focus:ring-primary" />
                    <span className="text-sm">Sim</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={deratizationEval.lightTrapsMaintained === false} onChange={() => setDeratizationEval(prev => ({ ...prev, lightTrapsMaintained: false }))} className="text-primary focus:ring-primary" />
                    <span className="text-sm">Não</span>
                  </label>
                </div>
              </div>

              <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deratizationEval.extraCall}
                    onChange={() => setDeratizationEval(prev => ({ ...prev, extraCall: !prev.extraCall }))}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                  <span className="font-bold text-sm text-slate-800">Houve chamado extra?</span>
                </label>

                {deratizationEval.extraCall && (
                  <div className="pl-7 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Visita ocorreu na data e hora acordadas?</span>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={deratizationEval.extraCallOnTime === true} onChange={() => setDeratizationEval(prev => ({ ...prev, extraCallOnTime: true }))} className="text-primary focus:ring-primary" /><span className="text-sm">Sim</span></label>
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={deratizationEval.extraCallOnTime === false} onChange={() => setDeratizationEval(prev => ({ ...prev, extraCallOnTime: false }))} className="text-primary focus:ring-primary" /><span className="text-sm">Não</span></label>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Após 24h houve eficácia do produto?</span>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={deratizationEval.extraCallEffective === true} onChange={() => setDeratizationEval(prev => ({ ...prev, extraCallEffective: true }))} className="text-primary focus:ring-primary" /><span className="text-sm">Sim</span></label>
                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={deratizationEval.extraCallEffective === false} onChange={() => setDeratizationEval(prev => ({ ...prev, extraCallEffective: false }))} className="text-primary focus:ring-primary" /><span className="text-sm">Não</span></label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Block 8: Termite Specific */}
        {services.termite && (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">8</span>
              Avaliação de Descupinização
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-slate-700">Foi executada barreira química, após agendamento, com garantia de 24 meses?</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={termiteEval.chemicalBarrier === true} onChange={() => setTermiteEval(prev => ({ ...prev, chemicalBarrier: true }))} className="text-primary focus:ring-primary" />
                    <span className="text-sm">Sim</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={termiteEval.chemicalBarrier === false} onChange={() => setTermiteEval(prev => ({ ...prev, chemicalBarrier: false }))} className="text-primary focus:ring-primary" />
                    <span className="text-sm">Não</span>
                  </label>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Footer Actions */}
      {!isView && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 py-4 px-6 lg:ml-64">
          <div className="max-w-5xl mx-auto flex items-center justify-end gap-4">
            <button
              onClick={() => handleSubmit(ServiceStatus.IN_PROGRESS)}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
            >
              Salvar Rascunho
            </button>
            <button
              onClick={() => handleSubmit(ServiceStatus.COMPLETED)}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-2.5 bg-primary text-white rounded-lg font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all disabled:opacity-75"
            >
              {loading ? 'Enviando...' : 'Enviar Avaliação'}
              <span className="material-icons text-sm">send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewEvaluation;
