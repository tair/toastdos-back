#!/bin/bash

# docker run --rm --name toast-post -e POSTGRES_PASSWORD=docker -d -p 5432:5432 -v $HOME/docker/volumes/postgres:/var/lib/postgresql/data  postgres

DB_NAME="toastdos_staging"
DB_USER="toastdos"
DB_PASS="vulpes"

DOCKER_IMAGE_NAME="toast-post"

docker exec -i toast-post su postgres -c "psql -c \"CREATE DATABASE $DB_NAME\""
docker exec -i toast-post su postgres -c "createuser $DB_USER"
docker exec -i toast-post su postgres -c "psql -c \"ALTER USER $DB_USER WITH PASSWORD '$DB_PASS' \""
docker exec -i toast-post su postgres -c "psql -c \"ALTER ROLE $DB_USER with CREATEDB\""
docker exec -i toast-post su postgres -c "psql -c \"ALTER DATABASE $DB_NAME OWNER TO $DB_USER\""

echo "DONE"
