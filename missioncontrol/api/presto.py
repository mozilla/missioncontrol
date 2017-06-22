from django.conf import settings
from django.core.cache import cache
from sqlalchemy.engine import create_engine
from sqlalchemy import select, text, MetaData, Table


DIMENSION_LIST = (
    'submission_date',
    'channel',
    'version',
    'build_id',
    'application',
    'os_name',
    'os_version',
    'architecture',
    'country',
    'experiment_id',
    'experiment_branch',
    'e10s_enabled',
    'e10s_cohort',
    'gfx_compositor',
    'quantum_ready',
)

TABLE_METADATA_KEY = 'missioncontrol_table'


def get_engine():
    return create_engine(settings.PRESTO_URL)


def get_table():
    meta = MetaData(bind=get_engine())
    table = cache.get(TABLE_METADATA_KEY)

    if table is None:
        table = Table(settings.MISSION_CONTROL_TABLE, meta, autoload=True)
        cache.set(TABLE_METADATA_KEY, table, 60 * 60)
    return table


class QueryBuilder(object):

    def __init__(self, measurements, conditions=None, dimensions=None):
        self.measurements = measurements
        self.conditions = conditions
        self.dimensions = dimensions
        self.engine = get_engine()
        self.table = get_table()

    def _build_measurements(self):
        return [text('sum(%s) as %s' % (s, s)) for s in self.measurements]

    def get_query(self):
        measurements = self._build_measurements()

        if not measurements:
            raise Exception("No measurements selected")

        selectable = select(measurements, from_obj=self.table)

        for k, values in self.conditions.items():
            column = getattr(self.table.c, k)
            if len(values) == 1:
                selectable = selectable.where(column == values[0])
            elif len(values) == 2:
                selectable = selectable.where(column >= min(values))
                selectable = selectable.where(column <= max(values))

        # Always select the window dimension
        if 'window' not in self.dimensions and 'submission_date' not in self.dimensions:
            self.dimensions.append('window')
        selectable = selectable.group_by(*self.dimensions)
        for d in self.dimensions:
            selectable = selectable.column(text(d))
        return selectable

    def execute(self):
        conn = self.engine.connect()
        query = self.get_query()
        return conn.execute(query)
