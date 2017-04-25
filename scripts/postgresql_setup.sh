#!/bin/bash
# This script sets up the test environment in a locally installed PostgreSQL server.
# NOTE: You need to install PostgreSQL yourself before running this

DB_NAME="toastdos_staging"
DB_USER="toastdos"
DB_PASS="vulpes"

#if [ "$EUID" -ne 0 ]
#  then echo "Please run with sudo"
#  exit
#fi

# We need to use the default PostgreSQL superuser to do this stuff
#su postgres

echo "Creating database '$DB_NAME'"
psql -c "CREATE DATABASE $DB_NAME"

echo "Adding test user '$DB_USER'"
createuser $DB_USER
psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS'";



# The user needs to manually configure this stuff
echo -e "Automatic portion of setup complete.

\e[1mYou need to manually edit the PostgreSQL file:\e[0m
/etc/postgresql/<version>/main/pg_hba.conf

On this line, change "peer" to "md5":
local   all             all                                     peer

then run
sudo service postgresql restart

then PostgreSQL should be ready to use"
