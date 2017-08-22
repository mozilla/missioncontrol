% Mission Control
% M. Doglio, W. Lachance
% Mozilla Data Club, 22/08/2017



## Problem

Relman (and others) need to know if a given branch on a given build or day is more “crashy” or less “crashy” than another branch, build, or day. In order to do that, they use the awesome [stability dashboard](https://telemetry.mozilla.org/crashes/)

## Quality <> crashes

 - Application errors:
     - *client profile corrupted*
     - *unresponsive script dialog*
 
 - Performance regressions
     - *GC_MS*
     - *INPUT_EVENT_RESPONSE_MS*

## Re-use crash aggregates?

Crash aggregates is a daily job that runs at midnight UTC.
That means we may need to wait 24 + N hours

## Multiple job runs a day?

We could run it twice a day, or 4 times or 8 times... or every 5 minutes?


## What is Mission Control

The Mission Control project aims at providing Firefox release drivers and other stakeholders with tools to monitor **quality metrics** in the browser in a **soft-real time** fashion and factor that information into their decision making process.


## Spark Structured Streaming

 - Same technology as our daily jobs
 - Same api (kind of) --> no need to change the mental model
 - Checkpointing (recovery from failures)
 - We can use all the libraries included in Spark (and all the Scala/Java ecosystem)

## Data flow

  - Batch Job:     S3 -> Spark -> Parquet (on S3)
  - Streaming Job: Kafka -> Spark -> Parquet (on S3)

## What does the dataset look like?

The dataset has one row per dimension combination and each row has a number measures aggregates
You can reduce the number of dimensions using a sql group by and aggregation functions (sum, avg, etc.)

## What does the dataset look like?

 - [Dimensions](https://github.com/mozilla/telemetry-streaming/blob/f3e6370624a7a014d06d27e9d35aa40a644a4c76/src/main/scala/com/mozilla/telemetry/streaming/ErrorAggregator.scala#L98-L111):
    Usual suspects + (experiment id/branch) + Quantum-ready + profile_age (coming soon)
 - [Measures](https://github.com/mozilla/telemetry-streaming/blob/f3e6370624a7a014d06d27e9d35aa40a644a4c76/src/main/scala/com/mozilla/telemetry/streaming/ErrorAggregator.scala#L71-L125):
    Crashes, errors, counts (eventually with thresholds)
    Coming soon: client counts (HLL, filtered HLL), session counts


## How can I access it?
 - From STMO: the error_aggregates table is available both on Presto and Athena
 - From the http aggregates api: returns aggregates given a number of dimensions, measurements and filters ([example](https://data-missioncontrol.stage.mozaws.net/api/aggregates/?submission_date=2017-08-22&measurements=main_crashes&dimensions=channel&dimensions=os_name&dimensions=submission_date)) (please be gentle)


## Next steps:

 - Clean up the crash retrieval extravaganza
 - Add new measures with no data engineer involved (piggyback probe info service?)
