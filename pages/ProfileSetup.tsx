
import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const ProfileSetup: React.FC = () => {
    const { user, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [unit, setUnit] = useState("");
    const [role, setRole] = useState<"Titular" | "Substituto">("Titular");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            if (user) {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as UserProfile;
                    setName(data.name);
                    setUnit(data.unit);
                    setRole(data.role);
                }
            }
        };
        fetchProfile();
    }, [user]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        const profile: UserProfile = {
            uid: user.uid,
            email: user.email || "",
            name,
            unit,
            role,
        };

        try {
            await setDoc(doc(db, "users", user.uid), profile);
            await refreshProfile();
            navigate("/dashboard");
        } catch (error) {
            console.error("Error saving profile:", error);
            alert("Erro ao salvar perfil.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background-light p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-800">Complete seu Cadastro</h1>
                    <p className="text-slate-500 text-sm">Precisamos de algumas informações para continuar.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                        <input
                            required
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary"
                            placeholder="Seu nome completo"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Unidade de Lotação</label>
                        <input
                            required
                            type="text"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary"
                            placeholder="Ex: Setor A - Bloco 2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Função</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="role"
                                    checked={role === "Titular"}
                                    onChange={() => setRole("Titular")}
                                    className="text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-slate-700">Fiscal Titular</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="role"
                                    checked={role === "Substituto"}
                                    onChange={() => setRole("Substituto")}
                                    className="text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-slate-700">Fiscal Substituto</span>
                            </label>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-white py-2.5 rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-70"
                    >
                        {loading ? "Salvando..." : "Salvar e Continuar"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProfileSetup;
