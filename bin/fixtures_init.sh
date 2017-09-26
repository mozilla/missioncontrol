#!/bin/sh

docker-compose exec metastore hadoop fs -mkdir -p /user/hive/warehouse
docker cp sample.snappy.parquet "$(docker-compose ps -q metastore)":/tmp/sample.snappy.parquet
docker cp fixtures_init.sql "$(docker-compose ps -q presto)":/tmp/fixtures_init.sql
docker-compose exec presto presto-cli -f /tmp/fixtures_init.sql
docker-compose exec metastore hadoop fs -copyFromLocal /tmp/sample.snappy.parquet /user/hive/warehouse/error_aggregates_v1/sample.snappy.parquet
