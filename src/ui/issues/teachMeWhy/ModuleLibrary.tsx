import { useMemo, useState, type KeyboardEvent } from "react";
import { ArrowRight, BookOpen, Search } from "lucide-react";

import { LEARNING_MODULES } from "../../../shared/teachMeWhy/modules/modules";
import { ModuleDetailScreen } from "./ModuleDetailScreen";
import controls from "./ModuleLibraryControls.module.css";
import styles from "./ModuleLibrary.module.css";

const CATEGORIES = ["all", "visual", "motor", "cognitive", "system"] as const;
type Category = (typeof CATEGORIES)[number];

interface ModuleLibraryProps {
  selectedModuleId: string | null;
  onSelectModule: (id: string | null) => void;
}

export function ModuleLibrary({ selectedModuleId, onSelectModule }: ModuleLibraryProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const selectedModule = LEARNING_MODULES.find((module) => module.id === selectedModuleId) ?? null;
  const filteredModules = useMemo(() => {
    const search = query.trim().toLowerCase();
    return LEARNING_MODULES.filter((module) => {
      const matchesCategory = category === "all" || module.category === category;
      const searchable = [
        module.title,
        module.category,
        module.context,
        module.whyItMatters,
        ...module.learningObjectives,
        ...module.lessonParagraphs,
        ...module.keyTakeaways,
        module.video?.title ?? "",
        module.optionalArticle?.title ?? ""
      ]
        .join(" ")
        .toLowerCase();
      return matchesCategory && (!search || searchable.includes(search));
    });
  }, [category, query]);
  function moveCategory(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = CATEGORIES[(index + direction + CATEGORIES.length) % CATEGORIES.length];
    setCategory(next);
    document.getElementById(`topic-filter-${next}`)?.focus();
  }

  if (selectedModule) {
    return <ModuleDetailScreen module={selectedModule} onBack={() => onSelectModule(null)} />;
  }

  return (
    <section className={styles.library} aria-label="Accessibility topics">
      <div className={styles.header}>
        <h2 className={styles.title}>
          <BookOpen size={20} aria-hidden="true" />
          <span>Accessibility Topics</span>
        </h2>
        <span className={styles.count}>
          {filteredModules.length} of {LEARNING_MODULES.length} topics
        </span>
      </div>
      <label className={controls.search}>
        <Search size={18} aria-hidden="true" />
        <span className={controls.visuallyHidden}>Search topics</span>
        <input
          type="search"
          value={query}
          placeholder="Search topics (e.g. contrast, buttons, touch)..."
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className={controls.filters} role="tablist" aria-label="Topic categories">
        {CATEGORIES.map((item) => (
          <button
            key={item}
            id={`topic-filter-${item}`}
            type="button"
            role="tab"
            aria-selected={category === item}
            aria-controls="topics-panel"
            tabIndex={category === item ? 0 : -1}
            className={controls.filter}
            onClick={() => setCategory(item)}
            onKeyDown={(event) => moveCategory(event, CATEGORIES.indexOf(item))}
          >
            {item === "all" ? "All" : item}
          </button>
        ))}
      </div>
      <div
        id="topics-panel"
        className={styles.list}
        role="tabpanel"
        aria-labelledby={`topic-filter-${category}`}
      >
        {filteredModules.length > 0 ? (
          filteredModules.map((module) => (
            <button
              key={module.id}
              type="button"
              className={styles.topic}
              data-return-focus={`topic-${module.id}`}
              onClick={() => onSelectModule(module.id)}
            >
              <span className={styles.metadata}>
                <span className={styles.category}>{module.category}</span>
                <span>{module.timeBudgetMinutes.reading} min read</span>
              </span>
              <span className={styles.topicTitle}>{module.title}</span>
              <span className={styles.topicSummary}>{module.whyItMatters}</span>
              <span className={styles.open}>
                <ArrowRight size={16} aria-hidden="true" />
                <span>Explore topic</span>
              </span>
            </button>
          ))
        ) : (
          <p className={styles.empty} role="status">
            No topics match this search. Try another word or category.
          </p>
        )}
      </div>
    </section>
  );
}
