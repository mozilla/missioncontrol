FROM python:3.4-slim
ENV PYTHONDONTWRITEBYTECODE 1

EXPOSE 8000

RUN useradd --uid 1000 --no-create-home --home-dir /app webdev

RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential libpq-dev \
      mime-support postgresql-client gettext curl && \
      apt-get autoremove -y && \
      apt-get clean && \
      rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Using PIL or Pillow? You probably want to uncomment next line
# RUN apt-get update && apt-get install -y --no-install-recommends libjpeg8-dev

WORKDIR /app

# Get pip8
COPY bin/pipstrap.py bin/pipstrap.py
RUN ./bin/pipstrap.py

# First copy requirements.txt and peep so we can take advantage of
# docker caching.
COPY requirements.txt /app/requirements.txt
RUN pip install --require-hashes --no-cache-dir -r requirements.txt

COPY . /app
RUN chown webdev:webdev -R .
USER webdev

RUN DEBUG=False SECRET_KEY=foo ALLOWED_HOSTS=localhost, PRESTO_URL=foo DATABASE_URL=sqlite:// ./manage.py collectstatic --noinput -c

# Generate gzipped versions of files that would benefit from compression, that
# WhiteNoise can then serve in preference to the originals. This is required
# since WhiteNoise's Django storage backend only gzips assets handled by
# collectstatic, and so does not affect files in the `dist/` directory.
RUN python -m whitenoise.compress dist

# Using /bin/bash as the entrypoint works around some volume mount issues on Windows
# where volume-mounted files do not have execute bits set.
# https://github.com/docker/compose/issues/2301#issuecomment-154450785 has additional background.
ENTRYPOINT ["/bin/bash", "/app/bin/run"]

CMD ["web"]
