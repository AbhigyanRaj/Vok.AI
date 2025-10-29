import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import * as auth from "../lib/auth";
import { Button } from "./ui/button";
import { Plus, X, Loader2 } from "lucide-react";
import Modal from "./ui/modal";

// Translation feature removed - unreliable unofficial API
// Users can create modules in any language directly

interface CreateModuleProps {
  open: boolean;
  onClose: () => void;
}

const CreateModule: React.FC<CreateModuleProps> = ({ open, onClose }) => {
  const { user } = useAuth();
  const [moduleName, setModuleName] = useState("");
  const [questions, setQuestions] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const addQuestion = () => {
    setQuestions([...questions, ""]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, value: string) => {
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError("Please sign in to create a module");
      return;
    }

    if (!moduleName.trim()) {
      setError("Module name is required");
      return;
    }

    const validQuestions = questions.filter(q => q.trim());
    if (validQuestions.length === 0) {
      setError("At least one question is required");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await auth.addVoiceModule(user._id, moduleName.trim(), validQuestions);
      setSuccess("Module created successfully!");
      setModuleName("");
      setQuestions([""]);
      
      setTimeout(() => {
        setSuccess("");
        onClose();
      }, 2000);
    } catch (error) {
      setError("Failed to create module. Please try again.");
      console.error("Error creating module:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Create Voice Module</h2>
          <p className="text-sm text-zinc-400">Build a voice module with custom questions for automated calls</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-900/30 border border-green-500/30 rounded-lg text-green-400 text-sm text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Module Name */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Module Name
            </label>
            <input
              type="text"
              value={moduleName}
              onChange={(e) => setModuleName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
              placeholder="Enter module name..."
              disabled={loading}
            />
          </div>

          {/* Questions */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Questions
            </label>
            <div className="space-y-2">
              {questions.map((question, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => updateQuestion(index, e.target.value)}
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
                    placeholder={`Question ${index + 1}...`}
                    disabled={loading}
                  />
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                      disabled={loading}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addQuestion}
              className="mt-2 flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm"
              disabled={loading}
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Module...
              </>
            ) : (
              'Create Module'
            )}
          </Button>
        </form>
      </div>
    </Modal>
  );
};

export default CreateModule; 