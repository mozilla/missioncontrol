missioncontrol api services
===========================


Backend service powering the Mission Control dashboard


Instructions for development
----------------------------

0. Make sure you have [docker](https://docker.io) and [docker-compose](https://github.com/docker/compose)
1. docker-compose up
2. make fixtures

The main web service is available at localhost:8000/api/aggregates/ and it accepts
2 query parameters:
 - measurements: list
 - dimensions: list
 Every other query parameter matching one of the dimension names will be considered as an exact filter over that dimension.

 Example query string: [dimensions=os_name&dimensions=os_version&dimensions=country&measurements=main_crashes&country=GB](http://localhost:8000/api/aggregates/?dimensions=os_name&dimensions=os_version&dimensions=country&measurements=main_crashes&country=GB)

Instructions for deployment
---------------------------

The target environment for this project follows the [dockerflow](https://github.com/mozilla-services/Dockerflow) conventions.
In order to run it correctly, a number of environment variables needs to be set up.
The full list of variables can be found in the web section of the docker-compose.yml file.
From a services standpoint, this project requires:
 - a Postgres db to store the application data, defined by DATABASE_URL
 - a Presto/Athena service, defined by PRESTO_URL
 - an optional Redis cache service, defined by CACHE_URL
