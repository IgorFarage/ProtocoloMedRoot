#!/bin/sh

if [ "$DATABASE" = "postgres" ]
then
    echo "Waiting for postgres..."

    while ! nc -z $DB_HOST $DB_PORT; do
      sleep 0.1
    done

    echo "PostgreSQL started"
fi

# Run migrations automatically locally (Optional for Prod, but useful for MVP)
echo "Running Migrations..."
python manage.py migrate

# Collect Static files
echo "Collecting Static Files..."
python manage.py collectstatic --noinput

exec "$@"
