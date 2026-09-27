## GitHub Issues as Primary Tracker

Always use **GitHub Issues** as the issue tracker for all specifications, tickets, and bug reports.

Rules:
- Never leave specs or tickets exclusively in local scratch files. Always publish them to GitHub Issues using the `gh` CLI.
- All published specs and tickets must have labels `enhancement` and `ready-for-agent`.
- Specs are published as parent issues titled `Spec: <Title>`.
- Vertical slice tickets are published in dependency order and reference their parent spec (`## Parent\n#<id>`) and declare blocking tickets (`## Blocked by\n- #<id>`).
- Always consult existing open issues before drafting work to avoid duplicating tickets.
