"""
Django settings for missioncontrol project.

For more information on this file, see
https://docs.djangoproject.com/en/1.9/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.9/ref/settings/
"""

import os
from datetime import timedelta

import dj_database_url
import django_cache_url
from celery.schedules import crontab
from decouple import Csv, config


# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
ROOT = os.path.dirname(os.path.join(BASE_DIR, '..'))

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/1.9/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv())

# this setting allows requests from any host
CORS_ORIGIN_ALLOW_ALL = True

# Application definition

INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',

    'whitenoise.runserver_nostatic',
    'django.contrib.staticfiles',

    'django.contrib.admin',
    'django.contrib.sessions',
    'django.contrib.messages',

    # Project specific apps
    'missioncontrol.base',
    'missioncontrol.etl',

    # Third party apps
    'corsheaders',
    'dockerflow.django',
    'django_celery_monitor',
    'django_celery_results',

]

for app in config('EXTRA_APPS', default='', cast=Csv()):
    INSTALLED_APPS.append(app)


MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'session_csrf.CsrfMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'csp.middleware.CSPMiddleware',
    'dockerflow.django.middleware.DockerflowMiddleware',
]

ROOT_URLCONF = 'missioncontrol.urls'

WSGI_APPLICATION = 'missioncontrol.wsgi.application'


# Database
# https://docs.djangoproject.com/en/1.9/ref/settings/#databases

DATABASES = {
    'default': config(
        'DATABASE_URL',
        cast=dj_database_url.parse
    )
}

CACHES = {'default': django_cache_url.config()}

PRESTO_URL = config('PRESTO_URL')
MISSION_CONTROL_TABLE = config('MISSION_CONTROL_TABLE',
                               default='telemetry.error_aggregates_v2')
PRESTO_EXPERIMENTS_ERROR_AGGREGATES_TABLE = config(
    'PRESTO_EXPERIMENTS_ERROR_AGGREGATES_TABLE',
    default='telemetry.experiment_error_aggregates_v1')

# Internationalization
# https://docs.djangoproject.com/en/1.9/topics/i18n/

LANGUAGE_CODE = config('LANGUAGE_CODE', default='en-us')

TIME_ZONE = config('TIME_ZONE', default='UTC')

USE_I18N = config('USE_I18N', default=True, cast=bool)

USE_L10N = config('USE_L10N', default=True, cast=bool)

USE_TZ = config('USE_TZ', default=True, cast=bool)

# Files in this directory will be served by WhiteNoise at the site root.
WHITENOISE_ROOT = os.path.join(ROOT, 'dist')

# serve index.html as /
WHITENOISE_INDEX_FILE = True

STATIC_ROOT = config('STATIC_ROOT', default=os.path.join(BASE_DIR, 'static'))
STATIC_URL = config('STATIC_URL', '/static/')

# Create hashed+gzipped versions of assets during collectstatic,
# which will then be served by WhiteNoise with a suitable max-age.
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_ROOT = config('MEDIA_ROOT', default=os.path.join(BASE_DIR, 'media'))
MEDIA_URL = config('MEDIA_URL', '/media/')

SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=not DEBUG, cast=bool)

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.contrib.auth.context_processors.auth',
                'django.template.context_processors.debug',
                'django.template.context_processors.i18n',
                'django.template.context_processors.media',
                'django.template.context_processors.static',
                'django.template.context_processors.tz',
                'django.contrib.messages.context_processors.messages',
                'session_csrf.context_processor',
            ],
        }
    },
]

