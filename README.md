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
