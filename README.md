missioncontrol api services
===========================

[![CircleCI](https://img.shields.io/circleci/project/github/mozilla/missioncontrol/master.svg)](https://circleci.com/gh/mozilla/missioncontrol)
[![codecov](https://codecov.io/gh/mozilla/missioncontrol/branch/master/graph/badge.svg)](https://codecov.io/gh/mozilla/missioncontrol)

Backend service powering the Mission Control dashboard


Instructions for development
----------------------------

0. Make sure you have [docker](https://docker.io), [docker-compose](https://github.com/docker/compose), and [yarn](https://yarnpkg.com/)
1. yarn install
2. make build
3. make up
4. make fixtures

The main web service is available at localhost:8000/api/aggregates/ and it accepts
2 query parameters:
 - measurements: list
 - dimensions: list
 Every other query parameter matching one of the dimension names will be considered as a filter over that dimension. The only types of filter supported are exact match and range comparison. Single-valued query parameters are interpreted as  exact matches, while multi-value parameters are interpreted as range comparison. In the example below, `country` is an exact match, while `version` is a range comparison.

 Example query string: [dimensions=os_name&dimensions=os_version&dimensions=country&measurements=main_crashes&country=GB](http://localhost:8000/api/aggregates/?dimensions=os_name&dimensions=os_version&dimensions=country&measurements=main_crashes&country=GB&version=53&version=57)

Instructions for deployment
---------------------------

The target environment for this project follows the [dockerflow](https://github.com/mozilla-services/Dockerflow) conventions.
In order to run it correctly, a number of environment variables needs to be set up.
The full list of variables can be found in the web section of the docker-compose.yml file.
From a services standpoint, this project requires:
 - a Postgres db to store the application data, defined by DATABASE_URL
 - a Presto/Athena service, defined by PRESTO_URL
 - an optional Redis cache service, defined by CACHE_URL
