FROM debian:jessie
ENV PYTHONDONTWRITEBYTECODE 1

EXPOSE 8000

RUN useradd --uid 1000 --no-create-home --home-dir /app webdev

RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential python3 python3-dev python3-pip \
                                               libpq-dev postgresql-client gettext curl && \
    rm -rf /var/lib/apt/lists/*
RUN update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 10
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3 10


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
RUN DEBUG=False SECRET_KEY=foo ALLOWED_HOSTS=localhost, PRESTO_URL=foo DATABASE_URL=sqlite:// ./manage.py collectstatic --noinput -c
RUN chown webdev:webdev -R .
USER webdev

# Using /bin/bash as the entrypoint works around some volume mount issues on Windows
# where volume-mounted files do not have execute bits set.
# https://github.com/docker/compose/issues/2301#issuecomment-154450785 has additional background.
ENTRYPOINT ["/bin/bash", "/app/bin/run"]

CMD ["web"]
