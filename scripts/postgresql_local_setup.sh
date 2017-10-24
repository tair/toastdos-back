#!/bin/bash
# This script sets up the test environment in a locally installed PostgreSQL server.
# NOTE: You need to install PostgreSQL yourself before running this

if [ "$EUID" -ne 0 ]; then
    echo "Please run with sudo"
    exit
fi

if [[ -z "$NODE_ENV" ]]; then
    env="development"
else
    env="$NODE_ENV"
fi

DB_NAME="toastdos_"$env""
DB_USER="toastdos"
DB_PASS="vulpes"

# We need to use the default PostgreSQL superuser to do this stuff
echo "Creating database '$DB_NAME'"
su postgres -c "psql -c \"CREATE DATABASE $DB_NAME\""

echo "Adding test user '$DB_USER'"
su postgres -c "createuser $DB_USER"
su postgres -c "psql -c \"ALTER USER $DB_USER WITH PASSWORD '$DB_PASS' \"";
su postgres -c "psql -c \"ALTER ROLE $DB_USER with CREATEDB\""
su postgres -c "psql -c \"ALTER DATABASE $DB_NAME OWNER TO $DB_USER\""

# The user needs to manually configure this stuff
echo -e "Automatic portion of setup complete.

\e[1mYou need to manually edit the PostgreSQL file:\e[0m
/etc/postgresql/<version>/main/pg_hba.conf

On this line, change \"peer\" to \"md5\":
local   all             all                                     peer

then run
sudo service postgresql restart

then PostgreSQL should be ready to use\n
NOTE: you will need to change md5 back to peer (or whatever it was before you changed it) if you want to run this script again"
