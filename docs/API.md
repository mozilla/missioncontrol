# API

## Endpoints

### `GET /api/channel-platform-summary/`

Lists measures available for specified channel/platform combinations

Query parameters:

* `platform` (optional): Limit response to those combinations with
  this specific platform (e.g. `windows`)
* `channel` (optional): Limit response to those combinations with
  this specific channel (e.g. `channel`)

Example output:

```
{
    "summaries": [
        {
            "channel": "release",
            "platform": "windows"
            "measures": [
                {
                    "name": "content_crashes",
                    "lastUpdated": "2018-01-15T18:15:00Z",
                    "latest": {
                        "median": 35.565,
                        "stdev": 7.669,
                        "usageHours": 470699362.23159295,
                        "version": "57.0.4"
                    },
                    "previous": {
                        "median": 24.62,
                        "stdev": 11.579,
                        "usageHours": 1072071172.0898802,
                        "version": null
                    }
                },

            ...
            ]
        },

        ...
    ]
}
```

### `GET /api/measure/`

Gets data specific to a channel/platform/measure combination

Query parameters:

* `channel` (required): Channel for measure (e.g. `release`)
* `platform` (required): Platform for measure (e.g. `windows`)
* `measure` (required): Measure identifier (e.g. `main_crashes`)
* `interval` (required): Interval of data to gather, in seconds
* `start` (optional): Starting point to gather measure data from. If
  not specified, will return `interval` worth of data, counting back
  from the time of the query. This parameter is ignored if `relative`
  is specified (see below)
* `relative` (optional): If true (specified and non-zero), return results
  *from* the time of release of the latest version
* `version` (optional): Retrieve only data particular to a specific version.
  May be specified multiple times.

Returns a dictionary with one element called `measure_data`, a dictionary
whose keys are a set of buildids representing unique version, and whose
values are in turn a dictionary with `data` (a series of date/measure
value/usage hour tuples representing samples) and `version` (the actual
version e.g. `57.0.5`). If relative is false, the `date` part of the data
samples will be the actual date of the sample. If true, it will be the number
of relative seconds since the release was made.

Example output (relative=0):

```
{
    "measure_data": {
        "20171024165158": {
            "data": [
                [
                    "2018-01-15T17:25:00Z",
                    80.0,
                    18878.4066443571
                ],
                [
                    "2018-01-15T17:30:00Z",
                    58.0,
                    18949.5233110985
                ],
                ...
            ],
            "version": "57.0.4"
        },
        ...
    }
}
```

Example output (relative=1):

```
{
    "measure_data": {
        "20171024165158": {
            "data": [
                [
                    0,
                    80.0,
                    18878.4066443571
                ],
                [
                    300,
                    58.0,
                    18949.5233110985
                ],
                ...
            ],
            "version": "57.0.4"
        },
        ...
    }
}
```

### `GET /api/experiment/`

Gets measure data associated with a specific experiment

Query parameters:

* `experiment` (required): Experiment slug to get data for (e.g.
  `pref-flip-activity-stream-58-beta-pocket-personalization-bug-1425490`)
* `measure` (required): Measure identifier (e.g. `main_crashes`)
* `interval` (required): Interval of data to gather, in seconds
* `start` (optional): Starting point to gather measure data from. If
  not specified, will return `interval` worth of data, counting back
  from the time of the query.

The format of the response is much the same as for `measure`, above,
except the keys of the `measure_data` dictionary are different
branches of the same experiment (aggregated across all platforms,
channels, and versions).

Example output:

```
{
    "measure_data": {
        "control": [
            [
                "2018-01-10T11:50:00Z",
                1.0,
                144.65138933179
            ],
            [
                "2018-01-10T11:55:00Z",
                2.0,
                201.722498629009
            ],
            ...
        ],
        "personalized": [
            ...
        ]
    }
}
```