# Django-CSP
CSP_DEFAULT_SRC = (
    "'self'",
)
CSP_FONT_SRC = (
    "'self'",
    'http://*.mozilla.net',
    'https://*.mozilla.net',
    'http://*.mozilla.org',
    'https://*.mozilla.org',
)
CSP_IMG_SRC = (
    "'self'",
    "data:",
    'http://*.mozilla.net',
    'https://*.mozilla.net',
    'http://*.mozilla.org',
    'https://*.mozilla.org',
)
CSP_SCRIPT_SRC = (
    "'self'",
    'http://*.mozilla.org',
    'https://*.mozilla.org',
    'http://*.mozilla.net',
    'https://*.mozilla.net',
)
CSP_STYLE_SRC = (
    "'self'",
    "'unsafe-inline'",
    'http://*.mozilla.org',
    'https://*.mozilla.org',
    'http://*.mozilla.net',
    'https://*.mozilla.net',
)
CSP_REPORT_ONLY = config('CSP_REPORT_ONLY', default=False)

# This is needed to get a CRSF token in /admin
ANON_ALWAYS = True

# A boolean that specifies whether to use the X-Forwarded-Host header in
# preference to the Host header. This should only be enabled if a proxy which
# sets this header is in use.
USE_X_FORWARDED_HOST = config('USE_X_FORWARDED_HOST', default=False, cast=bool)

# When DEBUG is True, allow HTTP traffic, otherwise, never allow HTTP traffic.
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=not DEBUG, cast=bool)
SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default='31536000', cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=False, cast=bool)
SECURE_BROWSER_XSS_FILTER = config('SECURE_BROWSER_XSS_FILTER', default=True, cast=bool)
SECURE_CONTENT_TYPE_NOSNIFF = config('SECURE_CONTENT_TYPE_NOSNIFF', default=True, cast=bool)

# If the web server in front of Django terminates SSL
# 1. Make sure the server strips X-Forwarded-Proto header from all incoming requests.
# 2. Sets X-Forwarded-Proto header only for HTTPS request and sends it to Django.
# 3. Uncomment the following line
# See also https://docs.djangoproject.com/en/1.9/ref/settings/#secure-proxy-ssl-header
# SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

REDIS_URL_DEFAULT = 'redis://redis:6379/1'

CELERY_BROKER_URL = os.environ.get('REDIS_URL', REDIS_URL_DEFAULT)

CELERY_BROKER_TRANSPORT_OPTIONS = {
    # only send messages to actual virtual AMQP host instead of all
    'fanout_prefix': True,
    # have the workers only subscribe to worker related events (less network traffic)
    'fanout_patterns': True,
    # 8 days, since that's longer than our biggest interval to schedule a task (a week)
    # this is needed to be able to use ETAs and countdowns
    # http://docs.celeryproject.org/en/latest/getting-started/brokers/redis.html#id1
    'visibility_timeout': 8 * 24 * 60 * 60,
}
#: Use the django_celery_results database backend.
CELERY_RESULT_BACKEND = 'django-db'
#: Throw away task results after one day, for debugging purposes.
CELERY_RESULT_EXPIRES = timedelta(days=1)
#: Track if a task has been started, not only pending etc.
CELERY_TASK_TRACK_STARTED = True
#: Add a 30 minute soft timeout to all Celery tasks.
CELERY_TASK_SOFT_TIME_LIMIT = 60 * 30
#: And a 35 minute hard timeout.
CELERY_TASK_TIME_LIMIT = 60 * 35
#: Send SENT events as well to know when the task has left the scheduler.
CELERY_TASK_SEND_SENT_EVENT = True
#: Completely disable the rate limiting feature since it's costly
CELERY_WORKER_DISABLE_RATE_LIMITS = True
#: Stop hijacking the root logger so Sentry works.
CELERY_WORKER_HIJACK_ROOT_LOGGER = False
#: The scheduler to use for periodic and scheduled tasks.
CELERY_BEAT_SCHEDULER = 'redbeat.RedBeatScheduler'
#: Maximum time to sleep between re-checking the schedule
CELERY_BEAT_MAX_LOOP_INTERVAL = 5  #: redbeat likes fast loops
#: Unless refreshed the lock will expire after this time
CELERY_REDBEAT_LOCK_TIMEOUT = CELERY_BEAT_MAX_LOOP_INTERVAL * 5
#: The default/initial schedule to use.
CELERY_BEAT_SCHEDULE = {}

