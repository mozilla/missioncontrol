from google.cloud import bigquery


def get_bigquery_client():
    return bigquery.Client()
