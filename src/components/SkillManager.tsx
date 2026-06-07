import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Layers, 
  Plus, 
  Trash2, 
  Search, 
  Check, 
  Sparkles, 
  Shield, 
  Code, 
  Database, 
  Map, 
  Workflow, 
  X, 
  AlertCircle,
  HelpCircle,
  Settings,
  Flame,
  Zap,
  Star,
  Upload
} from "lucide-react";
import { SkillItem } from "../types";

interface SkillManagerProps {
  skills: SkillItem[];
  onToggleSkill: (id: string) => void;
  onDeleteSkill: (id: string) => void;
  onAddSkill: (skill: { name: string; description: string; promptContent: string; category: string }) => void;
  onClose?: () => void;
}

export default function SkillManager({ 
  skills, 
  onToggleSkill, 
  onDeleteSkill, 
  onAddSkill,
  onClose 
}: SkillManagerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillDesc, setNewSkillDesc] = useState("");
  const [newSkillPrompt, setNewSkillPrompt] = useState("");
  const [newSkillCat, setNewSkillCat] = useState("Calidad");
  
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (file.name.endsWith(".json")) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            let importedCount = 0;
            parsed.forEach((item: any) => {
              if (item.name && item.promptContent) {
                onAddSkill({
                  name: item.name,
                  description: item.description || "Habilidad importada desde PC.",
                  promptContent: item.promptContent,
                  category: item.category || "Personalizado"
                });
                importedCount++;
              }
            });
            if (importedCount > 0) {
              setSuccessMsg(`Se importaron ${importedCount} habilidades con éxito.`);
              setTimeout(() => setSuccessMsg(""), 4000);
            } else {
              throw new Error("El archivo JSON no contiene habilidades válidas con 'name' y 'promptContent'.");
            }
          } else if (parsed && typeof parsed === "object") {
            if (parsed.name && parsed.promptContent) {
              onAddSkill({
                name: parsed.name,
                description: parsed.description || "Habilidad importada desde PC.",
                promptContent: parsed.promptContent,
                category: parsed.category || "Personalizado"
              });
              setSuccessMsg(`Habilidad "${parsed.name}" importada.`);
              setTimeout(() => setSuccessMsg(""), 4000);
            } else {
              throw new Error("El objeto JSON debe tener campos 'name' y 'promptContent'.");
            }
          } else {
            throw new Error("Formato JSON desconocido.");
          }
        } else {
          // Plain Text Skill file
          if (!text.trim()) {
            throw new Error("El archivo de texto está vacío.");
          }
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
          onAddSkill({
            name: nameWithoutExt,
            description: "Directiva inyectada de archivo de texto local.",
            promptContent: text.trim(),
            category: "Personalizado"
          });
          setSuccessMsg(`Regla "${nameWithoutExt}" importada desde archivo de texto.`);
          setTimeout(() => setSuccessMsg(""), 4500);
        }
      } catch (err: any) {
        setErrorMsg(err.message || "Error al leer o procesar el archivo.");
        setTimeout(() => setErrorMsg(""), 5000);
      }
    };
    reader.readAsText(file);
    // Reset file input value
    e.target.value = "";
  };

  // Filter skills based on search and category tab
  const filteredSkills = skills.filter(skill => {
    const matchesSearch = 
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.promptContent.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "All" || skill.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Calculate stats
  const activeCount = skills.filter(s => s.isActive).length;
  
  // Available helper categories
  const categories = ["All", "Bases de Datos", "IA", "Calidad", "Refactor", "Seguridad", "Mapas", "Productividad", "Personalizado"];

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim() || !newSkillPrompt.trim()) return;

    onAddSkill({
      name: newSkillName.trim(),
      description: newSkillDesc.trim() || "Trabajo personalizado del usuario.",
      promptContent: newSkillPrompt.trim(),
      category: newSkillCat
    });

    // Reset Form
    setNewSkillName("");
    setNewSkillDesc("");
    setNewSkillPrompt("");
    setIsAddingSkill(false);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Bases de Datos":
        return <Database className="w-3.5 h-3.5 text-blue-400" />;
      case "IA":
        return <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />;
      case "Seguridad":
        return <Shield className="w-3.5 h-3.5 text-red-400" />;
      case "Refactor":
        return <Code className="w-3.5 h-3.5 text-indigo-400" />;
      case "Diseño SOLID":
      case "Calidad":
        return <Workflow className="w-3.5 h-3.5 text-emerald-400" />;
      case "Mapas":
        return <Map className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Settings className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  return (
    <div className="flex flex-col gap-3 font-sans">
      {/* Quick Search & Summary header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-emerald-400 font-bold">
            <Zap className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Panel de Inyección Cognitiva</span>
          </div>
          <span className="text-[8.5px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono font-bold">
            {activeCount} de {skills.length} ACTIVAS
          </span>
        </div>

        {/* Action Controls and Search Input */}
        <div className="flex gap-1.5 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1.5 w-3 h-3 text-neutral-500" />
            <input
              type="text"
              placeholder="Buscar reglas o habilidades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#040608] border border-neutral-900 rounded-lg pl-7 pr-2 py-1 text-[10px] text-neutral-300 placeholder-neutral-600 focus:outline-none focus:border-emerald-500/40 transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1.5 text-neutral-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Upload Skills Button and Hidden Input */}
          <label 
            htmlFor="skills-pc-file-upload" 
            className="p-1.5 rounded-lg border bg-neutral-950 border-neutral-900 text-neutral-400 hover:text-white hover:border-neutral-800 transition-all cursor-pointer flex items-center justify-center shrink-0"
            title="Subir habilidades o reglas (.json, .txt) desde tu PC"
          >
            <Upload className="w-3.5 h-3.5" />
            <input 
              type="file" 
              id="skills-pc-file-upload" 
              accept=".json,.txt" 
              onChange={handleFileUpload} 
              className="hidden" 
            />
          </label>

          <button
            type="button"
            onClick={() => setIsAddingSkill(!isAddingSkill)}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isAddingSkill 
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" 
                : "bg-neutral-950 border-neutral-900 text-neutral-400 hover:text-white hover:border-neutral-800"
            }`}
            title="Añadir Habilidad Personalizada"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        
        {/* Alerts for file upload feedback */}
        {successMsg && (
          <div className="p-2 border border-emerald-500/10 rounded-lg bg-emerald-950/10 text-emerald-400 text-[9.5px] font-medium flex items-center gap-1.5 select-none animate-fadeIn">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="p-2 border border-red-500/10 rounded-lg bg-red-950/10 text-rose-450 text-[9.5px] font-medium flex items-center gap-1.5 select-none animate-fadeIn">
            <AlertCircle className="w-3.5 h-3.5 text-rose-450" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Category horizontal filters */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-900 select-none">
        {categories.map(cat => {
          const isActive = selectedCategory === cat;
          const count = skills.filter(s => cat === "All" || s.category === cat).length;
          if (count === 0 && cat !== "All") return null;

          return (
            <button
              type="button"
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded-full text-[8.5px] font-sans font-semibold shrink-0 cursor-pointer transition-all border ${
                isActive 
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300 font-bold" 
                  : "bg-[#06080b] border-neutral-900 text-neutral-500 hover:text-neutral-350 hover:border-neutral-850"
              }`}
            >
              {cat} <span className="text-[7.5px] opacity-60 font-mono">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Create custom skill collapsible form */}
      <AnimatePresence>
        {isAddingSkill && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleFormSubmit}
            className="p-3 border border-emerald-500/15 rounded-xl bg-gradient-to-b from-[#080B0F] to-[#040608] text-[10px] space-y-2.5 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-neutral-900 pb-1">
              <span className="text-[9px] font-bold text-emerald-400 font-mono uppercase flex items-center gap-1">
                <Star className="w-3 h-3 fill-emerald-400 text-emerald-400 animate-pulse" />
                Nueva Regla de Inyección
              </span>
              <button 
                type="button" 
                onClick={() => setIsAddingSkill(false)}
                className="text-neutral-500 hover:text-neutral-350"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[8px] text-neutral-500 font-bold block">NOMBRE DE REGLA:</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Estilo OOP, Clean API"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  className="w-full bg-[#05070a] border border-neutral-900 focus:border-emerald-500/30 rounded px-1.5 py-1 text-slate-300 outline-none text-[9.5px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[8px] text-neutral-500 font-bold block">CATEGORÍA:</label>
                <select
                  value={newSkillCat}
                  onChange={(e) => setNewSkillCat(e.target.value)}
                  className="w-full bg-[#05070a] border border-neutral-900 focus:border-emerald-500/30 rounded px-1 py-1 text-slate-300 outline-none text-[9.5px] cursor-pointer"
                >
                  <option value="Calidad">Calidad</option>
                  <option value="Refactor">Refactor</option>
                  <option value="Bases de Datos">Bases de Datos</option>
                  <option value="Seguridad">Seguridad</option>
                  <option value="IA">Inteligencia Artificial</option>
                  <option value="Personalizado">Personalizado</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] text-neutral-500 font-bold block">DESCRIPCIÓN OPERATIVA:</label>
              <input
                type="text"
                placeholder="Ej. Instrucciones para mapeo estricto del response"
                value={newSkillDesc}
                onChange={(e) => setNewSkillDesc(e.target.value)}
                className="w-full bg-[#05070a] border border-neutral-900 focus:border-emerald-500/30 rounded px-1.5 py-1 text-slate-300 outline-none text-[9.5px]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[8px] text-neutral-500 font-bold block uppercase">Inyección Cognitiva (Instrucción del Prompt):</label>
              <textarea
                required
                rows={2}
                placeholder="Escribe la regla exacta que la IA debe leer y seguir en cada instrucción..."
                value={newSkillPrompt}
                onChange={(e) => setNewSkillPrompt(e.target.value)}
                className="w-full bg-[#05070a] border border-neutral-900 focus:border-emerald-500/30 rounded px-1.5 py-1 text-slate-200 placeholder-neutral-600 outline-none text-[9.5px] resize-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-1.5 pt-1.5 border-t border-neutral-900/50">
              <button
                type="button"
                onClick={() => setIsAddingSkill(false)}
                className="px-2.5 py-1 rounded text-[8.5px] font-bold font-sans text-neutral-400 hover:text-white cursor-pointer bg-neutral-900 hover:bg-neutral-850 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-1 rounded text-[8.5px] font-bold font-sans text-slate-950 bg-emerald-400 hover:bg-emerald-350 active:scale-95 cursor-pointer transition-all shadow-md flex items-center gap-1"
              >
                <Check className="w-3 h-3 text-slate-950 stroke-[3]" /> Crear Regla
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Skills Checklist list block */}
      <div className="space-y-2 max-h-[240px] overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-900 rounded-xl bg-[#040609]/70 border border-neutral-900/60 p-2 text-[10px]">
        {filteredSkills.length > 0 ? (
          filteredSkills.map(skill => (
            <div 
              key={skill.id}
              className={`group flex items-start gap-2.5 py-2 px-2.5 rounded-lg border transition-all ${
                skill.isActive 
                  ? "bg-emerald-950/10 border-emerald-500/20 shadow-emerald-950/20 shadow-sm" 
                  : "bg-neutral-950/40 border-transparent hover:border-neutral-900 hover:bg-neutral-950/60"
              }`}
            >
              {/* Checkbox Trigger toggle */}
              <div className="pt-0.5 shrink-0 flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={skill.isActive}
                  onChange={() => onToggleSkill(skill.id)}
                  id={`skill-chk-${skill.id}`}
                  className="rounded border-neutral-800 bg-[#06080a] text-emerald-500 focus:ring-emerald-500/40 w-3.5 h-3.5 cursor-pointer hover:border-emerald-500/50 transition-all"
                />
              </div>

              {/* Skill Description Block */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 justify-between">
                  <label htmlFor={`skill-chk-${skill.id}`} className="font-bold text-[10.5px] text-neutral-200 cursor-pointer flex items-center gap-1.5 select-none">
                    {getCategoryIcon(skill.category)}
                    <span className={`transition-colors ${skill.isActive ? "text-emerald-300" : "text-neutral-300 group-hover:text-white"}`}>
                      {skill.name}
                    </span>
                  </label>
                  
                  <div className="flex items-center gap-1 text-[8px] font-mono font-bold select-none shrink-0 opacity-80">
                    <span className={`px-1.5 py-0.2 rounded ${
                      skill.isSystem 
                        ? "bg-[#090b0f] text-neutral-500 border border-neutral-900" 
                        : "bg-emerald-500/10 text-emerald-450 border border-emerald-500/15"
                    }`}>
                      {skill.isSystem ? "Sistema" : "Creada"}
                    </span>
                  </div>
                </div>

                <p className="text-[9.5px] text-neutral-500 leading-normal font-sans mt-1">
                  {skill.description}
                </p>

                {/* Sub-block displaying the underlying Prompt Directive in italic style */}
                <div className={`mt-1.5 pt-1 border-t transition-all text-neutral-400/90 leading-relaxed font-mono text-[8.5px] font-medium p-1.5 rounded ${
                  skill.isActive 
                    ? "border-emerald-500/10 bg-emerald-950/5 text-emerald-250/90" 
                    : "border-neutral-900/50 bg-[#05070a]/60 text-neutral-450"
                }`}>
                  <span className="text-[8px] uppercase font-bold text-neutral-600 block mb-0.5 tracking-wider font-mono">
                    Directiva Inyectada:
                  </span>
                  "{skill.promptContent}"
                </div>
              </div>

              {/* Action delete buttons for custom skills only */}
              {!skill.isSystem && (
                <button
                  type="button"
                  onClick={() => onDeleteSkill(skill.id)}
                  className="text-neutral-550 hover:text-rose-450 p-1 rounded-md hover:bg-neutral-900/40 cursor-pointer self-start transition-colors shrink-0"
                  title="Eliminar regla personalizada"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="py-4 text-center text-neutral-600 italic flex flex-col items-center justify-center gap-1">
            <AlertCircle className="w-4 h-4 text-neutral-700" />
            <span>No se encontraron habilidades registradas.</span>
          </div>
        )}
      </div>

      {/* Info helper hint footer */}
      <div className="p-2.5 bg-neutral-950/40 border border-neutral-900/50 rounded-xl flex items-start gap-2 text-[9px] text-neutral-500 leading-normal">
        <HelpCircle className="w-3.5 h-3.5 text-neutral-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-neutral-400">¿Cómo funciona la inyección?</p>
          <p>
            Las directivas de las habilidades marcadas como <span className="font-semibold text-emerald-400">ACTIVAS</span> se concatenan automáticamente al final de tus mensajes. El Agente Inteligente las recibirá de manera prioritaria para mantener la calidad de código, modularidad y apego técnico.
          </p>
        </div>
      </div>
    </div>
  );
}
