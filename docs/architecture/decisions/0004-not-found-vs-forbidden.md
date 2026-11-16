# ADR 0004: 404 for outsiders, 403 for insufficient role

The SRS maps "authenticated but unauthorized" to 403. For a person who is **not in the workspace**, answering 403 confirms that the ID exists. Marram answers **404** for every workspace-scoped resource when the caller has no membership, so IDs cannot be probed. A caller who **is** a member but lacks the role (for example a MEMBER creating a project) gets **403**.

Integration test `scenarioB` walks every read and write route as a stranger and expects 404.
