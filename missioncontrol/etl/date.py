import datetime
from dateutil.tz import tzutc


def datetime_to_utc(dt):
    '''
    adds utc timezone info to a date

    There are a few reasons one might want to do this:
    * so django will serialize a 'Z' to the end of the string (and so
      javascript's date constructor will know it's utc)
    * so python doesn't throw an exception comparing a timezone-aware
      date (in UTC) against an unaware one (in assumed UTC)
    '''
    return datetime.datetime.fromtimestamp(dt.timestamp(),
                                           tz=tzutc())
