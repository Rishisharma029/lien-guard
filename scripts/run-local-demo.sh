#!/usr/bin/env bash
set -euo pipefail

if [[ "${NODE_ENV:-development}" == "production" ]]; then
  echo "Refusing to run the local demonstration launcher in production." >&2
  exit 1
fi

if ! command -v mariadbd >/dev/null 2>&1 && ! command -v mysqld >/dev/null 2>&1; then
  echo "Installing the local MariaDB service required for the isolated demonstration database…"
  sudo apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y mariadb-server
fi

sudo service mariadb start >/dev/null 2>&1 || true
for _ in $(seq 1 20); do
  if sudo mysqladmin ping --silent >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! sudo mysqladmin ping --silent >/dev/null 2>&1; then
  echo "The local MariaDB service did not start." >&2
  exit 1
fi

LOCAL_DB_NAME="lienguard_local_demo"
LOCAL_DB_USER="lienguard_demo"
LOCAL_DB_PASSWORD="$(openssl rand -hex 24)"
LOCAL_JWT_SECRET="$(openssl rand -hex 48)"

sudo mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`${LOCAL_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${LOCAL_DB_USER}'@'127.0.0.1' IDENTIFIED BY '${LOCAL_DB_PASSWORD}';
ALTER USER '${LOCAL_DB_USER}'@'127.0.0.1' IDENTIFIED BY '${LOCAL_DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${LOCAL_DB_NAME}\`.* TO '${LOCAL_DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

export NODE_ENV=development
export LOCAL_DEMO_MODE=true
export DATABASE_URL="mysql://${LOCAL_DB_USER}:${LOCAL_DB_PASSWORD}@127.0.0.1:3306/${LOCAL_DB_NAME}"
export JWT_SECRET="${LOCAL_JWT_SECRET}"
export VITE_APP_ID="lienguard-local-demo"
export EMAIL_DELIVERY_MODE=disabled
export MAILEROO_SMTP_USER=""
export MAILEROO_SMTP_PASSWORD=""
export MAILEROO_FROM_EMAIL=""
export MAILEROO_REPLY_TO=""
export MAILEROO_INBOUND_DOMAIN=""
export AUTOMATION_SECRET=""

# Drizzle Kit can return a nonzero exit status on this MariaDB build after it has
# successfully applied the migration journal. Verify the journal explicitly so a
# real partial migration still fails closed while the local demo remains usable.
set +e
pnpm drizzle-kit migrate
migration_status=$?
set -e
migration_count="$(mysql --protocol=tcp -h 127.0.0.1 -P 3306 -u "${LOCAL_DB_USER}" -p"${LOCAL_DB_PASSWORD}" "${LOCAL_DB_NAME}" -Nse 'SELECT COUNT(*) FROM __drizzle_migrations' 2>/dev/null || true)"
if [[ "${migration_count}" != "6" ]]; then
  echo "Local demo schema migration did not complete (journal entries: ${migration_count:-none})." >&2
  exit "${migration_status:-1}"
fi
if [[ "${migration_status}" -ne 0 ]]; then
  echo "Migration journal verified after a MariaDB tooling nonzero exit; continuing with the isolated local demo."
fi
node scripts/seed-local-demo.mjs

echo
echo "Local Lien Guard demonstration is ready. Email delivery is disabled and all records are seeded locally."
exec pnpm dev
