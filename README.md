# Histograph

Histograph is a text content exploration tool for digital humanities specialists.

# Running

The easiest way to run the app is to use a Docker Compose file shipped with this project. The file and all required configuration
files are in `docker` directory.

From the `docker` directory run:

```shell
docker-compose up
```

Histograph web app will be accessible on `http://localhost/`. If you are using Histograph for the first time you will be prompted to create an account on `Auth0` using your email and a password. Alternatively you can log in using `Google` or `Twitter` social log-in buttons.

# Ingesting data

Histograph is barely useful without data. Data ingestion is a multi step process. We have provided a sample script that executes all steps of the process using _War and Peace_ book as a toy corpus. The script is well documented and can be used as a starting point for developing a custom ingestion pipeline.

The script is located in `scripts/examples/prepare_war_and_peace_db.sh`. It can be run as follows:

```shell
scripts/examples/prepare_pride_and_prejudice_db.sh ~/tmp_dir
```

Where `tmp_dir` is a temporary directory where the pipeline process stores temporary files and the new Histograph database.

If the script is completed without errors a `tmp_dir/db` directory will be created. The content of this directory can be moved to `docker/data/neo4j` directory to be available for the `docker-compose` set-up. Histograph can then be restarted using the command from the previous section. 

# Architecture

Histograph is made up of several components:

 * a web app
 * an API service the API talks to
 * a set of tools mostly used to ingest data into Histograph.

Histograph uses `Auth0` as an authentication provider.

# Developing Histograph

## Running in development mode

1. Start API on port `8000`

```
npm start
```

2. Start web app on port `8080`

```
cd client && npm start
```

3. Web app will open in the browser.

### Disabling authentication

It is possible to disable authentication during development:

Start API with authentication disabled:

```
NOAUTH=1 npm start
```

Start Web app with authentication disabled:

```
NOAUTH=1 npm start
```
