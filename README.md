missioncontrol api services
===========================

[![CircleCI](https://img.shields.io/circleci/project/github/mozilla/missioncontrol/master.svg)](https://circleci.com/gh/mozilla/missioncontrol)
[![codecov](https://codecov.io/gh/mozilla/missioncontrol/branch/master/graph/badge.svg)](https://codecov.io/gh/mozilla/missioncontrol)

Backend service powering the Mission Control dashboard

Instructions for development (UI only)
--------------------------------------

If you only want to hack on the UI, you can bring up a version of the UI which
pulls data from the current production server. You only need to have
[yarn](https://yarnpkg.com/) installed.

Run:

```bash
yarn install
yarn start
```

This should start up a webserver at http://localhost:5000 which you can connect to.

Instructions for development (full stack)
-----------------------------------------

Make sure you have [docker](https://docker.io), [docker-compose](https://github.com/docker/compose), and [yarn](https://yarnpkg.com/) installed.

Then run:

```bash
yarn install
cp .env-dist .env
make build
make up
make fixtures
```

The main web service is available at localhost:8000/api/aggregates/ and it accepts
2 query parameters:
 - measurements: list
 - dimensions: list
 Every other query parameter matching one of the dimension names will be considered as a filter over that dimension. The only types of filter supported are an exact match and range comparison. Single-valued query parameters are interpreted as exact matches, while multi-value parameters are interpreted as range comparison. In the example below, `country` is an exact match, while `version` is a range comparison.

 Example query string: [dimensions=os_name&dimensions=os_version&dimensions=country&measurements=main_crashes&country=GB](http://localhost:8000/api/aggregates/?dimensions=os_name&dimensions=os_version&dimensions=country&measurements=main_crashes&country=GB&version=53&version=57)

Instructions for deployment
---------------------------

The target environment for this project follows the [dockerflow](https://github.com/mozilla-services/Dockerflow) conventions.
In order to run it correctly, a number of environment variables need to be set up.
The full list of variables can be found in the web section of the docker-compose.yml file.
From a services standpoint, this project requires:
 - a Postgres DB to store the application data, defined by DATABASE_URL
 - a Presto/Athena service, defined by PRESTO_URL
 - an optional Redis cache service, defined by CACHE_URL
