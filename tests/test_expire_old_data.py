import datetime
import pytz

from missioncontrol.base.models import (Build, Datum, Measure)
from missioncontrol.base.tasks import expire_old_data


def test_expire_data(prepopulated_builds, settings):
    build = Build.objects.first()
    measure = Measure.objects.filter(application=build.application,
                                     platform=build.platform).first()

    # old datum, should be expired
    old_datum_timestamp = (datetime.datetime.now() - settings.DATA_EXPIRY_INTERVAL -
                           datetime.timedelta(days=1))
    Datum.objects.create(
        build=build,
        measure=measure,
        timestamp=old_datum_timestamp,
        client_count=1,
        usage_hours=1.0,
        value=0.0)

    # datum within acceptable range, should not be expired
    new_datum_timestamp = (datetime.datetime.now() -
                           settings.DATA_EXPIRY_INTERVAL +
                           datetime.timedelta(hours=1))
    Datum.objects.create(
        build=build,
        measure=measure,
        timestamp=new_datum_timestamp,
        client_count=1,
        usage_hours=1.0,
        value=10.0)

    assert Datum.objects.count() == 2

    expire_old_data()

    assert Datum.objects.count() == 1
    assert list(Datum.objects.values_list('timestamp', 'value')) == [
        (pytz.UTC.localize(new_datum_timestamp), 10.0)
    ]