FETCH_MEASURE_DATA = config('FETCH_MEASURE_DATA', default=True, cast=bool)
FETCH_EXPERIMENT_DATA = config('FETCH_EXPERIMENT_DATA', default=False, cast=bool)

if FETCH_MEASURE_DATA:
    CELERY_BEAT_SCHEDULE.update({
        'fetch_channel_measure_data': {
            'schedule': crontab(minute='*/5'),  # every 5 minutes
            'task': 'missioncontrol.etl.tasks.update_channel_measures',
            'options': {
                'expires': 5 * 60
            }
        },
        'update_build_data': {
            'schedule': crontab(minute='*/5'),  # every 5 minutes
            'task': 'missioncontrol.etl.tasks.update_build_data',
            'options': {
                'expires': 5 * 60
            }
        },
        'expire_old_data': {
            'schedule': crontab(minute=0, hour=0),  # every day at midnight
            'task': 'missioncontrol.base.tasks.expire_old_data'
        }
    })

if FETCH_EXPERIMENT_DATA:
    CELERY_BEAT_SCHEDULE.update({
        'update_active_experiments': {
            'schedule': crontab(minute='*/5'),  # every 5 minutes
            'task': 'missioncontrol.etl.tasks.update_experiment_list',
            'options': {
                'expires': 5 * 60
            }
        },
        'fetch_experiment_data': {
            'schedule': crontab(minute='*/5'),  # every 5 minutes
            'task': 'missioncontrol.etl.tasks.update_experiment_data',
            'options': {
                'expires': 5 * 60
            }
        }
    })


UPDATE_MEASURES_EXPIRY = 10 * 60

LOGGING_USE_JSON = config('LOGGING_USE_JSON', default=True, cast=bool)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'dockerflow.logging.JsonLogFormatter',
            'logger_name': 'missioncontrol',
        },
        'verbose': {
            'format': '%(levelname)s %(asctime)s %(name)s %(message)s',
        },
        'django.server': {
            '()': 'django.utils.log.ServerFormatter',
            'format': '[%(server_time)s] %(message)s',
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'json' if LOGGING_USE_JSON else 'verbose',
        },
        'django.server': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'django.server',
        },
    },
    'loggers': {
        'root': {
            'level': 'INFO',
            'handlers': ['console'],
        },
        'django.db.backends': {
            'level': 'ERROR',
            'handlers': ['console'],
            'propagate': False,
        },
        'django.server': {
            'handlers': ['django.server'],
            'level': 'INFO',
            'propagate': False,
        },
        'missioncontrol': {
            'level': 'DEBUG',
            'handlers': ['console'],
            'propagate': False,
        },
        'celery.task': {
            'level': 'DEBUG',
            'handlers': ['console'],
            'propagate': False,
        },
        'redbeat.schedulers': {
            'level': 'DEBUG',
            'handlers': ['console'],
            'propagate': False,
        },
        'request.summary': {
            'level': 'DEBUG',
            'handlers': ['console'],
            'propagate': False,
        },
    },
}

BUILDHUB_SERVER = config('BUILDHUB_SERVER', default='buildhub.moz.tools')
BUILDHUB_URL = 'https://{}/api/search'.format(BUILDHUB_SERVER)
FIREFOX_VERSION_URL = 'https://product-details.mozilla.org/1.0/firefox_versions.json'
FIREFOX_VERSION_CACHE_TIMEOUT = 300

FIREFOX_EXPERIMENTS_URL = ('https://normandy.cdn.mozilla.net/api/v1/recipe/'
                           'signed/?enabled=true&' 'latest_revision__action=3')

DATA_EXPIRY_INTERVAL = timedelta(days=200)
MEASURE_SUMMARY_SAMPLING_INTERVAL = timedelta(days=1)
MEASURE_SUMMARY_VERSION_INTERVAL = 3  # maximum number of previous major versions to consider
MEASURE_SUMMARY_CACHE_EXPIRY = 24 * 60 * 60  # keep measure summaries in cache for up to one day
