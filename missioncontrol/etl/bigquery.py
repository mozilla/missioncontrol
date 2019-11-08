from google.cloud import bigquery
from missioncontrol.settings import GCLOUD_SERVICE_ACCOUNT_CREDS_FILE


def get_bigquery_client():
    return Client.from_service_account_json(creds_file)
