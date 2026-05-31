import { useEffect, useLayoutEffect, useRef, useState } from "react";

import {
  getProjectImages,
  getProjectMapUrl,
  getProjectScope,
  type PublicProjectItem,
} from "../components/projects/publicProjectModel";

type UsePublicProjectsShowcaseInput = {
  projects: PublicProjectItem[];
};

export function usePublicProjectsShowcase({ projects }: UsePublicProjectsShowcaseInput) {
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const [activeProjectImageIndex, setActiveProjectImageIndex] = useState(0);
  const projectSwitcherButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const projectTitleRef = useRef<HTMLHeadingElement | null>(null);
  const activeProject = projects[activeProjectIndex] ?? projects[0];
  const activeProjectImages = getProjectImages(activeProject);
  const activeProjectImage = activeProjectImages[activeProjectImageIndex] ?? activeProjectImages[0];
  const activeProjectScope = getProjectScope(activeProject);
  const activeProjectMapUrl = getProjectMapUrl(activeProject);
  const isProjectScopeOpen = activeProjectScope.length > 0;
  const [renderedProjectScope, setRenderedProjectScope] = useState(activeProjectScope);
  const projectScopeToRender = isProjectScopeOpen ? activeProjectScope : renderedProjectScope;
  const activeProjectCounter = `${String(activeProjectIndex + 1).padStart(2, "0")} / ${String(
    projects.length,
  ).padStart(2, "0")}`;

  useEffect(() => {
    if (activeProjectScope.length > 0) {
      setRenderedProjectScope(activeProjectScope);
    }
  }, [activeProjectIndex]);

  useEffect(() => {
    projectSwitcherButtonRefs.current[activeProjectIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [activeProjectIndex]);

  useLayoutEffect(() => {
    const title = projectTitleRef.current;

    if (!title) {
      return undefined;
    }

    const fitTitle = () => {
      const maxFontSize = Number.parseFloat(getComputedStyle(title).getPropertyValue("--public-project-title-max"));
      const minFontSize = Number.parseFloat(getComputedStyle(title).getPropertyValue("--public-project-title-min"));
      const titleParentWidth = title.parentElement?.clientWidth ?? title.clientWidth;

      if (!Number.isFinite(maxFontSize) || !Number.isFinite(minFontSize) || titleParentWidth <= 0) {
        return;
      }

      title.style.fontSize = `${maxFontSize}px`;

      if (title.scrollWidth <= titleParentWidth) {
        return;
      }

      let low = minFontSize;
      let high = maxFontSize;

      for (let step = 0; step < 8; step += 1) {
        const middle = (low + high) / 2;

        title.style.fontSize = `${middle}px`;

        if (title.scrollWidth <= titleParentWidth) {
          low = middle;
        } else {
          high = middle;
        }
      }

      title.style.fontSize = `${low}px`;
    };

    fitTitle();

    const resizeObserver = new ResizeObserver(fitTitle);
    resizeObserver.observe(title);

    if (title.parentElement) {
      resizeObserver.observe(title.parentElement);
    }

    const mutationObserver = new MutationObserver(fitTitle);
    mutationObserver.observe(title, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [activeProject.name]);

  const handleProjectSelect = (index: number) => {
    setActiveProjectIndex(index);
    setActiveProjectImageIndex(0);
  };

  return {
    activeProjectIndex,
    activeProjectImageIndex,
    activeProject,
    activeProjectImages,
    activeProjectImage,
    activeProjectMapUrl,
    isProjectScopeOpen,
    projectScopeToRender,
    activeProjectCounter,
    projectSwitcherButtonRefs,
    projectTitleRef,
    handleProjectSelect,
    setActiveProjectImageIndex,
  };
}
