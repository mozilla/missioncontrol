.PHONY: build migrate shell up fixtures

help:
	@echo "Welcome to the Mission Control Api Service\n"
	@echo "The list of commands for local development:\n"
	@echo "  build      Builds the docker images for the docker-compose setup"
	@echo "  migrate    Runs the Django database migrations"
	@echo "  shell      Opens a Bash shell"
	@echo "  presto-cli Opens a Presto command line client"
	@echo "  up         Runs the whole stack, served under http://localhost:8000/"
	@echo "  fixtures   Generates sample data"

build:
	docker-compose build

migrate:
	docker-compose run web python manage.py migrate --run-syncdb

shell:
	docker-compose run web bash

presto-cli:
	docker-compose exec presto presto-cli

up:
	docker-compose up

fixtures:
	@bin/fixtures_init.sh
