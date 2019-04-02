from django.db import models


class Application(models.Model):
    '''
    Represents a type of application e.g. "firefox", "fennec"
    '''
    name = models.CharField(max_length=100, unique=True)
    telemetry_name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'application'

    def __str__(self):
        return self.name


class Platform(models.Model):
    '''
    Represents a platform e.g. "windows"
    '''
    name = models.CharField(max_length=100, unique=True)
    telemetry_name = models.CharField(max_length=100, unique=True)

    class Meta:
        db_table = 'platform'

    def __str__(self):
        return self.name


class Channel(models.Model):
    '''
    Represents a release channel e.g. "beta", "esr", "nightly"
    '''
    name = models.CharField(max_length=100, unique=True)
    update_interval = models.DurationField()
    min_expected_client_count = models.PositiveIntegerField()

    class Meta:
        db_table = 'channel'

    def __str__(self):
        return self.name


class Experiment(models.Model):
    '''
    Represents an experiment
    '''
    name = models.CharField(max_length=255, unique=True)
    enabled = models.BooleanField()

    class Meta:
        db_table = 'experiment'

    def __str__(self):
        return self.name


class ExperimentBranch(models.Model):
    '''
    Represents a branch of a particular experiment
    '''
    experiment = models.ForeignKey(Experiment, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)

    class Meta:
        db_table = 'experiment_branch'
        unique_together = ('experiment', 'name')

    def __str__(self):
        return ' '.join([self.experiment.name, self.name])


class Build(models.Model):
    '''
    Represents a specific build of the product
    '''
    application = models.ForeignKey(Application, on_delete=models.CASCADE)
    platform = models.ForeignKey(Platform, on_delete=models.CASCADE)
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE)
    build_id = models.CharField(max_length=14)
    version = models.CharField(max_length=20)

    class Meta:
        db_table = 'build'
        unique_together = ('platform', 'channel', 'build_id', 'version')

    def __str__(self):
        return ' '.join([self.platform.name, self.channel.name,
                         self.build_id, self.version])


class Measure(models.Model):
    '''
    Represents a type of measure (e.g. "main_crashes")
    '''
    name = models.SlugField(max_length=100)
    min_version = models.PositiveIntegerField(null=True)
    # may want to add max_version in future (but for now, YAGNI)
    channels = models.ManyToManyField(Channel, related_name='measure_channels')
    application = models.ForeignKey(Application, on_delete=models.CASCADE, null=True)
    platform = models.ForeignKey(Platform, on_delete=models.CASCADE, null=True)
    enabled = models.BooleanField(default=True)

    class Meta:
        db_table = 'measure'
        unique_together = ('name', 'application', 'platform')

    def __str__(self):
        return self.name


class Datum(models.Model):
    '''
    An individual aggregate of data over a 5-minute period
    '''
    id = models.BigAutoField(primary_key=True)
    build = models.ForeignKey(Build, on_delete=models.CASCADE, null=True)
    experiment_branch = models.ForeignKey(ExperimentBranch, null=True,
                                          on_delete=models.CASCADE,
                                          default=None)
    measure = models.ForeignKey(Measure, on_delete=models.CASCADE)
    timestamp = models.DateTimeField()
    value = models.FloatField()
    usage_hours = models.FloatField()
    client_count = models.PositiveIntegerField()

    class Meta:
        db_table = 'datum'
        unique_together = (('build', 'measure', 'timestamp'),
                           ('experiment_branch', 'measure', 'timestamp'))
