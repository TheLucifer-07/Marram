# Database

The schema is owned by Flyway. The migration files live with the backend so Spring Boot runs them at startup:

`backend/src/main/resources/db/migration/V1 … V5`

`schema.sql` in this folder is a concatenated export of those migrations for reading or manual setup. Regenerate it after adding a migration:

```bash
cat ../backend/src/main/resources/db/migration/V*.sql > schema.sql
```

Design notes and the ER diagram: [docs/database/database-design.md](../docs/database/database-design.md).

Manual setup (without the app): create the database and user, then run `schema.sql`. Do this only for inspection; running the backend is the supported path, because Flyway also records the schema version.
