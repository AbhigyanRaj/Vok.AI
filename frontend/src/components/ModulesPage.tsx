import React, { useEffect, useState } from "react";
import * as auth from "../lib/auth";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Plus, Layers, Trash2, Pencil, X, Check, Loader2, Phone, Play } from "lucide-react";

type QuestionObject = {
  question: string;
  order: number;
  required: boolean;
  _id?: string;
};

const ModulesPage: React.FC = () => {
  const { user } = useAuth();
  const [modules, setModules] = useState<auth.VoiceModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ [moduleId: string]: number | null }>({});
  const [editValue, setEditValue] = useState<{ [moduleId: string]: string }>({});
  const [adding, setAdding] = useState<{ [moduleId: string]: boolean }>({});
  const [newQuestion, setNewQuestion] = useState<{ [moduleId: string]: string }>({});
  const [saving, setSaving] = useState<{ [moduleId: string]: boolean }>({});
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  console.log('ModulesPage rendered with user:', user);

  const fetchModules = async () => {
    if (!user) {
      console.log('No user, skipping fetch');
      return;
    }
    console.log('Fetching modules for user:', user._id);
    setLoading(true);
    setError("");
    try {
      const mods = await auth.getUserModules(user._id);
      console.log('Fetched modules:', mods);
      setModules(mods.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      console.error('Error fetching modules:', err);
      setError("Failed to load modules.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchModules();
    // eslint-disable-next-line
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!id) {
      setError("Invalid module ID");
      return;
    }
    
    console.log('Attempting to delete module:', id);
    setDeleting(id);
    try {
      await auth.deleteVoiceModule(id);
      console.log('Module deleted successfully, updating UI');
      setModules(modules => modules.filter(m => m.id !== id));
      if (selectedModule === id) {
        setSelectedModule(null);
      }
    } catch (error) {
      console.error('Failed to delete module:', error);
      setError(`Failed to delete module: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setDeleting(null);
  };

  // Save edited question
  const saveEdit = async (mod: auth.VoiceModule, idx: number) => {
    const currentQuestion = mod.questions[idx].question;
    if (!editValue[mod.id!] || editValue[mod.id!] === currentQuestion) {
      setEditing(e => ({ ...e, [mod.id!]: null }));
      return;
    }
    setSaving(s => ({ ...s, [mod.id!]: true }));
    const updated = [...mod.questions];
    updated[idx] = { ...updated[idx], question: editValue[mod.id!] };
    await auth.updateVoiceModule(mod.id!, { questions: updated });
    setModules(ms => ms.map(m => m.id === mod.id ? { ...m, questions: updated } : m));
    setEditing(e => ({ ...e, [mod.id!]: null }));
    setSaving(s => ({ ...s, [mod.id!]: false }));
  };

  // Delete question
  const deleteQuestion = async (mod: auth.VoiceModule, idx: number) => {
    if (mod.questions.length === 1) return; // Prevent deleting last question
    setSaving(s => ({ ...s, [mod.id!]: true }));
    const updated = mod.questions.filter((_, i) => i !== idx);
    await auth.updateVoiceModule(mod.id!, { questions: updated });
    setModules(ms => ms.map(m => m.id === mod.id ? { ...m, questions: updated } : m));
    setSaving(s => ({ ...s, [mod.id!]: false }));
  };

  // Add new question
  const addQuestion = async (mod: auth.VoiceModule) => {
    if (!newQuestion[mod.id!] || !newQuestion[mod.id!].trim()) return;
    setSaving(s => ({ ...s, [mod.id!]: true }));
    const newQuestionObj = {
      question: newQuestion[mod.id!].trim(),
      order: mod.questions.length,
      required: true
    };
    const updated = [...mod.questions, newQuestionObj];
    await auth.updateVoiceModule(mod.id!, { questions: updated });
    setModules(ms => ms.map(m => m.id === mod.id ? { ...m, questions: updated } : m));
    setNewQuestion(nq => ({ ...nq, [mod.id!]: "" }));
    setSaving(s => ({ ...s, [mod.id!]: false }));
  };

  const handleSelectModule = (moduleId: string) => {
    setSelectedModule(moduleId);
    console.log('Selected module:', moduleId);
  };

  const handleUseModule = (module: auth.VoiceModule) => {
    console.log('Using module:', module);
    // Here you can navigate to a call creation page or open a modal
    // For now, let's just show an alert
    alert(`Selected module: ${module.name}\nQuestions: ${module.questions.length}`);
  };

  const handleStartCall = (module: auth.VoiceModule) => {
    console.log('Starting call with module:', module);
    // Navigate to call creation page or open call modal
    alert(`Starting call with module: ${module.name}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-10 pt-20 sm:pt-24">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 sm:mb-10 mt-20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Layers className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-100 mb-1">My Voice Modules</h1>
                <p className="text-zinc-400 text-sm sm:text-base">Create, manage, and organize your voice modules</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedModule && (
                <button
                  className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 font-medium px-4 py-2 rounded-xl transition-all duration-200 text-sm"
                  onClick={() => setSelectedModule(null)}
                  title="Clear Selection"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
              <button
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-zinc-100 font-medium px-6 py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/30"
                onClick={() => window.location.href = '/create-module'}
              >
                <Plus className="w-4 h-4" />
                Create Module
              </button>
            </div>
          </div>
          
          {selectedModule && (
            <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-blue-300 font-medium">Module selected - Ready to use</span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="flex items-center gap-2 text-red-400">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              {error}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mb-4"></div>
            <div className="text-zinc-400 text-lg">Loading your modules...</div>
          </div>
        ) : modules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-4 bg-zinc-800/50 rounded-full mb-6">
              <Layers className="w-12 h-12 text-zinc-600" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-100 mb-2">No modules found</h3>
            <p className="text-zinc-400 text-center mb-8 max-w-md">Create your first voice module to get started with automated calling.</p>
            <button
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-zinc-100 font-medium px-6 py-3 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/30"
              onClick={() => window.location.href = '/create-module'}
            >
              <Plus className="w-4 h-4" />
              Create Your First Module
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {modules.map((mod) => (
              <div
                key={mod.id}
                className={`group relative bg-zinc-900/50 border rounded-2xl p-6 hover:bg-zinc-900/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                  selectedModule === mod.id 
                    ? 'border-blue-500/50 bg-blue-900/20 shadow-lg shadow-blue-500/20' 
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Selection indicator */}
                {selectedModule === mod.id && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-zinc-100 truncate mb-1" title={mod.name}>
                      {mod.name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-zinc-400">
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        {mod.questions.length} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-zinc-500 rounded-full"></div>
                        {new Date(mod.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    className="p-2 rounded-lg hover:bg-red-500/20 transition-all duration-200 opacity-0 group-hover:opacity-100"
                    onClick={() => handleDelete(mod.id!)}
                    disabled={deleting === mod.id}
                    title="Delete Module"
                  >
                    {deleting === mod.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                    ) : (
                      <Trash2 className="w-4 h-4 text-red-400 hover:text-red-300" />
                    )}
                  </button>
                </div>
                
                {/* Module Actions */}
                <div className="flex items-center gap-2 mb-6">
                  <button
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedModule === mod.id
                        ? 'bg-blue-600 text-zinc-100 shadow-lg shadow-blue-500/25'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-200'
                    }`}
                    onClick={() => handleSelectModule(mod.id!)}
                  >
                    <Check className="w-4 h-4" />
                    {selectedModule === mod.id ? 'Selected' : 'Select'}
                  </button>
                  
                  {selectedModule === mod.id && (
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <button
                          disabled
                          className="flex items-center gap-2 bg-zinc-700 text-zinc-400 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed opacity-60"
                          title="Bulk calling coming soon"
                        >
                          <Phone className="w-4 h-4" />
                          Bulk Call
                        </button>
                        <Badge variant="outline" className="absolute -top-2 -right-2 text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/30 px-1.5 py-0.5">Soon</Badge>
                      </div>
                    </div>
                  )}
                </div>

                {/* Questions Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-zinc-300">Questions</h4>
                    <span className="text-xs text-zinc-500">{mod.questions.length} total</span>
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {mod.questions.map((q: QuestionObject, i) => (
                      <div 
                        key={i} 
                        className={`flex items-center gap-2 p-3 rounded-lg transition-all duration-200 ${
                          editing[mod.id!] === i 
                            ? 'bg-white shadow-lg border border-blue-300' 
                            : 'bg-zinc-800/50 hover:bg-zinc-800/70'
                        }`}
                      >
                        {editing[mod.id!] === i ? (
                          <>
                            <input
                              className="flex-1 text-sm text-zinc-100 bg-zinc-800/50 rounded px-3 py-2 outline-none border border-zinc-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition-all"
                              value={editValue[mod.id!] ?? q.question}
                              onChange={e => setEditValue(ev => ({ ...ev, [mod.id!]: e.target.value }))}
                              autoFocus
                            />
                            <button
                              className="p-2 rounded-lg bg-green-500 hover:bg-green-600 text-white transition-all duration-200"
                              onClick={() => saveEdit(mod, i)}
                              disabled={saving[mod.id!]}
                              title="Save"
                            >
                              {saving[mod.id!] ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              className="p-2 rounded-lg bg-zinc-600 hover:bg-zinc-500 text-zinc-200 transition-all duration-200"
                              onClick={() => setEditing(e => ({ ...e, [mod.id!]: null }))}
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <div 
                              className="flex-1 text-sm text-zinc-200 cursor-pointer hover:text-zinc-100 transition-colors"
                              onClick={() => {
                                setEditing(e => ({ ...e, [mod.id!]: i }));
                                setEditValue(ev => ({ ...ev, [mod.id!]: q.question }));
                              }}
                            >
                              {q.question}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                className="p-1.5 rounded-lg hover:bg-blue-500/20 transition-all duration-200"
                                onClick={() => {
                                  setEditing(e => ({ ...e, [mod.id!]: i }));
                                  setEditValue(ev => ({ ...ev, [mod.id!]: q.question }));
                                }}
                                title="Edit"
                              >
                                <Pencil className="w-3 h-3 text-blue-400" />
                              </button>
                              <button
                                className="p-1.5 rounded-lg hover:bg-red-500/20 transition-all duration-200"
                                onClick={() => deleteQuestion(mod, i)}
                                disabled={mod.questions.length === 1 || saving[mod.id!]}
                                title={mod.questions.length === 1 ? "At least one question required" : "Delete"}
                              >
                                {saving[mod.id!] ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-400"></div>
                                ) : (
                                  <Trash2 className="w-3 h-3 text-red-400" />
                                )}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add new question */}
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/50">
                    <Plus className="w-4 h-4 text-blue-400" />
                    <input
                      className="flex-1 text-sm text-zinc-100 bg-zinc-800/50 rounded px-3 py-2 outline-none border border-zinc-700 focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition-all placeholder-zinc-400"
                      placeholder="Add new question..."
                      value={newQuestion[mod.id!] ?? ""}
                      onChange={e => setNewQuestion(nq => ({ ...nq, [mod.id!]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') addQuestion(mod); }}
                      disabled={saving[mod.id!]}
                    />
                    <button
                      className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-zinc-100 transition-all duration-200 disabled:opacity-50"
                      onClick={() => addQuestion(mod)}
                      disabled={saving[mod.id!] || !(newQuestion[mod.id!] && newQuestion[mod.id!].trim())}
                      title="Add Question"
                    >
                      {saving[mod.id!] ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
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