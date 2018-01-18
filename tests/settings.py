from missioncontrol.settings import *

# this makes celery calls synchronous, useful for unit testing
CELERY_ALWAYS_EAGER = True
CELERY_EAGER_PROPAGATES_EXCEPTIONS = True
