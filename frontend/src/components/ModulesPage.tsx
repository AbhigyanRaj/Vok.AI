import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import { getUserModules, deleteVoiceModule, updateVoiceModule } from "../lib/firebase";
import type { VoiceModule } from "../lib/firebase";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Plus, Layers, Trash2, Pencil, X, Check, Loader2 } from "lucide-react";

const ModulesPage: React.FC = () => {
  const { user } = useAuth();
  const [modules, setModules] = useState<VoiceModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ [moduleId: string]: number | null }>({});
  const [editValue, setEditValue] = useState<{ [moduleId: string]: string }>({});
  const [adding, setAdding] = useState<{ [moduleId: string]: boolean }>({});
  const [newQuestion, setNewQuestion] = useState<{ [moduleId: string]: string }>({});
  const [saving, setSaving] = useState<{ [moduleId: string]: boolean }>({});

  const fetchModules = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const mods = await getUserModules(user.uid);
      setModules(mods.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      setError("Failed to load modules.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchModules();
    // eslint-disable-next-line
  }, [user]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteVoiceModule(id);
      setModules(modules => modules.filter(m => m.id !== id));
    } catch {
      setError("Failed to delete module.");
    }
    setDeleting(null);
  };

  // Save edited question
  const saveEdit = async (mod: VoiceModule, idx: number) => {
    if (!editValue[mod.id!] || editValue[mod.id!] === mod.questions[idx]) {
      setEditing(e => ({ ...e, [mod.id!]: null }));
      return;
    }
    setSaving(s => ({ ...s, [mod.id!]: true }));
    const updated = [...mod.questions];
    updated[idx] = editValue[mod.id!];
    await updateVoiceModule(mod.id!, { questions: updated });
    setModules(ms => ms.map(m => m.id === mod.id ? { ...m, questions: updated } : m));
    setEditing(e => ({ ...e, [mod.id!]: null }));
    setSaving(s => ({ ...s, [mod.id!]: false }));
  };

  // Delete question
  const deleteQuestion = async (mod: VoiceModule, idx: number) => {
    if (mod.questions.length === 1) return; // Prevent deleting last question
    setSaving(s => ({ ...s, [mod.id!]: true }));
    const updated = mod.questions.filter((_, i) => i !== idx);
    await updateVoiceModule(mod.id!, { questions: updated });
    setModules(ms => ms.map(m => m.id === mod.id ? { ...m, questions: updated } : m));
    setSaving(s => ({ ...s, [mod.id!]: false }));
  };

  // Add new question
  const addQuestion = async (mod: VoiceModule) => {
    if (!newQuestion[mod.id!] || !newQuestion[mod.id!].trim()) return;
    setSaving(s => ({ ...s, [mod.id!]: true }));
    const updated = [...mod.questions, newQuestion[mod.id!].trim()];
    await updateVoiceModule(mod.id!, { questions: updated });
    setModules(ms => ms.map(m => m.id === mod.id ? { ...m, questions: updated } : m));
    setNewQuestion(nq => ({ ...nq, [mod.id!]: "" }));
    setSaving(s => ({ ...s, [mod.id!]: false }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-zinc-950 px-2 sm:px-4 py-8 sm:py-10 pt-24">
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center mt-12 sm:mt-20">
        {/* Header with icon and create button */}
        <div className="w-full flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-400" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-sans">My Modules</h1>
          </div>
          <button
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition-colors text-sm"
            onClick={() => window.location.href = '/'}
          >
            <Plus className="w-4 h-4" />
            Create Module
          </button>
        </div>
        <p className="text-zinc-400 text-center mb-8 sm:mb-10 max-w-lg text-sm sm:text-base">Manage your voice modules here.</p>
        {error && <div className="text-red-400 mb-4">{error}</div>}
        {loading ? (
          <div className="text-white/80 text-center">Loading modules...</div>
        ) : modules.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-zinc-400 text-center mt-10">
            <Layers className="w-12 h-12 mb-4 text-zinc-700" />
            <div className="text-lg font-semibold mb-2">No modules found</div>
            <div className="mb-4">Create your first module to get started!</div>
            <button
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition-colors text-sm"
              onClick={() => window.location.href = '/'}
            >
              <Plus className="w-4 h-4" />
              Create Module
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {modules.map((mod) => (
              <div
                key={mod.id}
                className="bg-zinc-900 border border-blue-900/30 rounded-2xl shadow-lg p-6 flex flex-col gap-3 relative group transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl"
              >
                {/* Accent bar */}
                <div className="absolute left-0 top-0 h-full w-1.5 rounded-l-2xl bg-gradient-to-b from-blue-500 to-blue-300" />
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-white truncate" title={mod.name}>{mod.name}</span>
                    <span className="ml-2 bg-blue-800/60 text-blue-200 px-2 py-0.5 rounded-full text-xs font-semibold">{mod.questions.length} Qs</span>
                  </div>
                  <button
                    className="p-2 rounded hover:bg-red-500/20 transition-colors"
                    onClick={() => handleDelete(mod.id!)}
                    disabled={deleting === mod.id}
                    title="Delete Module"
                  >
                    <Trash2 className={`w-5 h-5 ${deleting === mod.id ? 'animate-spin text-red-400' : 'text-red-400 group-hover:text-red-500'}`} />
                  </button>
                </div>
                <div className="text-xs text-zinc-400 mb-2">Created: {new Date(mod.createdAt).toLocaleString()}</div>
                <div className="flex flex-col gap-1">
                  <div className="text-sm text-white/80 font-medium mb-1">Questions:</div>
                  {mod.questions.map((q, i) => (
                    <div key={i} className={`flex items-center gap-2 mb-2 p-2 rounded-lg transition-all ${editing[mod.id!] === i ? 'bg-zinc-100/90 shadow border border-blue-300' : 'bg-zinc-800 hover:bg-zinc-700/80'} relative`}>
                      {editing[mod.id!] === i ? (
                        <>
                          <input
                            className="text-xs text-zinc-900 bg-white rounded px-2 py-1 flex-1 outline-none border border-blue-400 focus:ring-2 focus:ring-blue-400 shadow-sm transition-all"
                            value={editValue[mod.id!] ?? q}
                            onChange={e => setEditValue(ev => ({ ...ev, [mod.id!]: e.target.value }))}
                            autoFocus
                          />
                          <button
                            className="p-1 rounded bg-green-500 hover:bg-green-600 text-white ml-1 transition-colors"
                            onClick={() => saveEdit(mod, i)}
                            disabled={saving[mod.id!]}
                            title="Save"
                          >
                            {saving[mod.id!] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            className="p-1 rounded bg-zinc-300 hover:bg-zinc-400 text-zinc-700 ml-1 transition-colors"
                            onClick={() => setEditing(e => ({ ...e, [mod.id!]: null }))}
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="text-xs text-zinc-200 flex-1 cursor-pointer select-text" onClick={() => {
                            setEditing(e => ({ ...e, [mod.id!]: i }));
                            setEditValue(ev => ({ ...ev, [mod.id!]: q }));
                          }}>{q}</div>
                          <button
                            className="p-1 rounded hover:bg-blue-500/20 transition-colors ml-1"
                            onClick={() => {
                              setEditing(e => ({ ...e, [mod.id!]: i }));
                              setEditValue(ev => ({ ...ev, [mod.id!]: q }));
                            }}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4 text-blue-400" />
                          </button>
                          <button
                            className="p-1 rounded hover:bg-red-500/20 transition-colors ml-1"
                            onClick={() => deleteQuestion(mod, i)}
                            disabled={mod.questions.length === 1 || saving[mod.id!]}
                            title={mod.questions.length === 1 ? "At least one question required" : "Delete"}
                          >
                            {saving[mod.id!] ? <Loader2 className="w-4 h-4 animate-spin text-red-400" /> : <Trash2 className="w-4 h-4 text-red-400" />}
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                  {/* Add new question */}
                  <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-zinc-800/80 border border-blue-900/20 shadow-sm">
                    <Plus className="w-4 h-4 text-blue-400 opacity-70" />
                    <input
                      className="text-xs text-zinc-900 bg-white rounded px-2 py-1 flex-1 outline-none border border-blue-300 focus:ring-2 focus:ring-blue-400 shadow-sm transition-all"
                      placeholder="Add new question..."
                      value={newQuestion[mod.id!] ?? ""}
                      onChange={e => setNewQuestion(nq => ({ ...nq, [mod.id!]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') addQuestion(mod); }}
                      disabled={saving[mod.id!]}
                    />
                    <button
                      className="p-2 rounded bg-blue-600 hover:bg-blue-700 text-white transition-all duration-150 disabled:opacity-50 scale-100 hover:scale-105 shadow"
                      onClick={() => addQuestion(mod)}
                      disabled={saving[mod.id!] || !(newQuestion[mod.id!] && newQuestion[mod.id!].trim())}
                      title="Add Question"
                    >
                      {saving[mod.id!] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModulesPage; 