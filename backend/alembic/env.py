"""Alembic environment for DataLegal.

The connection URL is sourced from ``app.core.config.settings.DATABASE_URL``
so a single env var drives both runtime and migrations. ``target_metadata``
points at the shared ``Base.metadata`` so ``alembic revision --autogenerate``
sees every model.
"""

from __future__ import annotations

from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# Import the settings + model metadata. Importing app.db.init_db has the side
# effect of registering every model class on Base.metadata.
from app.core.config import settings
from app.db import init_db  # noqa: F401 — model side effects
from app.db.base import Base

config = context.config

# Inject the runtime DATABASE_URL into alembic's config so both online and
# offline modes see it. Programmatic callers (tests, CI) can override by
# setting `sqlalchemy.url` on the Config object directly — we only fill it in
# if no explicit value was provided.
if not config.get_main_option("sqlalchemy.url"):
    config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (emit SQL without DB)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode against a live DB."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
