# Resume platform development

- Read `Plan.md` before development. The user has abandoned ReproLab and requested a new resume builder. Old research-platform scope and environment rules no longer apply.
- Confirmed name: ResumeStudio. The user authorized public `xpm03/ResumeStudio` creation and permanent deletion of `xpm03/ReproLab` and its website. Keep actual implementation and verification status in Plan.md.
- Use the Conda environment `resumestudio` for Node, npm and development checks. The old `reprolab` environment was removed. Do not install into Conda base/system Python. Python may be used for font/PDF tooling; the application has no Python backend.
- Initial architecture: React + TypeScript + Vite, browser-local drafts and GitHub Pages. Prove Chinese text PDF export and pagination before expanding the editor. No Python backend is needed for P0.
- Preserve privacy: no real resumes, contact details, API keys, archives, environment directories or installed dependencies in commits. Use fictional test data.
- Keep `.archive/` local and ignored. It contains the old project's recovery material; never add it, including with `git add -f`.
- Research sources are in `docs/reference-research.md`. Study workflows; do not copy code, templates or assets without checking their specific license and attribution requirements.
- Commit meaningful stages and push to the new user-authorized repository once its name is confirmed. Do not push the new project to the former ReproLab remote.
- Use GitHub noreply email `177520738+xpm03@users.noreply.github.com` for commits. Do not expose personal email.
- Update `Plan.md` with actual progress, checks run and remaining issues. Do not mark planned capabilities or unrun tests as complete.
- The user prefers simple GitHub Pages hosting with no cloud server or tunnel. Publish a website URL only after actual deployment and verification.
